import {pgTable, varchar, integer,uuid } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { InferSelectModel } from 'drizzle-orm';

export const passengers = pgTable('passengers', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').references(() => bookings.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    age: integer('age').notNull(),
    gender: varchar('gender', { length: 50 }).notNull(),
    idType: varchar('id_type', { length: 100 }).notNull(),
    idNumber: varchar('id_number', { length: 255 }).notNull(),
})

export type Passenger = InferSelectModel<typeof passengers>;