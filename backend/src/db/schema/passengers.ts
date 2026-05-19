import { pgTable, pgEnum, varchar, integer, boolean, uuid } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { InferSelectModel } from 'drizzle-orm';

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const idTypeEnum = pgEnum('id_type', ['aadhar', 'pan', 'passport', 'driving_license']);

export const passengers = pgTable('passengers', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    age: integer('age').notNull(),
    gender: genderEnum('gender').notNull(),
    isAccessibilityRequired: boolean('is_accessibility_required').default(false).notNull(),
    idType: idTypeEnum('id_type').notNull(),
    idNumber: varchar('id_number', { length: 255 }).notNull(),
})

export type Passenger = InferSelectModel<typeof passengers>;