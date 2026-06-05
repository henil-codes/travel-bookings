import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db'
import { trips } from '@/db/schema/trips'
import { vehicles } from '@/db/schema/vehicles'
import { seats } from '@/db/schema/seats'
import { eq } from 'drizzle-orm'
import { ConflictError } from '@/core/errors'
import { TripService } from '@/modules/trips/trip.service'
import { users } from '@/db/schema/users';

describe('Trips Schema & Integrity', () => {
    let testVehicleId: string;
    let testTripId: string;
    let testUserId: string;

    beforeAll(async () => {
        const [user] = await db.insert(users).values({
            name: 'Trip Test User',
            email: 'trip.test@example.com',
            passwordHash: 'hashedPassword',
            countryCode: '+91',
            authProvider: 'local',
            local_phone: '9876543210',
        }).returning();
        testUserId = user.id;

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
            await tx.delete(users).where(eq(users.id, testUserId));
        })
    })

    it('Should insert a valid trip', async () => {
        const trip = await TripService.createTrip({
            name: 'Vancouver to Calgary Express',
            startLocation: 'Vancouver',
            endLocation: 'Calgary',
            departureTime: new Date(Date.now() + 86400000).toISOString(), // 1 day
            arrivalTime: new Date(Date.now() + 936000000).toISOString(), // 1 day + 2 hours
            vehicleId: testVehicleId,
            capacity: 50,
            status: 'scheduled',
        }, { id: testUserId, role: 'operator'})
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
            departureTime: new Date(Date.now() + 10000).toISOString(),
            arrivalTime: new Date(Date.now() + 5000).toISOString(),
            status: 'scheduled',
            capacity: 30,
            vehicleId: testVehicleId,
        }, { id: testUserId, role: 'operator' })

        await expect(badTripData).rejects.toBeInstanceOf(ConflictError);
    })
})


