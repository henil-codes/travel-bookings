import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { InferSelectModel } from 'drizzle-orm';

export const outboxStatusEnum = pgEnum('outbox_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const refundOutbox = pgTable(
  'refund_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id)
      .notNull(),
    cancellationReason: varchar('cancellation_reason', {
      length: 255,
    }).notNull(),
    status: outboxStatusEnum('status').default('pending').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    lastError: varchar('last_error', { length: 255 }),

    processedAt: timestamp('processed_at'),
    nextAttemptAt: timestamp('next_attempt_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    idxOutboxDue: index('idx_outbox_due').on(table.status, table.nextAttemptAt),
    idxOutboxBooking: index('idx_outbox_booking').on(table.bookingId),
  })
);

export type RefundOutbox = InferSelectModel<typeof refundOutbox>;