import { InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, decimal, integer, pgEnum } from 'drizzle-orm/pg-core';
import { vehicles } from './vehicles';

export const tripStatusEnum = pgEnum('trip_status', [
    'scheduled',
    'cancelled',
    'completed',
    'boarding',
    'departed',
])

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  startLocation: varchar('start_location', { length: 255 }).notNull(),
  endLocation: varchar('end_location', { length: 255 }).notNull(),
  departureTime: timestamp('departure_time').notNull(),
  arrivalTime: timestamp('arrival_time').notNull(),
  capacity: integer('capacity').notNull(),
  status: tripStatusEnum('status').default('scheduled').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Trip = InferSelectModel<typeof trips>;