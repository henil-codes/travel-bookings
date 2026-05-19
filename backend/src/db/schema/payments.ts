import { pgTable, uuid, varchar, timestamp, decimal, pgEnum, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { InferSelectModel } from 'drizzle-orm';

export const paymentMethodEnum = pgEnum('payment_method', [
    'upi',
    'card',
    'net_banking',
    'wallet'
]);

export const paymentEventEnum = pgEnum('payment_event', [
    'order_created',    // Razorpay order created
    'payment_captured', // Payment successful
    'payment_failed',   // Payment failed
    'refund_initiated', // Refund started
    'refund_completed', // Refund successful
    'refund_failed',    // Refund failed
    'payment_cancelled',// Payment cancelled by user    
]);

export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').references(() => bookings.id).notNull(),
    
    // Razorpay identifiers
    gatewayOrderId: varchar('gateway_order_id', { length: 255 }).notNull(),
    gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }).notNull(),
    gatewayPaymentSignature: varchar('gateway_payment_signature', { length: 512 }).notNull(),
    gatewayRefundId: varchar('gateway_refund_id', { length: 255 }),
    
    // what actually happened in the payment flow
    event: paymentEventEnum('event').notNull(),
    method: paymentMethodEnum('method'),

    // amounts - kept separate so refund can be partial
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    
    // raw webhook/callback payload for debugging and audit trail
    gatewayResponse: varchar('gateway_response', { length: 2048 }),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
    idxPaymentBooking: index('idx_payment_booking').on(table.bookingId),
    idxPaymentOrder: index('idx_payment_order').on(table.gatewayOrderId)
}))

export type Payment = InferSelectModel<typeof payments>;