import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/app';
import { db } from '@/db';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { eq } from 'drizzle-orm';
import { TripService } from '@/modules/trips/trip.service';
import DataHandler from 'ioredis/built/DataHandler';

describe('Seat Routes Integration', () => {
    let app: FastifyInstance;
    let serverUrl: string;
    let testTripId: string;
    let testSeatId: string;
    let testUserId: string;
    let otherUserId: string;
    let testManagerId: string;
    let testDriverId: string;
    let testVehicleId: string;
    let userToken: string;
    let otherToken: string;

    beforeAll(async () => {
        app = buildApp();
        await app.listen({ port: 0, host: '127.0.0.1' });
        const address = app.server.address();
        if (typeof address === 'string' || !address) throw new Error('No address');
        serverUrl = `http://127.0.0.1:${address.port}`;

        const [user] = await db.insert(users).values({
            name: 'Seat Route User',
            email: 'seatroute.user@test.com',
            localPhone: '5555555551',
            countryCode: '+91',
            passwordHash: 'hashedpassword',
            authProvider: 'local',
            accountStatus: 'active',
            role: 'customer',
        }).returning();
        testUserId = user.id;

        const [other] = await db.insert(users).values({
            name: 'Seat Route Other',
            email: 'seatroute.other@test.com',
            localPhone: '5555555552',
            countryCode: '+91',
            passwordHash: 'hashedpassword',
            authProvider: 'local',
            accountStatus: 'active',
            role: 'customer',
        }).returning();
        otherUserId = other.id;

        const [manager] = await db.insert(users).values({
            name: 'Seat Route Manager',
            email: 'seatroute.manager@test.com',
            localPhone: '5555555553',
            countryCode: '+91',
            passwordHash: 'hashedpassword',
            authProvider: 'local',
            accountStatus: 'active',
            role: 'manager',
        }).returning();
        testManagerId = manager.id;

        const [driver] = await db.insert(users).values({
            name: 'Seat Route Driver',
            email: 'seatroute.driver@test.com',
            localPhone: '5555555554',
            countryCode: '+91',
            passwordHash: 'hashedpassword',
            authProvider: 'local',
            accountStatus: 'active',
            role: 'driver',
        }).returning();
        testDriverId = driver.id;

        userToken = await app.jwt.sign({ id: testUserId, role: 'customer' });
        otherToken = await app.jwt.sign({ id: otherUserId, role: 'customer' });

        const [vehicle] = await db.insert(vehicles).values({
            vehicleNumber: 'TEST-1234',
            capacity: 40,
            vehicleType: 'bus',
        }).returning();
        testVehicleId = vehicle.id;

        const trip = await TripService.createTrip({
            name: 'Seat Route Trip',
            startLocation: 'Quebec',
            endLocation: 'Montreal',
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 104400000).toISOString(),
            vehicleId: testVehicleId,
            capacity: 40,
            driverId: testDriverId,
        }, { id: testManagerId, role: 'manager' });
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 10,
            price: 5000,
            status: 'available',
            seatType: 'standard',
        }).returning();
        testSeatId = seat.id;
    }, 20000);

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(seats).where(eq(seats.id, testSeatId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(users).where(eq(users.id, testUserId));
            await tx.delete(users).where(eq(users.id, otherUserId));
            await tx.delete(users).where(eq(users.id, testManagerId));
            await tx.delete(users).where(eq(users.id, testDriverId));
        })
        await app.close();
    })

    const resetSeat = () => db.update(seats).set({ 
        status: 'available',
        lockedByUserId: null,
        lockedUntil: null,
        version: 0,
    }).where(eq(seats.id, testSeatId));

    // POST /seats/lock
    describe('POST /seats/lock', () => {
        it('should return 401 with no token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(401);
        })

        it('should return 404 for a not-existent seat', async () => {
            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: '00000000-0000-0000-0000-000000000000'}),
            })
            expect(response.status).toBe(404);
        });

        it('should lock an available seat and return 200', async () => {
            await resetSeat();

            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('locked');
            expect(body.data.lockedByUserId).toBe(testUserId);
        });

        it('should return 409 when seat is already locked', async () => {
            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(409);
        })

        it('should return 409 when seat is sold', async () => {
            await db.update(seats).set({ status: 'sold' }).where(eq(seats.id, testSeatId));

            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(409)
        })
    })

    describe('DELETE /seats/lock', () => {
        it('should return 401 with no token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(401);
        })

        it('should unlock the seat and return 200', async () => {
            await db.update(seats).set({
                status: 'locked',
                lockedByUserId: testUserId,
                lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
                version: 1,
            }).where(eq(seats.id, testSeatId));

                    
            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
        })

        it('should return 409 when another user tries to unlock', async () => {
            await db.update(seats).set({
                status: 'locked',
                lockedByUserId: testUserId,
                lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
                version: 2,
            }).where(eq(seats.id, testSeatId));

            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${otherToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(409);
        })

        it('should return 409 when seat is not locked', async () => {
            await resetSeat();

            const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ seatId: testSeatId }),
            })
            expect(response.status).toBe(409);
        })

    })

})