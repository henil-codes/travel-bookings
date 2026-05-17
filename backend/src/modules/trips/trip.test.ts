import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db'
import { trips } from '@/db/schema/trips'
import { vehicles } from '@/db/schema/vehicles'
import { seats } from '@/db/schema/seats'
import { eq } from 'drizzle-orm'
import { ConflictError } from '@/core/errors'
import { TripService } from '@/modules/trips/trip.service'

describe('Trips Schema & Integrity', () => {
    let testVehicleId: string;
    let testTripId: string;

    beforeAll(async () => {
        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Test Operator',
            vehicleNumber: 'TEST-5678',
            capacity: 50,
            vehicleType: 'bus',
        }).returning();
        testVehicleId = vehicle.id;
    }, 10000)

    afterAll(async () => {
        await db.transaction(async (tx) => {
            if (testTripId) {
                await tx.delete(seats).where(eq(seats.tripId, testTripId));
                await tx.delete(trips).where(eq(trips.id, testTripId));
            }
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
        })
    })

    it('Should insert a valid trip', async () => {
        const [trip] = await db.insert(trips).values({
            name: 'Vancouver to Calgary Express',
            startLocation: 'Vancouver',
            endLocation: 'Calgary',
            departureTime: new Date(Date.now() + 86400000), // 1 day
            arrivalTime: new Date(Date.now() + 936000000), // 1 day + 2 hours
            vehicleId: testVehicleId,
            capacity: 50,
        }).returning();
        testTripId = trip.id;

        expect(trip).toBeDefined();
        expect(trip.status).toBe('scheduled');
        expect(trip.name).toBe('Vancouver to Calgary Express');
        expect(trip.startLocation).toBe('Vancouver');
        expect(trip.endLocation).toBe('Calgary');
    });

    it('Should default status to scheduled', async () => {
        const [trip] = await db.select().from(trips).where(eq(trips.id, testTripId));
        expect(trip.status).toBe('scheduled');
    })

    it('Should reject arrivalTime before departureTime', async () => {
        const badTripData = TripService.createTrip({
            name: 'Bad Trip',
            startLocation: 'City A',
            endLocation: 'City B',
            departureTime: new Date(Date.now() + 10000),
            arrivalTime: new Date(Date.now() + 5000),
            capacity: 30,
            vehicleId: testVehicleId,
        })

        await expect(badTripData).rejects.toBeInstanceOf(ConflictError);
    })
})