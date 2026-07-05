ALTER TABLE "users" ADD COLUMN "license_number" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "license_issue_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "license_expiry_date" timestamp;