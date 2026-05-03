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
import { bookings } from './bookings';

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

// --- RELATIONS ---
export const seatRelations = relations(seats, ({ one, many }) => ({
  trip: one(trips, {
    fields: [seats.tripId],
    references: [trips.id],
  }),
  bookings: many(bookings),
}));

// --- Export Types ---
export type Seat = InferSelectModel<typeof seats>;