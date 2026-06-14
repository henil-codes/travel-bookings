import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { SeatService } from './seat.service';
import { ConflictError, NotFoundError } from '@/core/errors';
import { eq } from 'drizzle-orm';
import { TripService } from '@/modules/trips/trip.service';

describe('SeatService - lockSeat()', () => {
  let testTripId: string;
  let testSeatId: string;
  let testUserId: string;
  let testUser2Id: string;
  let testDriverId: string;
  let testManagerId: string;
  let testVehicleId: string;

  // Seed database before tests
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Test User',
        email: 'seattest@example.com',
        localPhone: '1234567890',
        countryCode: 'IN',
        passwordHash: 'hashedpassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUserId = user.id;

    const [user2] = await db
      .insert(users)
      .values({
        name: 'Test User 2',
        email: 'seattest2@example.com',
        localPhone: '0987654321',
        countryCode: 'IN',
        passwordHash: 'hashedPassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'customer',
      })
      .returning();
    testUser2Id = user2.id;


    const [manager] = await db
      .insert(users)
      .values({
        name: 'Test Manager',
        email: 'manager@example.com',
        localPhone: '1234567890',
        countryCode: 'IN',
        passwordHash: 'hashedpassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'manager',
      })
      .returning();
    testManagerId = manager.id;

    const [driver] = await db
      .insert(users)
      .values({
        name: 'Test Driver',
        email: 'driver@example.com',
        localPhone: '1234567890',
        countryCode: 'IN',
        passwordHash: 'hashedpassword',
        authProvider: 'local',
        accountStatus: 'active',
        role: 'driver',
      })
      .returning();
    testDriverId = driver.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'TEST-1234',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'Toronto to Montreal Express',
        startLocation: 'Toronto',
        endLocation: 'Montreal',
        departureTime: new Date(Date.now() + 86400000).toISOString(), // 1 day
        arrivalTime: new Date(Date.now() + 104400000).toISOString(), // 1 day + 5 hours
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
        seatNumber: 12,
        price: 4500,
        status: 'available',
        seatType: 'standard',
        lockedByUserId: testUserId,
      })
      .returning();
    testSeatId = seat.id;
  }, 15000);

  // Clean up database after tests
  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.id, testSeatId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.email, 'seattest@example.com'));
      await tx.delete(users).where(eq(users.email, 'seattest2@example.com'));
      await tx.delete(users).where(eq(users.email, 'driver@example.com'));
      await tx.delete(users).where(eq(users.email, 'manager@example.com'));
    });
  });

  // Helper to reset seat state between tests
  const resetSeat = (overrides = {}) =>
    db
      .update(seats)
      .set({
        status: 'available',
        lockedUntil: null,
        lockedByUserId: null,
        version: 0,
        ...overrides,
      })
      .where(eq(seats.id, testSeatId));

  // --- Race condition test ---
  it('Should allow only one user out of 10 concurrent requests', async () => {
    await resetSeat();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }).map((_, index) =>
        SeatService.lockSeat(testSeatId, testUserId)
      )
    );

    const successfulLocks = results.filter((r) => r.status === 'fulfilled');
    const failedLocks = results.filter((r) => r.status === 'rejected');

    expect(successfulLocks.length).toBe(1);
    expect(failedLocks.length).toBe(9);

    // all failures must be known ConflictErrors, not crashes
    for (const failure of failedLocks) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(
        ConflictError
      );
    }

    const [lockedSeat] = await db
      .select()
      .from(seats)
      .where(eq(seats.id, testSeatId));
    expect(lockedSeat.status).toBe('locked');
    expect(lockedSeat.version).toBe(1);
    expect(lockedSeat.lockedUntil).not.toBeNull();
  });

  // --- Expired lock test ---
  it('Should allow a new user to lock a seat whose lock has expired', async () => {
    await resetSeat({
      status: 'locked',
      lockedByUserId: testUserId,
      lockedUntil: new Date(Date.now() - 1000), // expired 1 minute ago
      version: 1,
    });

    const result = await SeatService.lockSeat(testSeatId, testUser2Id);

    expect(result.status).toBe('locked');
    expect(result.lockedByUserId).toBe(testUser2Id);
    expect(result.version).toBe(2);
  });

  // --- Not found test ---
  it('Should throw NotFoundError for a non-existent seat ID', async () => {
    const nonExistentSeatId = '00000000-0000-0000-0000-000000000000';

    const result = SeatService.lockSeat(nonExistentSeatId, testUserId);

    await expect(result).rejects.toThrow(NotFoundError);
  });

  // --- Conflict test ---
  it('Should throw ConflictError when seat is already locked and not expired', async () => {
    await resetSeat({
      status: 'locked',
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // expires in 10 minutes
      lockedByUserId: testUserId,
      version: 1,
    });

    const result = SeatService.lockSeat(testSeatId, testUser2Id);

    await expect(result).rejects.toThrow(ConflictError);
  });

  it('Should throw ConflictError when seat is sold', async () => {
    await resetSeat({
      status: 'sold',
    });

    const result = SeatService.lockSeat(testSeatId, testUser2Id);

    await expect(result).rejects.toThrow(ConflictError);
  });

  it('Should throw ConflictError when seat is reserved', async () => {
    await resetSeat({
      status: 'reserved',
    });

    const result = SeatService.lockSeat(testSeatId, testUser2Id);

    await expect(result).rejects.toThrow(ConflictError);
  });
});
