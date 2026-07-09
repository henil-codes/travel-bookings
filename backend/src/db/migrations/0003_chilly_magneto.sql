DROP INDEX "idx_expired_locks";--> statement-breakpoint
CREATE INDEX "idx_expired_locks" ON "seats" USING btree ("locked_until") WHERE status = 'locked';