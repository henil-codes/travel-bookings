import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 5 }).notNull(),
    local_phone: varchar('local_phone', { length: 15 }).notNull(),
})

export type User = InferSelectModel<typeof users>;