import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

export const seatStatusEnum = pgEnum('seat_status', [
  'available',
  'locked',
  'reserved',
  'sold',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
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
});

export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .references(() => trips.id)
    .notNull(),
  seatNumber: integer('seat_number').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: seatStatusEnum('status').default('available').notNull(),
  lockedUntil: timestamp('locked_until'),
  version: integer('version').default(0).notNull(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .references(() => trips.id)
    .notNull(),
  seatId: uuid('seat_id')
    .references(() => seats.id)
    .notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
  gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
  status: paymentStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONS ---
export const tripRelations = relations(trips, ({ many }) => ({
  seats: many(seats),
  bookings: many(bookings),
}));

export const seatRelations = relations(seats, ({ one, many }) => ({
  trip: one(trips, {
    fields: [seats.tripId],
    references: [trips.id],
  }),
  bookings: many(bookings),
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  seat: one(seats, {
    fields: [bookings.seatId],
    references: [seats.id],
  })
}))

// --- Export Types ---
export type Seat = InferSelectModel<typeof seats>;
export type Trip = InferSelectModel<typeof trips>;
export type Booking = InferSelectModel<typeof bookings>;

export type NewSeat = InferInsertModel<typeof seats>;