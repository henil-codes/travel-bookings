import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../db';
import { users } from '@/db/schema';
import { vehicles } from '@/db/schema';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { SeatService } from './seat.service';
import { ConflictError, NotFoundError } from '@/core/errors';
import { eq } from 'drizzle-orm';

describe('Seat Locking Race Condition', () => {
    let testTripId: string;
    let testSeatId: string;
    let testUserId: string;
    let testVehicleId: string;

    // Seed database before tests
    beforeAll(async () => {
        const [user] = await db.insert(users).values({
            name: 'Test User',
            email: 'seattest@example.com',
            local_phone: '1234567890',
            countryCode: 'IN',
            passwordHash: 'hashedpassword',
        }).returning();
        testUserId = user.id;

        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Test Operator',
            vehicleType: 'bus',
            vehicleNumber: 'TEST-1234',
            capacity: 40,
        }).returning();
        testVehicleId = vehicle.id;

        const [trip] = await db.insert(trips).values({
            name: 'Toronto to Montreal Express',
            vehicleId: testVehicleId,
            startLocation: 'Toronto',
            endLocation: 'Montreal',
            departureTime: new Date(Date.now() + 86400000), // 1 day
            arrivalTime: new Date(Date.now() + 104400000), // 1 day + 5 hours 
            capacity: 40,
        }).returning();
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatType: 'standard',
            seatNumber: 12,
            price: '45.00',
            status: 'available',
            lockedByUserId: testUserId,
        }).returning();
        testSeatId = seat.id;
    })

    // Clean up database after tests
    afterAll(async () => {
        await db.delete(vehicles).where(eq(vehicles.id, testVehicleId));
        await db.delete(users).where(eq(users.id, testUserId));
        await db.delete(seats).where(eq(seats.id, testSeatId));
        await db.delete(trips).where(eq(trips.id, testTripId));
    })

    it('should only allow one user to lock a seat concurrently', async () => {
        const concurrentRequests = Array.from({ length: 10 }).map((_, index) => {
            return SeatService.lockSeat(testSeatId, `user-${index}`);
        })

        const results = await Promise.allSettled(concurrentRequests);

        const successfulLocks = results.filter(r => r.status === 'fulfilled');
        const failedLocks = results.filter(r => r.status === 'rejected');

        if(failedLocks.length > 0) {
            console.log('Rejection Reasons:', (failedLocks[0] as PromiseRejectedResult).reason);
        }

        expect(successfulLocks.length).toBe(1);
        expect(failedLocks.length).toBe(9);

        const [lockedSeat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
        expect(lockedSeat.status).toBe('locked');
        expect(lockedSeat.version).toBe(1);
        expect(lockedSeat.lockedUntil).not.toBeNull();
    })
})

