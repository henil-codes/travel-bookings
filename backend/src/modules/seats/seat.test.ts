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
        basePrice: 5000
      },
      { id: testManagerId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[1].id;
  }, 15000);

  // Clean up database after tests
  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
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

describe('SeatService - unlockSeat()', () => {
  let testTripId: string;
  let testSeatId: string;
  let ownerUserId: string;
  let otherUserId: string;
  let testManagerId: string;
  let testDriverId: string;
  let testVehicleId: string;
  
  beforeAll(async () => {
    const [owner] = await db.insert(users).values({
      name: 'Owner User',
      email: 'unlock.owner@example.com',
      localPhone: '1234567890',
      countryCode: 'IN',
      passwordHash: 'hashedpassword',
      authProvider: 'local',
      accountStatus: 'active',
      role: 'customer',
    }).returning();
    ownerUserId = owner.id;

    const [other] = await db.insert(users).values({
      name: 'Other User',
      email: 'unlock.other@example.com',
      localPhone: '0987654310',
      countryCode: 'IN',
      passwordHash: 'hashedpassword',
      authProvider: 'local',
      accountStatus: 'active',
      role: 'customer',
    }).returning();
    otherUserId = other.id;

    const [manager] = await db.insert(users).values({
      name: 'Test Manager',
      email: 'unlock.manager@example.com',
      localPhone: '0000000001',
      countryCode: 'IN',
      passwordHash: 'hashedpassword',
      authProvider: 'local',
      accountStatus: 'active',
      role: 'manager',
    }).returning();
    testManagerId = manager.id;

    const [driver] = await db.insert(users).values({
      name: 'Test Driver',
      email: 'unlock.driver@example.com',
      localPhone: '0000000002',
      countryCode: 'IN',
      passwordHash: 'hashedpassword',
      authProvider: 'local',
      accountStatus: 'active',
      role: 'driver',
    }).returning();
    testDriverId = driver.id;

    const [vehicle] = await db.insert(vehicles).values({
      vehicleNumber: 'TEST-5678',
      capacity: 40,
      vehicleType: 'bus',
    }).returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip({
      name: 'Unlock Test Trip',
      startLocation: 'Halifax',
      endLocation: 'Moncton',
      departureTime: new Date(Date.now() + 86400000).toISOString(),
      arrivalTime: new Date(Date.now() + 104400000).toISOString(),
      vehicleId: testVehicleId,
      capacity: 40,
      driverId: testDriverId,
      basePrice: 5000,
    }, { id: testManagerId, role: 'manager'});
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[2].id;

  }, 15000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.email, 'unlock.owner@example.com'));
      await tx.delete(users).where(eq(users.email, 'unlock.other@example.com'));
      await tx.delete(users).where(eq(users.email, 'unlock.manager@example.com'));
      await tx.delete(users).where(eq(users.email, 'unlock.driver@example.com'));
    })
  })

  const setSeatLocked = (lockedBy: string) => db.update(seats).set({
    status: 'locked',
    lockedByUserId: lockedBy,
    lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    version: 1,
  }).where(eq(seats.id, testSeatId));

  const setSeatAvailable = () => db.update(seats).set({
    status: 'available',
    lockedByUserId: null,
    lockedUntil: null,
    version: 0,
  }).where(eq(seats.id, testSeatId));

  it('Should unlock a seat locked by the same user and reset to available', async () => {
    await setSeatLocked(ownerUserId);

    const result = await SeatService.unlockSeat(testSeatId, ownerUserId);

    expect(result.status).toBe('available');
    expect(result.lockedByUserId).toBeNull();
    expect(result.lockedUntil).toBeNull();
  })

  it('Should increament version on successful unlock', async () => {
    await setSeatLocked(ownerUserId);
    const[before] = await db.select().from(seats).where(eq(seats.id, testSeatId));

    await SeatService.unlockSeat(testSeatId, ownerUserId);

    const [after] = await db.select().from(seats).where(eq(seats.id, testSeatId));
    expect(after.version).toBe(before.version + 1);
  })

  it('Should throw ConflictError when another user tries to unlock the seat', async () => {
    await setSeatLocked(ownerUserId);

    await expect(SeatService.unlockSeat(testSeatId, otherUserId)).rejects.toThrow(ConflictError);
    
    const [dbSeat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
    expect(dbSeat.status).toBe('locked');
  })

  it('Should throw ConflictError when seat is not locked', async () => {
    await setSeatAvailable();

    await expect(SeatService.unlockSeat(testSeatId, ownerUserId)).rejects.toThrow(ConflictError);
  })

  it('Should throw NotFoundError for a non-existent seat ID', async () => {
    await expect(SeatService.unlockSeat('00000000-0000-0000-0000-000000000000', ownerUserId)).rejects.toThrow(NotFoundError); 
  })


})
