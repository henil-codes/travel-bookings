import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  integer,
  uniqueIndex,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, relations } from 'drizzle-orm';
import { trips } from './trips';
import { users } from './users';

export const seatStatusEnum = pgEnum('seat_status', [
  'available',
  'locked',
  'reserved',
  'sold',
]);

export const seatTypeEnum = pgEnum('seat_type', [
  'standard',
  'accessible',
  'women_only',
]);

export const seats = pgTable(
  'seats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .references(() => trips.id)
      .notNull(),
    seatType: seatTypeEnum('seat_type').default('standard').notNull(),
    seatNumber: integer('seat_number').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    status: seatStatusEnum('status').default('available').notNull(),
    lockedByUserId: uuid('locked_by_user_id')
      .references(() => users.id),
    lockedUntil: timestamp('locked_until'),
    version: integer('version').default(0).notNull(),
  },
  (table) => ({
    uniqueSeatNumberPerTrip: uniqueIndex('unique_seat_number_per_trip').on(
      table.tripId,
      table.seatNumber
    ),
    seatTripStatus: index('idx_seat_trip_status').on(
      table.tripId,
      table.status
    ),
  })
);

// --- Export Types ---
export type Seat = InferSelectModel<typeof seats>;
