import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '@/app'
import { db } from '@/db'
import { trips } from '@/db/schema/trips'
import { vehicles } from '@/db/schema/vehicles'
import { seats } from '@/db/schema/seats'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'

describe('Trip Routes Integration', () => {
    let app: FastifyInstance;
    let serverUrl: string;
    let testVehicleId: string;
    let testTripId: string;
    let testUserId: string;
    let adminToken: string;
    let operatorToken: string;
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
            countryCode: '+91', local_phone: '0000000001',
            authProvider: 'local', role: 'admin',
        }).returning();

        const [operator] = await db.insert(users).values({
            name: 'Operator User', email: 'triproute.operator@test.com',
            countryCode: '+91', local_phone: '0000000002',
            authProvider: 'local', role: 'operator',
        }).returning();

        const [customer] = await db.insert(users).values({
            name: 'Customer User', email: 'triproute.customer@test.com',
            countryCode: '+91', local_phone: '0000000003',
            authProvider: 'local', role: 'customer',
        }).returning();
        testUserId = customer.id;

        // sign tokens directly via app.jwt
        adminToken = app.jwt.sign({ id: admin.id, role: 'admin' });
        operatorToken = app.jwt.sign({ id: operator.id, role: 'operator' });
        customerToken = app.jwt.sign({ id: customer.id, role: 'customer' });

        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Test Operator', vehicleNumber: 'RT-001',
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
            status: 'scheduled',
        }).returning();
        testTripId = trip.id;

        // seed some seats for the seat map test
        await db.insert(seats).values([
            { tripId: testTripId, seatNumber: 1, price: '45.00', status: 'available', seatType: 'standard' },
            { tripId: testTripId, seatNumber: 2, price: '45.00', status: 'locked', seatType: 'standard' },
            { tripId: testTripId, seatNumber: 3, price: '55.00', status: 'sold', seatType: 'accessible' },
            { tripId: testTripId, seatNumber: 4, price: '45.00', status: 'reserved', seatType: 'women_only' },
        ])
    }, 20000);

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(seats).where(eq(seats.tripId, testTripId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(users).where(eq(users.email, 'triproute.admin@test.com'));
            await tx.delete(users).where(eq(users.email, 'triproute.operator@test.com'));
            await tx.delete(users).where(eq(users.email, 'triproute.customer@test.com'));
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
    })




})