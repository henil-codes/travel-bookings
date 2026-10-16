import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar, integer, text } from "drizzle-orm/pg-core";

export const vehicles = pgTable('vehicles', {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleType: varchar('vehicle_type', { length: 100 }).notNull(),
    vehicleNumber: varchar('vehicle_number', { length: 100 }).notNull(),
    capacity: integer('capacity').notNull(),
    amenities: text('amenities').array().notNull().default([]),
})

export type Vehicle = InferSelectModel<typeof vehicles>;