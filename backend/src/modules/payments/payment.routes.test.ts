import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/app';
import { db } from '@/db';
import { payments } from '@/db/schema/payments';
import { bookings } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { passengers } from '@/db/schema/passengers';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

vi.mock('razorpay', () => ({
    default: class RazorPayMock {
        orders = { create: vi.fn().mockResolvedValue({ id: 'order_route_123', amount: 7500, currency: 'INR', receipt: 'test' }) };
        payments = { refund: vi.fn().mockResolvedValue({ id: 'refund_routes_456', payment_id: 'pay_route_789', amount: 7500 }) }
    }
}))

const makeSignature = (orderId: string, paymentId: string) =>
    crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? 'test_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');


const makeWebhookSignature = (body: string) =>
    crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET ?? 'test_web')
        .update(body)
        .digest('hex');

describe('Payment Routes Integration', () => {
    let app: FastifyInstance;
    let serverUrl: string;
    let testCustomerId: string;
    let otherCustomerId: string;
    let adminId: string;
    let customerToken: string;
    let otherCustomerToken: string;
    let adminToken: string;
    let testVehicleId: string;
    let testTripId: string;
    let testSeatId: string;
    let testPassengerId: string;
    let testBookingId: string;

    // helper - resets booking and seat to pre-payment state
    const resetState = async () => {
        await db.transaction(async (tx) => {
            await tx.delete(payments).where(eq(payments.bookingId, testBookingId));
            await tx.update(bookings).set({ status: 'pending' }).where(eq(bookings.id, testBookingId));
            await tx.update(seats).set({ status: 'reserved' }).where(eq(seats.id, testSeatId));
        })
    }

    beforeAll(async () => {
        app = buildApp();
        await app.listen({ port: 0, host: '127.0.0.1' });
        const address = app.server.address();
        if (typeof address === 'string' || !address) {
            throw new Error('No server address');
        }
        serverUrl = `http://127.0.0.1:${address.port}`;

        const [customer] = await db.insert(users).values({
            name: 'Pay Customer', email: 'pay.customer@test.com',
            countryCode: '+91', local_phone: '0000000001',
            authProvider: 'local', role: 'customer', accountStatus: 'active',
        }).returning();
        testCustomerId = customer.id;

        const [other] = await db.insert(users).values({
            name: 'Other Pay Customer', email: 'pay.other@test.com',
            countryCode: '+91', local_phone: '0000000002',
            authProvider: 'local', role: 'customer', accountStatus: 'active',
        }).returning();
        otherCustomerId = other.id;

        const [admin] = await db.insert(users).values({
            name: 'Pay Admin', email: 'pay.admin@test.com',
            countryCode: '+91', local_phone: '0000000003',
            authProvider: 'local', role: 'admin', accountStatus: 'active',
        }).returning();
        adminId = admin.id;

        customerToken = app.jwt.sign({ id: testCustomerId, role: 'customer' });
        otherCustomerToken = app.jwt.sign({ id: otherCustomerId, role: 'customer' });
        adminToken = app.jwt.sign({ id: adminId, role: 'admin' });

        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Test Operator', vehicleNumber: 'PAY-001',
            capacity: 40, vehicleType: 'bus',
        }).returning();
        testVehicleId = vehicle.id;

        const [trip] = await db.insert(trips).values({
            name: 'Pay Trip',
            startLocation: 'Vancouver',
            endLocation: 'Calgary',
            departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            arrivalTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
            vehicleId: testVehicleId,
            capacity: 40,
            status: 'scheduled',
        }).returning();
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 1,
            price: 7500,
            status: 'reserved',
            seatType: 'standard',
        }).returning();
        testSeatId = seat.id;

        const [passenger] = await db.insert(passengers).values({
            name: 'Pay Passenger', age: 28, gender: 'male',
            isAccessibilityRequired: false, idType: 'passport', idNumber: 'P1234567',
        }).returning();
        testPassengerId = passenger.id;

        const [booking] = await db.insert(bookings).values({
            tripId: testTripId, seatId: testSeatId,
            bookedBy: testCustomerId, passengerId: testPassengerId,
            status: 'pending', totalAmount: 7500, currency: 'INR'
        }).returning();
        testBookingId = booking.id;
    }, 20000);

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(payments).where(eq(payments.bookingId, testBookingId));
            await tx.delete(bookings).where(eq(bookings.id, testBookingId));
            await tx.delete(passengers).where(eq(passengers.id, testPassengerId));
            await tx.delete(seats).where(eq(seats.id, testSeatId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(users).where(eq(users.email, 'pay.customer@test.com'));
            await tx.delete(users).where(eq(users.email, 'pay.other@test.com'));
            await tx.delete(users).where(eq(users.email, 'pay.admin@test.com'));
        })
        await app.close();
    })

    const post = (path: string, body: object, token?: string) =>
        fetch(`${serverUrl}/api/v1${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body),
        })

    // POST /:bookingId/order
    describe('POST /payments/:bookingId/order', () => {
        beforeAll(async () => {
            await resetState();
        })

        it('should return 401 with no token', async () => {
            const res = await fetch(`${serverUrl}/api/v1/payments/${testBookingId}/order`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${otherCustomerToken}` },
            })
            expect(res.status).toBe(401);
        })

        it('should return 401 when another user tries to create order', async () => {
            const res = await fetch(`${serverUrl}/api/v1/payments/${testBookingId}/order`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${otherCustomerToken}` },
            })
            expect(res.status).toBe(401);
        })
    })

    // POST /verify
    describe('POST /payments/verify', () => {
        beforeAll(async () => {
            await resetState();
        })

        it('should return 401 with no token', async () => {
            const res = await post('/payments/verify', {
                bookingId: testBookingId,
                razorpayOrderId: 'order_route_123',
                razorpayPaymentId: 'pay_route_789',
                razorpaySignature: 'sig',
            });
            expect(res.status).toBe(401);
        })

        it('should return 401 for invalid signature', async () => {
            const res = await post('/payments/verify', {
                bookingId: testBookingId,
                razorpayOrderId: 'order_route_123',
                razorpayPaymentId: 'pay_route_789',
                razorpaySignature: 'bad_signature',
            }, customerToken);
            expect(res.status).toBe(401);
        })

        it('should verify payment and confirm booking', async () => {
            const signature = makeSignature('order_route_123', 'pay_route_789');
            const res = await post('/payments/verify', {
                bookingId: testBookingId,
                razorpayOrderId: 'order_route_123',
                razorpayPaymentId: 'pay_route_789',
                razorpaySignature: signature,
            }, customerToken);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('completed');
        })

        it('should not verify payment with reused order ID', async () => {
            const signature = makeSignature('order_route_123', 'pay_route_789');
            const res = await post('/payments/verify', {
                bookingId: testBookingId,
                razorpayOrderId: 'order_route_123',
                razorpayPaymentId: 'pay_route_789',
                razorpaySignature: signature,
            }, customerToken);
            expect(res.status).toBe(409);
        })
    })

    // POST /failure
    describe('POST /payments/failure', () => {
        beforeAll(async () => {
            await resetState();
        })

        it('should return 401 with no token', async () => {
            const res = await post('/payments/failure', {
                bookingId: testBookingId,
                gatewayOrderId: 'order_route_123',
            })
            expect(res.status).toBe(401);
        })

        it('should record failure and releas seat', async () => {
            const res = await post('/payments/failure', {
                bookingId: testBookingId,
                gatewayOrderId: 'order_route_123',
                gatewayResponse: 'payment_failed',
            }, customerToken);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);

            const [seat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
            expect(seat.status).toBe('available');
        })
    })

    // POST /refund/:bookingId - admin only
    describe('POST /payments/refund/:bookingId', () => {
        beforeAll(async () => {
            await resetState();

            await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, testBookingId));
            await db.update(seats).set({ status: 'sold' }).where(eq(seats.id, testSeatId));
            await db.insert(payments).values({
                bookingId: testBookingId,
                gatewayOrderId: 'order_route_123',
                gatewayPaymentId: 'pay_route_789', event: 'payment_captured',
                amount: 7500, currency: 'INR',
            })
        })

        it('should return 401 with no token', async () => {
            const res = await post(`/payments/refund/${testBookingId}`, {
                cancellationReason: 'test',
                refundAmount: 7500,
            })
            expect(res.status).toBe(401);
        })

        it('should return 403 for non-admin user', async () => {
            const res = await post(`/payments/refund/${testBookingId}`, {
                cancellationReason: 'test',
                refundAmount: 7500,
            }, customerToken);
            expect(res.status).toBe(403);
        })

        it('admin can initiate refund', async () => {
            const res = await post(`/payments/refund/${testBookingId}`, {
                cancellationReason: 'Admin initiated refund',
                refundAmount: 7500,
            }, adminToken);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
        })
    })

    // POST /webhook
    describe('POST /payments/webhook', () => {
        beforeAll(async () => {
            await resetState();

            // seed initial refund_initiated row
            await db.insert(payments).values({
                bookingId: testBookingId, gatewayOrderId: 'order_route_123',
                gatewayPaymentId: 'pay_route_789', gatewayRefundId: 'refund_route_456',
                event: 'refund_initiated', amount: 7500, refundAmount: 7500, currency: 'INR'
            })
        })

        it('should return 400 for missing signature', async () => {
            const rawBody = JSON.stringify({ event: 'refund.processed' });
            const res = await fetch(`${serverUrl}/api/v1/payments/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: rawBody,
            })
            expect(res.status).toBe(400);
        })

        it('should return 401 for invalid signature', async () => {
            const rawBody = JSON.stringify({ event: 'refund.processed' });
            const res = await fetch(`${serverUrl}/api/v1/payments/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-razorpay-signature': 'bad_signature',
                },
                body: rawBody,
            })
            expect(res.status).toBe(401);
        })

        it('should process valid refund.processed webhook', async () => {
            const rawBody = JSON.stringify({
                event: 'refund.processed',
                payload: {
                    refund: {
                        entity: {id: 'refund_route_456', payment_id: 'pay_route_789' },
                    }
                }
            })

            const signature = makeWebhookSignature(rawBody);
            const res = await fetch(`${serverUrl}/api/v1/payments/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-razorpay-signature': signature,
                },
                body: rawBody,
            })

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.received).toBe(true);
        })
    })
})