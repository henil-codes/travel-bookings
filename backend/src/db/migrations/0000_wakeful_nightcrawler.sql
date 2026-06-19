CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."id_type" AS ENUM('aadhar', 'pan', 'passport', 'driving_license');--> statement-breakpoint
CREATE TYPE "public"."seat_status" AS ENUM('available', 'locked', 'reserved', 'sold');--> statement-breakpoint
CREATE TYPE "public"."seat_type" AS ENUM('standard', 'accessible', 'women_only');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('scheduled', 'cancelled', 'completed', 'boarding', 'departed');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('local', 'google');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'manager', 'driver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."payment_event" AS ENUM('order_created', 'payment_captured', 'payment_failed', 'refund_initiated', 'refund_completed', 'refund_failed', 'payment_cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'card', 'net_banking', 'wallet');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"passenger_id" uuid NOT NULL,
	"booked_by_user_id" uuid NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"cancellation_reason" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "passengers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"gender" "gender" NOT NULL,
	"is_accessibility_required" boolean DEFAULT false NOT NULL,
	"id_type" "id_type" NOT NULL,
	"id_number" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"seat_type" "seat_type" DEFAULT 'standard' NOT NULL,
	"seat_number" integer NOT NULL,
	"price" integer NOT NULL,
	"status" "seat_status" DEFAULT 'available' NOT NULL,
	"locked_by_user_id" uuid,
	"locked_until" timestamp,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"start_location" varchar(255) NOT NULL,
	"end_location" varchar(255) NOT NULL,
	"departure_time" timestamp NOT NULL,
	"arrival_time" timestamp NOT NULL,
	"capacity" integer NOT NULL,
	"status" "trip_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"country_code" varchar(5),
	"local_phone" varchar(15),
	"password_hash" text,
	"google_id" text,
	"auth_provider" "auth_provider" DEFAULT 'local' NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"account_status" "account_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"suspended_until" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_type" varchar(100) NOT NULL,
	"vehicle_number" varchar(100) NOT NULL,
	"capacity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"gateway_order_id" varchar(255) NOT NULL,
	"gateway_payment_id" varchar(255),
	"gateway_payment_signature" varchar(512),
	"gateway_refund_id" varchar(255),
	"event" "payment_event" NOT NULL,
	"method" "payment_method",
	"amount" integer NOT NULL,
	"refund_amount" integer,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"gateway_response" varchar(2048),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_passengers_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."passengers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_user_id_users_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_seat_booking" ON "bookings" USING btree ("trip_id","seat_id") WHERE "bookings"."status" not in ('failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE INDEX "idx_booking_user_status" ON "bookings" USING btree ("booked_by_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_seat_number_per_trip" ON "seats" USING btree ("trip_id","seat_number");--> statement-breakpoint
CREATE INDEX "idx_seat_trip_status" ON "seats" USING btree ("trip_id","status");--> statement-breakpoint
CREATE INDEX "idx_payment_booking" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payment_order" ON "payments" USING btree ("gateway_order_id");