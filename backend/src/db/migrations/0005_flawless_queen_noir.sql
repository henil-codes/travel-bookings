ALTER TYPE "public"."user_role" ADD VALUE 'guest' BEFORE 'customer';--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "amenities" text[] DEFAULT '{}' NOT NULL;