import fp from 'fastify-plugin';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db'
import { seats } from '../db/schema/seats';
import { appEmitter } from './emitter';

const SWEEP_INTERVAL = 30_000;

export async function releaseExpiredSeatLocks(): Promise<number> {

    const released = await db.update(seats).set({
        status: 'available',
        lockedUntil: null,
        lockedByUserId: null,
        version: sql`$ {seats.version} + 1`,
    })
    .where(and(eq(seats.status, 'locked'), lt(seats.lockedUntil, sql `NOW()`)))
    .returning();

    for (const seat of released) {
        appEmitter.emit('seat:status_changed', {
            tripId: seat.tripId,
            seatId: seat.id,
            status: 'available',
            lockedUntil: null,
            lockedByUserId: null,
        })
    }

    return released.length;
}

export const seatLockSweeperPlugin = fp(async (fastify) => {
    const isTestEnv = process.env.NODE_ENV === 'test';

    if (isTestEnv) {
        fastify.log.info('Seat lock sweeper is disabled in test environment');
        return;
    }

    const timer = setInterval(() => {
        releaseExpiredSeatLocks()
        .then((count) => {
            fastify.log.info(`Released ${count} expired seat locks`);
        })
        .catch((err) => {
            fastify.log.error('Error releasing expired seat locks', err);
        })
    }, SWEEP_INTERVAL);

    timer.unref();

    fastify.addHook('onClose', async () => {
        clearInterval(timer);
        fastify.log.info('Seat lock sweeper stopped');
    })

    fastify.log.info('Seat lock sweeper started');
})