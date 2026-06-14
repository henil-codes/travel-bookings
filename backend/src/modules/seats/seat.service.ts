import { db } from "../../db";
import { users } from '@/db/schema/users'
import { NotFoundError, ConflictError } from "../../core/errors";
import { seats } from "../../db/schema/seats";
import { and, eq, sql } from "drizzle-orm";
import { appEmitter } from "@/core/emitter";

export class SeatService {
    static async lockSeat(seatId: string, userId: string) {
        return await db.transaction(async (tx) => {
            const [user] = await tx.select().from(users).where(eq(users.id, userId));

            if (!user) {
                throw new NotFoundError('User');
            }

            const [seat] = await tx
                .select()
                .from(seats)
                .where(eq(seats.id, seatId))
                .for('update')

            if (!seat) {
                throw new NotFoundError('Seat');
            }

            const now = new Date();
            const isLockExpired = seat.lockedUntil && new Date(seat.lockedUntil) < now;

            if (seat.status !== 'available' && !isLockExpired) {
                throw new ConflictError('Seat is not available for locking');
            }

            const lockDurationMinutes = 10;

            const [updateSeat] = await tx
                .update(seats)
                .set({
                    status: 'locked',
                    lockedUntil: sql`NOW() + (${lockDurationMinutes} * interval '1 minute')`,
                    lockedByUserId: userId,
                    version: seat.version + 1
                })
                .where(and(eq(seats.id, seatId), eq(seats.version, seat.version)))
                .returning();

            if (!updateSeat) {
                throw new ConflictError('Failed to lock seat - it may have been modified by another transaction. Please try again.');
            }

            appEmitter.emit('seat:status_changed', {
                tripId: updateSeat.tripId,
                seatId: updateSeat.id,
                status: 'locked',
                lockedUntil: updateSeat.lockedUntil,
            })

            return updateSeat;
        })
    }

    static async unlockSeat(seatId: string, userId: string) {
        return await db.transaction(async (tx) => {
            const [seat] = await tx.select().from(seats).where(eq(seats.id, seatId)).for('update');

            if (!seat) {
                throw new NotFoundError('Seat');
            }

            if (seat.status !== 'locked') {
                throw new ConflictError('Seat is not currently locked');
            }

            if (seat.lockedByUserId !== userId) {
                throw new ConflictError('You do not have permission to unlock this seat');
            }

            const [updateSeat] = await tx.update(seats).set({
                status: 'available',
                lockedUntil: null,
                lockedByUserId: null,
                version: seat.version + 1,
            }
            )
                .where(and(eq(seats.id, seatId), eq(seats.version, seat.version)))
                .returning();

            appEmitter.emit('seat:status_changed', {
                tripId: updateSeat.tripId,
                seatId: updateSeat.id,
                status: 'available',
                lockedUntil: null,
            })

            return updateSeat;
        })
    }
}