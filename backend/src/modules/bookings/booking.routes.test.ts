import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/app';
import { db } from '@/db';
import { bookings } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { passengers } from '@/db/schema/passengers';
import { eq } from 'drizzle-orm';

describe('Booking Routes Integration', () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let testVehicleId: string;
  let testTripId: string;
  let testSeatId: string;
  let testCustomerId: string;
  let otherCustomerId: string;
  let testDriverId: string;
  let adminId: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;
  let testBookingId: string;
  let testPassengerId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('No server address');
    }
    serverUrl = `http://127.0.0.1:${address.port}`;

    // seed users
    const [customer] = await db
      .insert(users)
      .values({
        name: 'Booking Customer',
        email: 'booking.customer@test.com',
        countryCode: '+91',
        localPhone: '0000000001',
        authProvider: 'local',
        role: 'customer',
        accountStatus: 'active',
      })
      .returning();
    testCustomerId = customer.id;

    const [other] = await db
      .insert(users)
      .values({
        name: 'Other Customer',
        email: 'booking.other@test.com',
        countryCode: '+91',
        localPhone: '0000000002',
        authProvider: 'local',
        role: 'customer',
        accountStatus: 'active',
      })
      .returning();
    otherCustomerId = other.id;

    const [driver] = await db.insert(users).values({
        name: 'Booking Test Driver',
        email: 'booking.route.driver@test.com',
        countryCode: '+91',
        localPhone: '0000000004',
        authProvider: 'local',
        role: 'driver',
        accountStatus: 'active',
    }).returning();
    testDriverId = driver.id;

    const [admin] = await db
      .insert(users)
      .values({
        name: 'Booking Admin',
        email: 'booking.admin@test.com',
        countryCode: '+91',
        localPhone: '0000000003',
        authProvider: 'local',
        role: 'admin',
        accountStatus: 'active',
      })
      .returning();
    adminId = admin.id;

    customerToken = app.jwt.sign({ id: testCustomerId, role: 'customer' });
    otherCustomerToken = app.jwt.sign({
      id: otherCustomerId,
      role: 'customer',
    });
    adminToken = app.jwt.sign({ id: adminId, role: 'admin' });

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'BR-001',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const [trip] = await db
      .insert(trips)
      .values({
        name: 'Booking Route Trip',
        startLocation: 'Toronto',
        endLocation: 'Ottawa',
        departureTime: new Date(Date.now() + 86400000 * 2),
        arrivalTime: new Date(Date.now() + 86400000 * 2 + 7200000),
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testDriverId,
      })
      .returning();
    testTripId = trip.id;

    const [seat] = await db
      .insert(seats)
      .values({
        tripId: testTripId,
        seatNumber: 1,
        price: 7500,
        status: 'locked',
        seatType: 'standard',
        lockedByUserId: testCustomerId,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      })
      .returning();
    testSeatId = seat.id;
  }, 20000);

  afterAll(async () => {
    await db.transaction(async (tx) => {
      if (testBookingId) {
        await tx.delete(bookings).where(eq(bookings.id, testBookingId));
      }
      if (testPassengerId) {
        await tx.delete(passengers).where(eq(passengers.id, testPassengerId));
      }
      await tx.delete(seats).where(eq(seats.id, testSeatId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx
        .delete(users)
        .where(eq(users.email, 'booking.customer@test.com'));
      await tx.delete(users).where(eq(users.email, 'booking.other@test.com'));
      await tx.delete(users).where(eq(users.email, 'booking.admin@test.com'));
      await tx.delete(users).where(eq(users.email, 'booking.route.driver@test.com'));
    });
    await app.close();
  });

  const post = (path: string, body: object, token?: string) =>
    fetch(`${serverUrl}/api/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  const get = (path: string, token?: string) =>
    fetch(`${serverUrl}/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  const validBookingPayload = () => ({
    seatId: testSeatId,
    tripId: testTripId,
    currency: 'INR',
    status: 'pending',
    passenger: {
      name: 'Test Passenger',
      age: 25,
      gender: 'male',
      isAccessibilityRequired: false,
      idType: 'passport',
      idNumber: 'A1234561',
    },
  });

  // POST / - create booking
  describe('POST /bookings', () => {
    it('should return 401 with no token', async () => {
      const res = await post('/bookings', validBookingPayload());
      expect(res.status).toBe(401);
    });

    it('should create a bookig as authenticated customer', async () => {
      const res = await post('/bookings', validBookingPayload(), customerToken);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.booking.status).toBe('pending');
      expect(body.data.booking.totalAmount).toBe(7500);
      expect((body.data.booking as any).bookedBy).toBe(testCustomerId);
      expect(body.data.passenger.name).toBe('Test Passenger');

      testBookingId = body.data.booking.id;
      testPassengerId = body.data.passenger.id;
    });

    it('should return 409 when trying to book an already booked seat', async () => {
      const res = await post('/bookings', validBookingPayload(), customerToken);
      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid passenger ID format', async () => {
      const res = await post(
        '/bookings',
        {
          ...validBookingPayload(),
          seatId: 'not-a-uuid',
        },
        customerToken
      );
      expect(res.status).toBe(400);
    });
  });

  // GET / - list bookings
  describe('GET /bookings', () => {
    it('should return 401 with no token', async () => {
      const res = await get('/bookings');
      expect(res.status).toBe(401);
    });

    it('customer should only see their own bookings', async () => {
      const res = await get('/bookings', customerToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      body.data.forEach((b: any) => {
        expect(b.bookedBy).toBe(testCustomerId);
      });
    });

    it('customer cannot see other users bookings via userId param', async () => {
      const res = await get(`/bookings?userId=${adminId}`, customerToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      body.data.forEach((b: any) => {
        expect(b.bookedBy).toBe(testCustomerId);
      });
    });

    it('admin can see all bookings', async () => {
      const res = await get('/bookings', adminToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await get('/bookings?status=pending', customerToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      body.data.forEach((b: any) => {
        expect(b.status).toBe('pending');
      });
    });
  });

  // GET /:id - single booking
  describe('GET /bookings/:id', () => {
    it('should return booking to the owner', async () => {
      const res = await get(`/bookings/${testBookingId}`, customerToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.id).toBe(testBookingId);
    });

    it('should return 401 when another customer tries to view', async () => {
      const res = await get(`/bookings/${testBookingId}`, otherCustomerToken);
      expect(res.status).toBe(401);
    });

    it('admin can view any booking', async () => {
      const res = await get(`/bookings/${testBookingId}`, adminToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.id).toBe(testBookingId);
    });

    it('should return 404 for not-existing booking', async () => {
      const res = await get(
        `/bookings/00000000-0000-0000-0000-000000000000`,
        adminToken
      );
      expect(res.status).toBe(404);
    });
  });

  // POST /:id/cancel
  describe('POST /bookings/:id/cancel', () => {
    it('should return 401 with no token', async () => {
      const res = await post(`/bookings/${testBookingId}/cancel`, {
        cancellationReason: 'Change of plans',
      });
      expect(res.status).toBe(401);
    });

    it('should return 401 when another customer tries to cancel', async () => {
      const res = await post(
        `/bookings/${testBookingId}/cancel`,
        {
          cancellationReason: 'Not my booking',
        },
        otherCustomerToken
      );
      expect(res.status).toBe(401);
    });

    it('customer can cancel their own booking within window', async () => {
      const res = await post(
        `/bookings/${testBookingId}/cancel`,
        {
          cancellationReason: 'Changed my mind',
        },
        customerToken
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.status).toBe('cancelled');
      expect(body.data.cancellationReason).toBe('Changed my mind');
    });

    it('should return 409 when cancelling an already cancelled booking', async () => {
      const res = await post(
        `/bookings/${testBookingId}/cancel`,
        {
          cancellationReason: 'Already cancelled',
        },
        customerToken
      );
      expect(res.status).toBe(409);
    });
  });

  // GET /admin/all - admin only
  describe('GET /bookings', () => {
    it('should return 403 for customer', async () => {
      const res = await get('/bookings', customerToken);
      expect(res.status).toBe(403);
    });

    it('admin can access all bookings', async () => {
      const res = await get('/bookings', adminToken);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
