import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { bookings } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { passengers } from '@/db/schema/passengers';
import { eq } from 'drizzle-orm';
import { TripService } from '@/modules/trips/trip.service';
import { ConflictError } from '@/core/errors';
import { BookingService } from './booking.service';
import { SeatService } from '@/modules/seats/seat.service';
import { NotFoundError } from '@/core/errors';
import { resolveObjectURL } from 'node:buffer';

describe('Bookings Schema & Integrity', () => {
  let testUserId: string;
  let testDriverId: string;
  let testManagerId: string;
  let passengerId: string;
  let testVehicleId: string;
  let testTripId: string;
  let testSeatId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Booking Test User',
        email: 'booking@test.com',
        localPhone: '1234567890',
        countryCode: 'IN',
        passwordHash: 'hashedPassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUserId = user.id;

    const [manager] = await db
      .insert(users)
      .values({
        name: 'Booking Test Manager',
        email: 'booking.manager@test.com',
        localPhone: '1234567891',
        countryCode: 'IN',
        passwordHash: 'hashedPassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Booking Test Driver',
        email: 'booking.driver@test.com',
        localPhone: '1234567892',
        countryCode: 'IN',
        passwordHash: 'hashedPassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [passenger] = await db
      .insert(passengers)
      .values({
        name: 'Booking Test Passenger',
        age: 30,
        gender: 'male',
        idType: 'passport',
        idNumber: 'X1234567',
      })
      .returning();
    passengerId = passenger.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'BOOKING-TEST-1234',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'Booking Test Trip',
        startLocation: 'Vancouver',
        endLocation: 'Toronto',
        departureTime: new Date(Date.now() + 86400000).toISOString(), // 1 day
        arrivalTime: new Date(Date.now() + 172800000).toISOString(), // 2 days
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
        basePrice: 8000,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[0].id;

    await SeatService.lockSeat(testSeatId, testUserId); // Lock for 10 minutes
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(bookings).where(eq(bookings.id, testBookingId));
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(passengers).where(eq(passengers.id, passengerId));
      await tx.delete(users).where(eq(users.id, testUserId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    });
  });

  it('Should create a pending booking with correct fields', async () => {
    const [booking] = await db
      .insert(bookings)
      .values({
        tripId: testTripId,
        seatId: testSeatId,
        passengerId: passengerId,
        bookedBy: testUserId,
        status: 'pending',
        totalAmount: 8000,
        currency: 'INR',
      })
      .returning();
    testBookingId = booking.id;

    expect(booking).toBeDefined();
    expect(booking.status).toBe('pending');
    expect(booking.totalAmount).toBe(8000);
    expect(booking.currency).toBe('INR');
  });

  // TODO: Add test to verify that cancelling a booking does not automatically mark it as refunded, and that refunding can be done independently with its own timestamp. This is important for accurate financial reporting and to handle cases where a booking is cancelled but not refunded immediately (e.g., due to refund processing times or policies).

  // it('Should store a refunded status independently of cancellation', async () => {
  //     const [updated] = await db.update(bookings).set({
  //         status: 'refunded',
  //         cancelledAt: new Date(),
  //     })
  //         .where(eq(bookings.id, testBookingId))
  //         .returning();

  //     expect(updated.status).toBe('refunded');
  //     expect(updated.cancelledAt).not.toBeNull();
  // })

  it('Should attach passengers to a booking', async () => {
    const [passenger] = await db
      .insert(passengers)
      .values({
        name: 'John Doe',
        age: 30,
        gender: 'male',
        idType: 'passport',
        idNumber: 'X1234567',
      })
      .returning();

    expect(passenger.name).toBe('John Doe');
    expect(passenger.idType).toBe('passport');

    await db.delete(passengers).where(eq(passengers.id, passenger.id));
  });

  it('Should prevent duplicate active bookings for the same seat', async () => {
    const [passenger] = await db
      .select()
      .from(passengers)
      .where(eq(passengers.id, passengerId));
    await expect(
      BookingService.createBooking(
        {
          tripId: testTripId,
          seatId: testSeatId,
          passenger: passenger,
        },
        testUserId
      )
    ).rejects.toThrow(ConflictError);
  });
});

describe('BookingService - getBookingById()', () => {
  let testBookingId: string;
  let testUserId: string;
  let testManagerId: string;
  let testDriverId: string;
  let testVehicleId: string;
  let testTripId: string;
  let testSeatId: string;
  let testPassengerId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'GetById User',
        email: 'getbyid.user@test.com',
        localPhone: '9999999991',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUserId = user.id;

    const [manager] = await db
      .insert(users)
      .values({
        name: 'GetById Manager',
        email: 'getbyid.manager@test.com',
        localPhone: '9999999992',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'GetById Driver',
        email: 'getbyid.driver@test.com',
        localPhone: '9999999993',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'BGI-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'GetById Trip',
        startLocation: 'Oshawa',
        endLocation: 'Montreal',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 172800000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
        basePrice: 6000,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[0].id;

    await SeatService.lockSeat(testSeatId, testUserId); // Lock for 10 minutes

    const [passenger] = await db
      .insert(passengers)
      .values({
        name: 'GetById passenger',
        age: 25,
        gender: 'male',
        idType: 'passport',
        idNumber: 'GBI123456',
      })
      .returning();
    testPassengerId = passenger.id;

    const { booking } = await BookingService.createBooking(
      {
        tripId: testTripId,
        seatId: testSeatId,
        passenger
      },
      testUserId
    );
    testBookingId = booking.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(bookings).where(eq(bookings.id, testBookingId));
      await tx.delete(passengers).where(eq(passengers.idNumber, 'GBI123456'));
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testUserId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    });
  });

  it('should return the booking for a valid ID', async () => {
    const booking = await BookingService.getBookingById(testBookingId);
    expect(booking.id).toBe(testBookingId);
    expect(booking.status).toBe('pending');
    expect(booking.bookedBy).toBe(testUserId);
  });

  it('should throw NotFoundError for a non-existent booking ID', async () => {
    await expect(
      BookingService.getBookingById('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError);
  });
});

describe('BookingService - cancelBooking()', () => {
  let testBookingId: string;
  let testSeatId: string;
  let testUserId: string;
  let testManagerId: string;
  let testDriverId: string;
  let testVehicleId: string;
  let testTripId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Cancel User',
        email: 'cancel.user@test.com',
        localPhone: '8888888881',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUserId = user.id;

    const [manager] = await db
      .insert(users)
      .values({
        name: 'Cancel Manager',
        email: 'cancel.manager@test.com',
        localPhone: '8888888882',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Cancel Driver',
        email: 'cancel.driver@test.com',
        localPhone: '8888888883',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'CANCEL-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'Cancel Trip',
        startLocation: 'Ajax',
        endLocation: 'Ottawa',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 172800000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
        basePrice: 6000,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[0].id;

    await SeatService.lockSeat(testSeatId, testUserId); // Lock for 10 minutes

    const { booking } = await BookingService.createBooking(
      {
        tripId: testTripId,
        seatId: testSeatId,
        passenger: {
          name: 'Cancel Passenger',
          age: 30,
          gender: 'female',
          idType: 'passport',
          idNumber: 'CANCEL123',
          isAccessibilityRequired: false,
        },
      },
      testUserId
    );
    testBookingId = booking.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(bookings).where(eq(bookings.id, testBookingId));
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(passengers).where(eq(passengers.idNumber, 'CANCEL123'));
      await tx.delete(users).where(eq(users.id, testUserId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    });
  });

  it('should cancel a pending booking and release the seat', async () => {
    const updated = await BookingService.cancelBooking(
      { cancellationReason: 'Change of plans' },
      testBookingId
    );

    expect(updated.status).toBe('cancelled');
    expect(updated.cancellationReason).toBe('Change of plans');
    expect(updated.cancelledAt).not.toBeNull();

    const [seat] = await db
      .select()
      .from(seats)
      .where(eq(seats.id, testSeatId));
    expect(seat.status).toBe('available');
    expect(seat.lockedByUserId).toBeNull();
  });

  it('should throw ConflictError when cancelling an already cancelled booking', async () => {
    await expect(
      BookingService.cancelBooking(
        { cancellationReason: 'Again' },
        testBookingId
      )
    ).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError for a non-existent bookingId', async () => {
    await expect(
      BookingService.cancelBooking(
        { cancellationReason: 'test' },
        '00000000-0000-0000-0000-000000000000'
      )
    ).rejects.toThrow(NotFoundError);
  });
});

describe('BookingService - listBookings()', () => {
  let testUserId: string;
  let otherUserId: string;
  let testManagerId: string;
  let testDriverId: string;
  let testVehicleId: string;
  let testTripId: string;
  let createBookingIds: string[] = [];

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'List User',
        email: 'list.user@test.com',
        localPhone: '7777777771',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUserId = user.id;

    const [otherUser] = await db
      .insert(users)
      .values({
        name: 'List Other User',
        email: 'list.other@test.com',
        localPhone: '7777777772',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    otherUserId = otherUser.id;

    const [manager] = await db
      .insert(users)
      .values({
        name: 'List Manager',
        email: 'list.manager@test.com',
        localPhone: '8888888882',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'List Driver',
        email: 'list.driver@test.com',
        localPhone: '8888888883',
        countryCode: '+91',
        passwordHash: 'hashed',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'LIST-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'Cancel Trip',
        startLocation: 'Ajax',
        endLocation: 'Ottawa',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 172800000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
        basePrice: 6000,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);

    // create two seats and two bookings owned by testUser
    for (let i = 0; i < 2; i++) {
      const seat = seatMap.available[i+10];
      await SeatService.lockSeat(seat.id, testUserId); // Lock for 10 minutes

      const { booking } = await BookingService.createBooking(
        {
          tripId: testTripId,
          seatId: seat.id,
          passenger: {
            name: `passenger ${i}`,
            age: 20 + i,
            gender: 'male',
            idType: 'passport',
            idNumber: `LIST123{i}`,
            isAccessibilityRequired: false,
          },
        },
        testUserId
      );
      createBookingIds.push(booking.id);
    }

    const otherSeat = seatMap.available[20];
    await SeatService.lockSeat(otherSeat.id, otherUserId); // Lock for 10 minutes

    const { booking: otherBooking } = await BookingService.createBooking({
      tripId: testTripId,
      seatId: otherSeat.id,
      passenger: {
        name: 'Other Passenger',
        age: 35,
        gender: 'female',
        idType: 'passport',
        idNumber: 'LSTOTHER1',
        isAccessibilityRequired: false,
      }
    }, otherUserId);
    createBookingIds.push(otherBooking.id);
  }, 20000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      for(const id of createBookingIds) {
        const [booking] = await tx.select().from(bookings).where(eq(bookings.id, id));
        if(booking) {
          await tx.delete(bookings).where(eq(bookings.id, id));
        }
        await tx.delete(passengers).where(eq(passengers.id, booking.passengerId))
      }
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testUserId));
      await tx.delete(users).where(eq(users.id, otherUserId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    })
  })

  it('should filter bookings by userId', async () => {
    const result = await BookingService.listBookings({ userId: testUserId, page: 1, limit: 10 });
    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach(b => expect(b.bookedBy).toBe(testUserId));
  })

  it('should filter bookings by status', async () => {
    const result = await BookingService.listBookings({ status: 'pending', page: 1, limit: 50 });
    result.forEach(b => expect(b.status).toBe('pending'));
  })

  it('should respect pagination limit', async () => {
    const result = await BookingService.listBookings({ userId: testUserId, page: 1, limit: 1 })
    expect(result.length).toBeLessThanOrEqual(1);
  })

  it('should return empty array for page beyond toatl results', async () => {
    const result = await BookingService.listBookings({ userId: testUserId, page: 999, limit: 10 })
    expect(result.length).toBe(0)
  })

});
