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
            local_phone: '1234567890',
            passwordHash: 'hashedpassword',
            countryCode: 'IN'
        }).returning();
        testUserId = user.id;

        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Test Operator',
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
            status: 'scheduled'
        }).returning();
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 4,
            price: '89.00',
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
            totalAmount: '89.00',
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
            expect(paymentRecord.amount).toBe('89.00');
        })
    })

})