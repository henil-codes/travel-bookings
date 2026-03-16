import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const seatStatusEnum = pgEnum('seat_status', [
  'available',
  'locked',
  'reserved',
  'sold',
]);

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  startLocation: varchar('start_location', { length: 255 }).notNull(),
  endLocation: varchar('end_location', { length: 255 }).notNull(),
  departureTime: timestamp('departure_time').notNull(),
  arrivalTime: timestamp('arrival_time').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id)
    .notNull(),
  seatNumber: integer('seat_number').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: seatStatusEnum('status').notNull().default('available').notNull(),
  lockedUntil: timestamp('locked_until'),
});

export type Seat = InferSelectModel<typeof seats>;
export type NewSeat = InferInsertModel<typeof seats>;