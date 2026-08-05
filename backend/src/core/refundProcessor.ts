import fp from 'fastify-plugin';
import { and, or, eq, lte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { refundOutbox } from '@/db/schema/refundOutbox';
import { PaymentService } from '@/modules/payments/payment.service';

const POLL_INTERVAL_MS = 15000;
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const LEASE_TIMEOUT_MS = 5 * 60 * 1000;

export async function processRefundOutbox(): Promise<void> {
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(refundOutbox)
      .where(
        or(
          and(
            eq(refundOutbox.status, 'pending'),
            lte(refundOutbox.nextAttemptAt, sql`NOW()`)
          ),
          and(
            eq(refundOutbox.status, 'processing'),
            lt(
              refundOutbox.leasedAt,
              sql`NOW() - ${sql.raw(`interval '${LEASE_TIMEOUT_MS} milliseconds'`)}`
            )
          )
        )
      )
      .orderBy(refundOutbox.createdAt)
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true });

    if (rows.length === 0) return [];

    await tx
      .update(refundOutbox)
      .set({ status: 'processing', leasedAt: sql`NOW()` })
      .where(
        sql`${refundOutbox.id} IN (${sql.join(
          rows.map((row) => sql`${row.id}`),
          sql`, `
        )})`
      );

    return rows;
  });

  for (const row of claimed) {
    try {
      await PaymentService.initiateRefund({
        bookingId: row.bookingId,
        cancellationReason: row.cancellationReason,
      });

      await db
        .update(refundOutbox)
        .set({ status: 'completed', processedAt: new Date(), leasedAt: null })
        .where(eq(refundOutbox.id, row.id));
      continue;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('confirmed') || message.includes('refunded')) {
        await db
          .update(refundOutbox)
          .set({
            status: 'completed',
            processedAt: new Date(),
            leasedAt: null,
            lastError: 'already processed',
          })
          .where(eq(refundOutbox.id, row.id));

        continue;
      }

      const attempts = row.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      const backoffSec = Math.min(15 * 2 ** attempts, 900);

      await db
        .update(refundOutbox)
        .set({
          status: exhausted ? 'failed' : 'pending',
          attempts,
          lastError: message.slice(0, 1024),
          nextAttemptAt: sql`NOW() + (${backoffSec} * interval '1 second')`,
          leasedAt: null,
        })
        .where(eq(refundOutbox.id, row.id));
    }
  }
}

export const refundProcessorPlugin = fp(async (fastify) => {
  if (process.env.NODE_ENV === 'test') {
    fastify.log.info('Test env: refund processor disabled');
    return;
  }

  const timer = setInterval(async () => {
    processRefundOutbox().catch((err) => {
      fastify.log.error(err, 'Error processing refund outbox');
    });
  }, POLL_INTERVAL_MS);
  timer.unref();

  fastify.addHook('onClose', async () => {
    clearInterval(timer);
    fastify.log.info('Refund processor stopped');
  });

  fastify.log.info('Refund processor started');
});
