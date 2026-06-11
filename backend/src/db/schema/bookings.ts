import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  uniqueIndex,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { trips } from './trips';
import { seats } from './seats';
import { users } from './users';
import { InferSelectModel, notInArray, sql } from 'drizzle-orm';
import { passengers } from './passengers';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
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
    passengerId: uuid('passenger_id')
      .references(() => passengers.id).notNull(),
    bookedBy: uuid('booked_by_user_id').references(() => users.id).notNull(),
    totalAmount: integer('total_amount').notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    cancellationReason: varchar('cancellation_reason', { length: 255 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    uniqueActiveSeatBooking: uniqueIndex('unique_active_seat_booking')
      .on(table.tripId, table.seatId)
      .where(sql`${table.status} not in ('failed', 'refunded', 'cancelled')`),
    bookingUserStatus: index('idx_booking_user_status').on(
      table.bookedBy,
      table.status
    ),
  })
);

export type Booking = InferSelectModel<typeof bookings>;