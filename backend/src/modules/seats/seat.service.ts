import { db } from "../../..";
import { AppError } from "../core/errors";
import { seats } from "../db/schema/seats";
import { and, eq, sql } from "drizzle-orm";

export class SeatService {
    static async lockSeat(seatId: string, userId: string) {
        return await db.transaction(async (tx) => {
            const [seat] = await tx
                .select()
                .from(seats)
                .where(eq(seats.id, seatId))
                .for('update')

            if (!seat) {
                throw new AppError('Seat not found', 404, true);
            }

            const now = new Date();
            const isLockExpired = seat.lockedUntil && new Date(seat.lockedUntil) < now;

            if (seat.status !== 'available' && !isLockExpired) {
                throw new AppError('Seat not available', 409, true);
            }

            const lockDurationMinutes = 10;

            const [updateSeat] = await tx
                .update(seats)
                .set({
                    status: 'locked',
                    lockedUntil: sql`NOW() + interval '${lockDurationMinutes} minutes'`,
                    version: seat.version + 1
                })
                .where(and(eq(seats.id, seatId), eq(seats.version, seat.version)))
                .returning();

            if (!updateSeat) {
                throw new AppError('Failed to lock seat - concurrency issue', 500, false);
            }

            return updateSeat;
        })
    }
}