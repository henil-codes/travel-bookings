import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { trips } from '@/db/schema/trips';
import { vehicles } from '@/db/schema/vehicles';
import { seats } from '@/db/schema/seats';
import { eq } from 'drizzle-orm';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/core/errors';
import { TripService } from '@/modules/trips/trip.service';
import { users } from '@/db/schema/users';
import { PgUpdateBuilder } from 'drizzle-orm/pg-core';

describe('Trips Schema & Integrity', () => {
  let testVehicleId: string;
  let testTripId: string;
  let testManagerId: string;
  let testDriverId: string;

  beforeAll(async () => {
    const [manager] = await db
      .insert(users)
      .values({
        name: 'Trip Test User',
        email: 'trip.test@example.com',
        passwordHash: 'hashedPassword',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '9876543210',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Trip Test Driver',
        email: 'trip.driver@example.com',
        passwordHash: 'hashedPassword',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '9876543210',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'TEST-5678',
        capacity: 50,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;
  }, 10000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      if (testTripId) {
        await tx.delete(seats).where(eq(seats.tripId, testTripId));
        await tx.delete(trips).where(eq(trips.id, testTripId));
      }
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    });
  });

  it('Should insert a valid trip', async () => {
    const trip = await TripService.createTrip(
      {
        name: 'Vancouver to Calgary Express',
        startLocation: 'Vancouver',
        endLocation: 'Calgary',
        departureTime: new Date(Date.now() + 86400000).toISOString(), // 1 day
        arrivalTime: new Date(Date.now() + 936000000).toISOString(), // 1 day + 2 hours
        vehicleId: testVehicleId,
        capacity: 50,
        driverId: testDriverId,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    expect(trip).toBeDefined();
    expect(trip.status).toBe('scheduled');
    expect(trip.name).toBe('Vancouver to Calgary Express');
    expect(trip.startLocation).toBe('Vancouver');
    expect(trip.endLocation).toBe('Calgary');
  });

  it('Should default status to scheduled', async () => {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, testTripId));
    expect(trip.status).toBe('scheduled');
  });

  it('Should reject arrivalTime before departureTime', async () => {
    const badTripData = TripService.createTrip(
      {
        name: 'Bad Trip',
        startLocation: 'City A',
        endLocation: 'City B',
        departureTime: new Date(Date.now() + 10000).toISOString(),
        arrivalTime: new Date(Date.now() + 5000).toISOString(),
        capacity: 30,
        vehicleId: testVehicleId,
        driverId: testDriverId,
      },
      { id: testManagerId, role: 'manager' }
    );

    await expect(badTripData).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('TripService - updateTrip', () => {
  let testVehicleId: string;
  let alVehicleId: string;
  let testTripId: string;
  let testManagerId: string;
  let testDriverId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const [manager] = await db
      .insert(users)
      .values({
        name: 'Update Trip Manager',
        email: 'update.manager@example.com',
        passwordHash: 'hashedPassword',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '6666666661',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Update Trip Driver',
        email: 'update.driver@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '6666666662',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [customer] = await db
      .insert(users)
      .values({
        name: 'Update Trip Customer',
        email: 'update.customer@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '6666666663',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testCustomerId = customer.id;

    const [vehicle1] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'UPD-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle1.id;

    const [alt] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'UPD-002',
        capacity: 30,
        vehicleType: 'bus',
      })
      .returning();
    alVehicleId = alt.id;

    const trip = await TripService.createTrip(
      {
        name: 'Original Trip Name',
        startLocation: 'Kingston',
        endLocation: 'Belleville',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 1044000000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(vehicles).where(eq(vehicles.id, alVehicleId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
      await tx.delete(users).where(eq(users.id, testCustomerId));
    });
  });

  it('should update the trip name successfully', async () => {
    const updated = await TripService.updateTrip(
      testTripId,
      {
        name: 'Updated Trip Name',
      },
      { id: testManagerId, role: 'manager' }
    );

    expect(updated.name).toBe('Updated Trip Name');
  });

  it('should throw UnauthorizedError when a customer tries to update', async () => {
    await expect(
      TripService.updateTrip(
        testTripId,
        { name: 'Hack' },
        {
          id: testCustomerId,
          role: 'customer',
        }
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw ConflictError when arrival is before departure after update', async () => {
    const departure = new Date(Date.now() + 86400000).toISOString();
    const arrival = new Date(Date.now() + 3600000).toISOString();

    await expect(
      TripService.updateTrip(
        testTripId,
        {
          departureTime: departure,
          arrivalTime: arrival,
        },
        { id: testManagerId, role: 'manager' }
      )
    ).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError when updating with a non-existent vehicle', async () => {
    await expect(
      TripService.updateTrip(
        testTripId,
        { vehicleId: '00000000-0000-0000-0000-000000000000' },
        { id: testManagerId, role: 'manager' }
      )
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ConflictError for departed or completed trips', async () => {
    await db
      .update(trips)
      .set({ status: 'departed' })
      .where(eq(trips.id, testTripId));

    await expect(
      TripService.updateTrip(
        testTripId,
        { name: 'Changed' },
        { id: testManagerId, role: 'manager' }
      )
    ).rejects.toThrow(ConflictError);

    // restore
    await db
      .update(trips)
      .set({ status: 'scheduled' })
      .where(eq(trips.id, testTripId));
  });
});

describe('TripService - updateTripStatus', () => {
  let testTripId: string;
  let testManagerId: string;
  let testDriverId: string;
  let otherDriverId: string;
  let testVehicleId: string;

  beforeAll(async () => {
    const [manager] = await db
      .insert(users)
      .values({
        name: 'Status Manager',
        email: 'status.manager@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '7777777771',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Status Driver',
        email: 'status.driver@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '7777777772',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [otherDriver] = await db
      .insert(users)
      .values({
        name: 'Other Driver',
        email: 'other.driver@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '7777777773',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    otherDriverId = otherDriver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'STS-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'Status Test Trip',
        startLocation: 'Barrie',
        endLocation: 'Sudbury',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 1044000000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testDriverId));
      await tx.delete(users).where(eq(users.id, otherDriverId));
    });
  });

  it('should allow manager to transition scheduled -> boarding', async () => {
    const updated = await TripService.updateTripStatus(
      testTripId,
      { status: 'boarding' },
      { id: testManagerId, role: 'manager' }
    );
    expect(updated.status).toBe('boarding');
  });

  it('should throw ConflictError for invalid transition boarding -> completed', async () => {
    await expect(
      TripService.updateTripStatus(
        testTripId,
        {
          status: 'completed',
        },
        { id: testManagerId, role: 'manager' }
      )
    ).rejects.toThrow(ConflictError);
  });

  it('should allow valid transition boarding -> departed', async () => {
    const updated = await TripService.updateTripStatus(
      testTripId,
      { status: 'departed' },
      { id: testManagerId, role: 'manager' }
    );
    expect(updated.status).toBe('departed');
  });

  it('should throw ConflictError for transition out of terminal state completed', async () => {
    await db
      .update(trips)
      .set({ status: 'completed' })
      .where(eq(trips.id, testTripId));

    await expect(
      TripService.updateTripStatus(
        testTripId,
        {
          status: 'boarding',
        },
        { id: testManagerId, role: 'manager' }
      )
    ).rejects.toThrow(ConflictError);
  });

  it('should throw UnauthorizedError when a driver not assigned to the trip tries to upate status', async () => {
    await expect(
      TripService.updateTripStatus(
        testTripId,
        { status: 'departed' },
        { id: otherDriverId, role: 'driver' }
      )
    ).rejects.toThrow(UnauthorizedError);

    // restore
    await db
      .update(trips)
      .set({ status: 'scheduled', driverId: testDriverId })
      .where(eq(trips.id, testTripId));
  });

  it('should allow the assigned driver to update thier trip status', async () => {
    const updated = await TripService.updateTripStatus(
      testTripId,
      {
        status: 'boarding',
      },
      { id: testDriverId, role: 'driver' }
    );
    expect(updated.status).toBe('boarding');
  });
});

describe('TripService - deleteTrip()', () => {
  let testManagerId: string;
  let testAdminId: string;
  let testDriverId: string;
  let testVehicleId: string;

  beforeAll(async () => {
    const [manager] = await db
      .insert(users)
      .values({
        name: 'Delete Manager',
        email: 'delete.manager@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '8888888881',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [admin] = await db
      .insert(users)
      .values({
        name: 'Delete Admin',
        email: 'delete.admin@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '8888888882',
        accountStatus: 'active',
        role: 'admin',
      })
      .returning();
    testAdminId = admin.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Delete Driver',
        email: 'delete.driver@example.com',
        passwordHash: 'hashed',
        countryCode: '+91',
        authProvider: 'local',
        localPhone: '8888888883',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'DEL-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;
  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testManagerId));
      await tx.delete(users).where(eq(users.id, testAdminId));
      await tx.delete(users).where(eq(users.id, testDriverId));
    });
  });

  const createTrip = () =>
    TripService.createTrip(
      {
        name: 'Deletable Trip',
        startLocation: 'London',
        endLocation: 'Windsor',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 1044000000).toISOString(),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
      },
      { id: testManagerId, role: 'manager' }
    );

  const cleanUp = async (tripId: string) => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, tripId));
      await tx.delete(trips).where(eq(trips.id, tripId));
    });
  };

  it('should throw UnauthorizedError when a manger tries to delete', async () => {
    const trip = await createTrip();

    await expect(
      TripService.deleteTrip(trip.id, { id: testManagerId, role: 'manager' })
    ).rejects.toThrow(UnauthorizedError);

    await cleanUp(trip.id);
  });

  it('should throw ConflictError when deleting a departed trip', async () => {
    const trip = await createTrip();
    await db
      .update(trips)
      .set({ status: 'departed' })
      .where(eq(trips.id, trip.id));

    await expect(
      TripService.deleteTrip(trip.id, { id: testAdminId, role: 'admin' })
    ).rejects.toThrow(ConflictError);

    await cleanUp(trip.id);
  });

  it('should delete a trip and its seat as admin', async () => {
    const trip = await createTrip();
    const tripId = trip.id;

    await db.insert(seats).values({
        tripId,
        seatNumber: 1,
        price: 1000,
        status: 'available',
        seatType: 'standard',
    })

    await TripService.deleteTrip(tripId, { id: testAdminId, role: 'admin' });

    const [deletedTrip] = await db.select().from(trips).where(eq(trips.id, tripId));
    expect(deletedTrip).toBeUndefined();

    const tripSeats = await db.select().from(seats).where(eq(seats.tripId, tripId));
    expect(tripSeats).toHaveLength(0);
  })

});
