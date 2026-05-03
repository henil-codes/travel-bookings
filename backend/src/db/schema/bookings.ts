import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  uniqueIndex,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { trips } from './trips';
import { seats } from './seats';
import { users } from './users';
import { InferSelectModel, relations, notInArray } from 'drizzle-orm';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .references(() => trips.id)
      .notNull(),
    seatId: uuid('seat_id')
      .references(() => seats.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
    gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
    gatewayPaymentSignature: varchar('gateway_payment_signature', {
      length: 512,
    }),
    status: paymentStatusEnum('status').default('pending').notNull(),
    cancellationReason: varchar('cancellation_reason', { length: 255 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    uniqueActiveSeatBooking: uniqueIndex('unique_active_seat_booking')
      .on(table.tripId, table.seatId, table.userId)
      .where(notInArray(table.status, ['failed', 'refunded'])),
    bookingUserStatus: index('idx_booking_user_status').on(
      table.userId,
      table.status
    ),
  })
);

export const bookingRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  seat: one(seats, {
    fields: [bookings.seatId],
    references: [seats.id],
  }),
}));

export type Booking = InferSelectModel<typeof bookings>;