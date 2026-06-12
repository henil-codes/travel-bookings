import { pgTable, uuid, varchar, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { InferSelectModel } from 'drizzle-orm';

export const applicationStatusEnum = pgEnum('application_status', [
    'pending',
    'approved',
    'rejected',
    'requires_more_info',
])

export const operatorApplications = pgTable('operator_applications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull().unique(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    businessAddress: text('business_address').notNull(),
    gstin: varchar('gstin', { length: 15 }).notNull(),
    primaryContactName: varchar('primary_contact_name', { length: 255 }).notNull(),
    primaryContactPhone: varchar('primary_contact_phone', { length: 20 }).notNull(),
    estimatedFleetSize: varchar('estimated_fleet_size', { length: 50 }).notNull(),
    status: applicationStatusEnum('status').default('pending').notNull(),
    adminNotes: text('admin_notes'),
    createAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})