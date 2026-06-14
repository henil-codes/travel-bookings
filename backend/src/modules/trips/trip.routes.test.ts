import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '@/app'
import { db } from '@/db'
import { trips } from '@/db/schema/trips'
import { vehicles } from '@/db/schema/vehicles'
import { seats } from '@/db/schema/seats'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import { TripService } from './trip.service'

describe('Trip Routes Integration', () => {
    let app: FastifyInstance;
    let serverUrl: string;
    let testVehicleId: string;
    let testTripId: string;
    let testUserId: string;
    let testManagerId: string;
    let testDriverId: string;
    let adminToken: string;
    let managerToken: string;
    let customerToken: string;

    beforeAll(async () => {
        app = buildApp();
        await app.listen({ port: 0, host: '127.0.0.1' });
        const address = app.server.address();
        if (typeof address === 'string' || !address) {
            throw new Error('Failed to get server address');
        }
        serverUrl = `http://127.0.0.1:${address.port}`;

        const [admin] = await db.insert(users).values({
            name: 'Admin User', email: 'triproute.admin@test.com',
            countryCode: '+91', localPhone: '0000000001',
            authProvider: 'local', role: 'admin', accountStatus: 'active'
        }).returning();

        const [manager] = await db.insert(users).values({
            name: 'Manager User',
            email: 'triproute.manager@test.com',
            passwordHash: 'hashedPassword',
            countryCode: '+91', localPhone: '0000000002',
            accountStatus: 'active',
            authProvider: 'local', role: 'manager'
        }).returning();
        testManagerId = manager.id;

        const [driver] = await db.insert(users).values({
            name: 'Driver User',
            email: 'triproute.driver@test.com',
            passwordHash: 'hashedPassword',
            countryCode: '+91', localPhone: '0000000004',
            accountStatus: 'active',
            authProvider: 'local', role: 'driver'
        }).returning();
        testDriverId = driver.id;

        const [customer] = await db.insert(users).values({
            name: 'Customer User', email: 'triproute.customer@test.com',
            countryCode: '+91', localPhone: '0000000003',
            authProvider: 'local', role: 'customer', accountStatus: 'active',
        }).returning();
        testUserId = customer.id;

        // sign tokens directly via app.jwt
        adminToken = app.jwt.sign({ id: admin.id, role: 'admin' });
        managerToken = app.jwt.sign({ id: manager.id, role: 'manager' });
        customerToken = app.jwt.sign({ id: customer.id, role: 'customer' });

        const [vehicle] = await db.insert(vehicles).values({
           vehicleNumber: 'RT-001',
            capacity: 40, vehicleType: 'bus',
        }).returning();
        testVehicleId = vehicle.id;

        const [trip] = await db.insert(trips).values({
            name: 'Toronto to Ottawa',
            startLocation: 'Toronto',
            endLocation: 'Ottawa',
            departureTime: new Date(Date.now() + 86400000),
            arrivalTime: new Date(Date.now() + 936000000),
            vehicleId: testVehicleId,
            capacity: 40,
            driverId: testDriverId,
        }).returning();
        testTripId = trip.id;

        // seed some seats for the seat map test
        await db.insert(seats).values([
            { tripId: testTripId, seatNumber: 1, price: 4500, status: 'available', seatType: 'standard' },
            { tripId: testTripId, seatNumber: 2, price: 4500, status: 'locked', seatType: 'standard' },
            { tripId: testTripId, seatNumber: 3, price: 5500, status: 'sold', seatType: 'accessible' },
            { tripId: testTripId, seatNumber: 4, price: 4500, status: 'reserved', seatType: 'women_only' },
        ])
    }, 20000);

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(seats).where(eq(seats.tripId, testTripId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(users).where(eq(users.id, testUserId));
            await tx.delete(users).where(eq(users.id, testManagerId));
            await tx.delete(users).where(eq(users.id, testDriverId));
            await tx.delete(users).where(eq(users.email, 'triproute.admin@test.com'))
        })
        await app.close();
    })

    const get = (path: string, token?: string) =>
        fetch(`${serverUrl}/api/v1${path}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })


    const post = (path: string, body: object, token?: string) =>
        fetch(`${serverUrl}/api/v1${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        })


    const patch = (path: string, body: object, token?: string) =>
        fetch(`${serverUrl}/api/v1${path}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });

    const del = (path: string, token?: string) =>
        fetch(`${serverUrl}/api/v1${path}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })


    // GET / - public
    describe('GET /trips', () => {
        it('should return trips without auth', async () => {
            const res = await get('/trips');
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        })

        it('should filter by startLocation', async () => {
            const res = await get('/trips?startLocation=Toronto');
            const body = await res.json();
            expect(res.status).toBe(200);
            body.data.forEach((t: any) => {
                expect(t.startLocation.toLowerCase()).toBe('toronto');
            })
        })

        it('should filter by endLocation', async () => {
            const res = await get('/trips?endLocation=Ottawa');
            const body = await res.json();
            expect(res.status).toBe(200);
            body.data.forEach((t: any) => {
                expect(t.endLocation.toLowerCase()).toBe('ottawa');
            })
        })

        it('should return empty array for no matching results', async () => {
            const res = await get('/trips?startLocation=Atlantis-Nowhere-City-999');
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.data).toHaveLength(0);
        })

        it('should respect pagination', async () => {
            const res = await get('/trips?page=1&limit=1');
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.data.length).toBeLessThanOrEqual(1);
        })
    })

    // GET /:id - public
    describe('GET /trips/:id', () => {
        it('should return a trip by ID without auth', async () => {
            const res = await get(`/trips/${testTripId}`);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testTripId);
        })

        it('should return 404 for non-existent trip', async () => {
            const res = await get('/trips/00000000-0000-0000-0000-000000000000');
            expect(res.status).toBe(404);
        })

        it('should return 400 for invalid UUID', async () => {
            const res = await get('/trips/not-a-uuid');
            expect(res.status).toBe(400);
        })
    })

    // GET /:id/seats - public
    describe('GET /trips/:id/seats', () => {
        it('should return seat map grouped by status', async () => {
            const res = await get(`/trips/${testTripId}/seats`);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('available');
            expect(body.data).toHaveProperty('locked');
            expect(body.data).toHaveProperty('sold');
            expect(body.data).toHaveProperty('reserved');
            expect(body.data).toHaveProperty('summary');
        })

        it('should return correct summary counts', async () => {
            const res = await get(`/trips/${testTripId}/seats`);
            const body = await res.json();
            expect(body.data.summary.total).toBe(4);
            expect(body.data.summary.available).toBe(1);
            expect(body.data.summary.locked).toBe(1);
            expect(body.data.summary.sold).toBe(1);
            expect(body.data.summary.reserved).toBe(1);
        })
    })

    // POST / - admin + manager
    describe('POST /trips', () => {
        let createdTripId: string;

        afterAll(async () => {
            if (createdTripId) {
                await db.delete(trips).where(eq(trips.id, createdTripId));
            }
        })

        const validTrip = () => ({
            name: 'Ottawa to Montreal',
            startLocation: 'Ottawa',
            endLocation: 'Montreal',
            departureTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: new Date(Date.now() + 97200000).toISOString(),
            vehicleId: testVehicleId,
            driverId: testDriverId,
            capacity: 40,
        })

        it('should return 401 with no token', async () => {
            const res = await post('/trips', validTrip());
            expect(res.status).toBe(401);
        })

        it('should return 403 when customer tries to create trip', async () => {
            const res = await post('/trips', validTrip(), customerToken);
            expect(res.status).toBe(403);
        })

        it('should create a trip as operator', async () => {
            const res = await post('/trips', validTrip(), managerToken);
            const body = await res.json();
            expect(res.status).toBe(201);
            createdTripId = body.data.id;
        })

        it('should return 400 when arrivalTime is before departureTime', async () => {
            const res = await post('/trips', {
                ...validTrip(),
                departureTime: new Date(Date.now() + 10000).toISOString(),
                arrivalTime: new Date(Date.now() + 5000).toISOString(),
            }, adminToken);
            expect(res.status).toBe(400);
        })

    })

    // PATCH /:id/status - admin + manager
    describe('PATCH /trips/:id/status', () => {
        it('should update trip status as admin', async () => {
            const res = await patch(`/trips/${testTripId}/status`, { status: 'boarding' }, adminToken);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.data.status).toBe('boarding');
        })

        it('should reject invalid status transation', async () => {
            const res = await patch(`/trips/${testTripId}/status`, { status: 'scheduled' }, adminToken);
            expect(res.status).toBe(409);
        })

        it('should return 403 when customer tries to update status', async () => {
            const res = await patch(`/trips/${testTripId}/status`, { status: 'departed' }, customerToken);
            expect(res.status).toBe(403);
        })
    })

    // DELETE /:id - admin only
    describe('DELETE /trips/:id', () => {
        let deletableTripId: string;

        beforeAll(async () => {
            const [trip] = await db.insert(trips).values({
                name: 'Deletable Trip',
                startLocation: 'City A',
                endLocation: 'City B',
                departureTime: new Date(Date.now() + 86400000),
                arrivalTime: new Date(Date.now() + 97200000),
                vehicleId: testVehicleId,
                capacity: 10,
                driverId: testUserId,
            }).returning();
            deletableTripId = trip.id;
        })

        afterAll(async () => {
            if (deletableTripId) {
                await db.delete(trips).where(eq(trips.id, deletableTripId));
            }
        })

        it('should return 403 when manager tries to delete', async () => {
            const res = await del(`/trips/${deletableTripId}`, managerToken);
            expect(res.status).toBe(403);
        })

        it('should delete a scheduled trip as admin', async () => {
            const res = await del(`/trips/${deletableTripId}`, adminToken);
            const body = await res.json();
            expect(res.status).toBe(200);
        })

        it('should return 404 after deletion', async () => {
            const res = await get(`/trips/${deletableTripId}`);
            expect(res.status).toBe(404);
        })
    })
})