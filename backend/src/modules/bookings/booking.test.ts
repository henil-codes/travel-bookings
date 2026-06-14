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
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const [seat] = await db
      .insert(seats)
      .values({
        tripId: testTripId,
        seatNumber: 5,
        price: 8000,
        status: 'locked',
        seatType: 'standard',
        lockedByUserId: testUserId,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })
      .returning();
    testSeatId = seat.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(bookings).where(eq(bookings.id, testBookingId));
      await tx.delete(seats).where(eq(seats.id, testSeatId));
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
