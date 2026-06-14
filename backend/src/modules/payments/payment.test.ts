import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { db } from '@/db'
import { payments } from '@/db/schema/payments'
import { bookings } from '@/db/schema/bookings'
import { seats } from '@/db/schema/seats'
import { trips } from '@/db/schema/trips'
import { users } from '@/db/schema/users'
import { vehicles } from '@/db/schema/vehicles'
import { passengers } from '@/db/schema/passengers'
import { PaymentService } from './payment.service'
import { NotFoundError, ConflictError, UnauthorizedError } from '@/core/errors'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

vi.mock('razorpay', () => {
    return {
        default: class RazorpayMock {
            orders = {
                create: vi.fn().mockResolvedValue({
                    id: 'order_test_123',
                    amount: 8900,
                    currency: 'INR',
                    receipt: 'test-booking-id',
                })
            };
            payments = {
                refund: vi.fn().mockResolvedValue({
                    id: 'refund_test_456',
                    payment_id: 'payment_test_789',
                    amount: 8900,
                })
            }
        }
    }
});

// --- Helpers ---

// generate a valid Razorpay signature for testing
const makeSignature = (orderId: string, paymentId: string) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? 'test_secret')
    .update(`${orderId}|${paymentId}`)
    .digest('hex')


// generates a valid webhook signature
const makeWebhookSignature = (body: string) => crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET ?? 'webhook_secret')
    .update(body)
    .digest('hex')


// --- Send IDs shared across tests ---
describe('PaymentService', () => {
    let testUserId: string;
    let testVehicleId: string;
    let testTripId: string;
    let testSeatId: string;
    let testPassengerId: string;
    let testBookingId: string;
    let testDriverId: string;
    let testManagerId: string;
    // helper - resets bookings to pending + seats to reserved before each test
    const resetToPrePaymentState = async () => {
        await db.update(bookings).set({ status: 'pending', cancelledAt: null, cancellationReason: null, updatedAt: new Date() }).where(eq(bookings.id, testBookingId));

        await db.update(seats).set({ status: 'reserved' }).where(eq(seats.id, testSeatId));

        await db.delete(payments).where(eq(payments.bookingId, testBookingId));
    }

    beforeAll(async () => {
        const [user] = await db.insert(users).values({
            name: 'Payment Test User',
            email: 'paymenttest@example.com',
            localPhone: '1234567890',
            passwordHash: 'hashedpassword',
            authProvider: 'local',
            countryCode: '+91',
            accountStatus: 'active',
        }).returning();
        testUserId = user.id;

        const [manager] = await db.insert(users).values({
            name: 'Payment Test Manager',
            email: 'payment.manager@example.com',
            passwordHash: 'hashedPassword',
            countryCode: '+91',
            authProvider: 'local',
            localPhone: '9876543210',
            accountStatus: 'active',
            role: 'manager',
        }).returning();
        testManagerId = manager.id;

        const [driver] = await db.insert(users).values({
            name: 'Payment Test Driver',
            email: 'payment.driver@example.com',
            passwordHash: 'hashedPassword',
            countryCode: '+91',
            authProvider: 'local',
            localPhone: '9876543210',
            accountStatus: 'active',
            role: 'driver',
        }).returning();
        testDriverId = driver.id;

        const [vehicle] = await db.insert(vehicles).values({
            vehicleNumber: 'TEST123',
            capacity: 40,
            vehicleType: 'bus'
        }).returning();
        testVehicleId = vehicle.id;

        const [trip] = await db.insert(trips).values({
            name: 'Toronto to Ottawa',
            startLocation: 'Toronto',
            endLocation: 'Ottawa',
            departureTime: new Date(Date.now() + 86400000), // 1 day from now
            arrivalTime: new Date(Date.now() + 97200000), // 1 day + 8 hours from now
            vehicleId: testVehicleId,
            capacity: 40,
            driverId: testDriverId
        }).returning();
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 4,
            price: 8900,
            status: 'reserved',
            seatType: 'standard'
        }).returning();
        testSeatId = seat.id;

        const [passenger] = await db.insert(passengers).values({
            name: 'John Doe',
            age: 30,
            gender: 'male',
            isAccessibilityRequired: false,
            idType: 'passport',
            idNumber: 'X1234567'
        }).returning();
        testPassengerId = passenger.id;

        const [booking] = await db.insert(bookings).values({
            tripId: testTripId,
            seatId: testSeatId,
            bookedBy: testUserId,
            passengerId: testPassengerId,
            status: 'pending',
            totalAmount: 8900,
            currency: 'INR'
        }).returning();
        testBookingId = booking.id;
    }, 20000)

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(payments).where(eq(payments.bookingId, testBookingId));
            await tx.delete(bookings).where(eq(bookings.id, testBookingId));
            await tx.delete(passengers).where(eq(passengers.id, testPassengerId));
            await tx.delete(seats).where(eq(seats.id, testSeatId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(users).where(eq(users.id, testUserId));
            await tx.delete(users).where(eq(users.id, testDriverId));
            await tx.delete(users).where(eq(users.id, testManagerId));
        })
    })

    // --- Create Payment Order ---
    describe('createPaymentOrder', () => {
        beforeEach(async () => { await resetToPrePaymentState() });

        it('should create a razorpay order and return order details', async () => {
            const result = await PaymentService.createPaymentOrder(testBookingId);

            expect(result.orderId).toBe('order_test_123');
            expect(result.amount).toBe(8900);
            expect(result.currency).toBe('INR');

            const [paymentRecord] = await db.select().from(payments).where(eq(payments.bookingId, testBookingId));

            expect(paymentRecord.event).toBe('order_created');
            expect(paymentRecord.gatewayOrderId).toBe('order_test_123');
            expect(paymentRecord.gatewayPaymentId).toBeNull();
            expect(paymentRecord.amount).toBe(8900);
        })

        it('should throw NotFoundError if a non-existent booking', async () => {
            await expect(PaymentService.createPaymentOrder('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
        })

        it('should throw ConflictError if booking is not pending', async () => {
            await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, testBookingId));

            await expect(PaymentService.createPaymentOrder(testBookingId)).rejects.toThrow(ConflictError);
        })
    })

    // --- Handle Payment Success ---
    describe('handlePaymentSuccess', () => {
        const gatewayOrderId = 'order_test_123';
        const gatewayPaymentId = 'payment_test_789';

        beforeEach(async () => {
            await resetToPrePaymentState();

            // seed an order_created row 
            await db.insert(payments).values({
                bookingId: testBookingId,
                gatewayOrderId,
                event: 'order_created',
                amount: 8900,
                currency: 'INR',
            })
        })

        it('should verify signature, mark booking completed, seat sold', async () => {
            const signature = makeSignature(gatewayOrderId, gatewayPaymentId);

            const updatedBooking = await PaymentService.handleSuccess({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayPaymentId,
                gatewayPaymentSignature: signature,
                method: 'upi',
            })

            expect(updatedBooking.status).toBe('completed');

            // seat must be sold
            const [seat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
            expect(seat.status).toBe('sold');

            // payment record must be created
            const [paymentRecord] = await db.select().from(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'payment_captured')))
            expect(paymentRecord).toBeDefined();
            expect(paymentRecord.gatewayPaymentId).toBe(gatewayPaymentId);
            expect(paymentRecord.amount).toBe(8900);
            expect(paymentRecord.method).toBe('upi');
        })

        it('should throw UnauthorizedError if an invalid signature', async () => {
            await expect(PaymentService.handleSuccess({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayPaymentId,
                gatewayPaymentSignature: 'invalid_signature',
            })).rejects.toThrow(UnauthorizedError);
        })

        it('should throw ConflictError if booking is already completed', async () => {
            await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, testBookingId));

            const signature = makeSignature(gatewayOrderId, gatewayPaymentId);

            await expect(PaymentService.handleSuccess({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayPaymentId,
                gatewayPaymentSignature: signature,
            })).rejects.toThrow(ConflictError);
        })
    })

    // --- Handle Payment Failure ---
    describe('handlePaymentFailure', () => {
        const gatewayOrderId = 'order_test_123';

        beforeEach(async () => {
            await resetToPrePaymentState();
        })

        it('should record payment_failed, mark booking failed, release seat', async () => {
            await PaymentService.handleFailure({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayResponse: JSON.stringify({ error: 'Insufficient_funds' }),
            })

            const [booking] = await db.select().from(bookings).where(eq(bookings.id, testBookingId));
            expect(booking.status).toBe('failed');

            const [seat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
            expect(seat.status).toBe('available');
            expect(seat.lockedByUserId).toBeNull();
            expect(seat.lockedUntil).toBeNull();

            const [paymentRecord] = await db.select().from(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'payment_failed')));
            expect(paymentRecord).toBeDefined();
            expect(paymentRecord.gatewayOrderId).toBe(gatewayOrderId);
            expect(paymentRecord.gatewayResponse).toBe(JSON.stringify({ error: 'Insufficient_funds' }))
        })

        it('should throw ConflictError if booking is not pending', async () => {
            await db.update(bookings).set({ status: 'failed' }).where(eq(bookings.id, testBookingId));

            await expect(PaymentService.handleFailure({ bookingId: testBookingId, gatewayOrderId, gatewayResponse: 'error' })).rejects.toThrow(ConflictError);
        })

        it('should throw NotFoundError for non-existent booking', async () => {
            await expect(PaymentService.handleFailure({ bookingId: '00000000-0000-0000-0000-000000000000', gatewayOrderId, gatewayResponse: 'error' })).rejects.toThrow(NotFoundError);
        })
    })

    // --- Initiate Refund ---
    describe('initiateRefund', () => {
        const gatewayOrderId = 'order_test_123';
        const gatewayPaymentId = 'payment_test_789';

        beforeEach(async () => {
            await resetToPrePaymentState();

            await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, testBookingId));

            await db.update(seats).set({ status: 'sold' }).where(eq(seats.id, testSeatId));

            await db.insert(payments).values({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayPaymentId,
                event: 'payment_captured',
                amount: 8900,
                currency: 'INR',
            })
        })

        it('should initiate full refund and release seat', async () => {
            await PaymentService.initiateRefund({
                bookingId: testBookingId,
                cancellationReason: 'Customer requested cancellation',
            })

            const [booking] = await db.select().from(bookings).where(eq(bookings.id, testBookingId));
            expect(booking.status).toBe('refunded');
            expect(booking.cancelledAt).not.toBeNull();
            expect(booking.cancellationReason).toBe('Customer requested cancellation');

            const [seat] = await db.select().from(seats).where(eq(seats.id, testSeatId));
            expect(seat.status).toBe('available');
            expect(seat.lockedByUserId).toBeNull();
            expect(seat.lockedUntil).toBeNull()

            const [paymentRecord] = await db.select().from(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'refund_initiated')));
            expect(paymentRecord).toBeDefined();
            expect(paymentRecord.gatewayRefundId).toBe('refund_test_456');
            expect(paymentRecord.refundAmount).toBe(8900);
        })

        it('should support partial refund amount', async () => {
            await PaymentService.initiateRefund({
                bookingId: testBookingId,
                cancellationReason: 'Customer requested cancellation',
                refundAmount: 4450,
            })

            const [paymentRecord] = await db.select().from(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'refund_initiated')));
            expect(paymentRecord).toBeDefined();
            expect(paymentRecord.gatewayRefundId).toBe('refund_test_456');
            expect(paymentRecord.refundAmount).toBe(4450);
        })

        it('should throw ConflictError if booking is not completed', async () => {
            await db.update(bookings).set({ status: 'pending' }).where(eq(bookings.id, testBookingId));

            await expect(PaymentService.initiateRefund({
                bookingId: testBookingId,
                cancellationReason: 'Customer requested cancellation',
            })).rejects.toThrow(ConflictError);
        })

        it('should throw NotFoundError if no captured payment row exists', async () => {
            await db.delete(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'payment_captured')));

            await expect(PaymentService.initiateRefund({
                bookingId: testBookingId, 
                cancellationReason: 'Customer requested cancellation',
            })).rejects.toThrow(NotFoundError);
        })
    })

    // --- Webhook Handler ---
    describe('handleWebhook', () => {
        const gatewayOrderId = 'order_test_123';
        const gatewayPaymentId = 'payment_test_789';
        const gatewayRefundId = 'refund_test_456';

        beforeEach(async () => {
            await resetToPrePaymentState();

            await db.insert(payments).values({
                bookingId: testBookingId,
                gatewayOrderId,
                gatewayPaymentId, 
                gatewayRefundId,
                event: 'refund_initiated',
                amount: 8900,
                refundAmount: 8900,
                currency: 'INR'
            })
        })

        it('should record refund_completed when webhook is valid', async () => {
            const rawBody = JSON.stringify({
                event: 'refund.processed',
                payload: {
                    refund: {
                        entity: {
                            id: gatewayRefundId,
                            payment_id: gatewayPaymentId,
                        }
                    }
                }
            })

            const signature = makeWebhookSignature(rawBody);

            await PaymentService.handleWebhook({ rawBody, signature });

            const [paymentRecord] = await db.select().from(payments).where(and(eq(payments.bookingId, testBookingId), eq(payments.event, 'refund_completed')));
            expect(paymentRecord).toBeDefined();
            expect(paymentRecord.gatewayRefundId).toBe(gatewayRefundId);
        })

        it('should throw UnauthorizedError if signature verification fails', async ()=> {
            const rawBody = JSON.stringify({ event: 'refund.processed' });

            await expect(PaymentService.handleWebhook({ rawBody, signature: 'bad_signature'})).rejects.toThrow(UnauthorizedError);
        })

        it('should silently skip unknown refund IDs without throwing error', async () => {
            const rawBody = JSON.stringify({
                event: 'refund.processed',
                payload: {
                    refund: {
                        entity: {
                            id: 'refund_unknown_999',
                            payment_id: gatewayPaymentId,
                        }
                    }
                }
            })

            const signature = makeWebhookSignature(rawBody);

            await expect(PaymentService.handleWebhook({ rawBody, signature })).resolves.toBeUndefined();
        })
    })

})