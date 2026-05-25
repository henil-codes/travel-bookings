import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar, pgEnum, text, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum('user_role', ['customer', 'operator', 'admin']);
export const authProviderEnum = pgEnum('auth_provider', ['local', 'google']);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    countryCode: varchar('country_code', { length: 5 }).notNull(),
    local_phone: varchar('local_phone', { length: 15 }).notNull(),

    // AUTHENTICATION FIELDS
    passwordHash: text('password_hash'),
    authProvider: authProviderEnum('auth_provider').default('local').notNull(),
    role: roleEnum('role').default('customer').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = InferSelectModel<typeof users>;