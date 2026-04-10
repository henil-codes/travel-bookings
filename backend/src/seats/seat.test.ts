import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db';
import { trips, seats } from '../db/schema/seats';
import { SeatService } from './seat.service';
import { eq } from 'drizzle-orm';

describe('Seat Locking Race Condition', () => {
    let testTripId: string;
    let testSeatId: string;

    // Seed database before tests
    beforeAll(async () => {
        const [trip] = await db.insert(trips).values({
            name: 'Toronto to Montreal Express',
            startLocation: 'Toronto',
            endLocation: 'Montreal',
            departureTime: new Date(Date.now() + 86400000), // 1 day
            arrivalTime: new Date(Date.now() + 104400000), // 1 day + 5 hours 
            price: '45.00',
            capacity: 40,
        }).returning();
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 12,
            price: '45.00',
            status: 'available',
        }).returning();
        testSeatId = seat.id;
    })

    // Clean up database after tests
    afterAll(async () => {
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

