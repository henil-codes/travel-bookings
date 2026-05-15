import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const vehicles = pgTable('vehicles', {
    id: uuid('id').primaryKey().defaultRandom(),
    operatorName: varchar('operator_name', { length: 255 }).notNull(),
    vehicleType: varchar('vehicle_type', { length: 100 }).notNull(),
    vehicleNumber: varchar('vehicle_number', { length: 100 }).notNull(),
    capacity: integer('capacity').notNull(),

})

export type Vehicle = InferSelectModel<typeof vehicles>;