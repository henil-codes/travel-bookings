import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '@/db';
import { payments, paymentMethodEnum } from '@/db/schema/payments';
import { bookings } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { refundOutbox } from '@/db/schema/refundOutbox';
import type { RefundOutboxFilter } from './payment.validation';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/core/errors';
import { appEmitter } from '@/core/emitter';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class PaymentService {
  // --- Create a payment order ---
  static async createPaymentOrder(bookingIds: string[], userId: string) {
    const { bookingRows, existingOrder } = await db.transaction(async (tx) => {
      const bookingRows = await db
        .select()
        .from(bookings)
        .where(inArray(bookings.id, bookingIds))
        .orderBy(bookings.id)
        .for('update');

      if (bookingRows.length !== bookingIds.length) {
        throw new NotFoundError('Booking');
      }

      for (const booking of bookingRows) {
        if (booking.bookedBy !== userId) {
          throw new UnauthorizedError('You can only pay for your own bookings');
        }
        if (booking.status !== 'pending') {
          throw new ConflictError(
            `Cannot create payment order for booking with status ${booking.status}`
          );
        }
      }

      const currency = bookingRows[0].currency;
      if (bookingRows.some((b) => b.currency !== currency)) {
        throw new ConflictError(
          'All bookings must have the same currency to create a single payment order'
        );
      }

      const [existingOrder] = await tx
        .select()
        .from(payments)
        .where(
          and(
            inArray(payments.bookingId, bookingIds),
            eq(payments.event, 'order_created')
          )
        )
        .limit(1);

      return { bookingRows, existingOrder };
    });

    if (existingOrder) {
      const order = JSON.parse(existingOrder.gatewayResponse!);
      return {
        razorpayOrderId: existingOrder.gatewayOrderId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID!,
      };
    }

    const currency = bookingRows[0]!.currency;
    const amountInPaise = bookingRows.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: bookingRows[0].id,
      notes: { bookingIds: bookingIds.join(',') },
    });

    // Save the payment order details in the database
    await db.insert(payments).values(
      bookingRows.map((booking) => ({
        bookingId: booking.id,
        gatewayOrderId: order.id,
        event: 'order_created' as const,
        amount: booking.totalAmount,
        currency: booking.currency,
        gatewayResponse: JSON.stringify(order),
      }))
    );

    // return order details to the frontend
    return {
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  }

  // --- Called after Razorpay checkout success, to verify and capture payment ---
  static async handleSuccess(input: {
    bookingIds: string[];
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewayPaymentSignature: string;
    userId: string;
    method?: (typeof paymentMethodEnum.enumValues)[number];
  }) {
    // Verify the payment signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'utf-8');
    const received = Buffer.from(input.gatewayPaymentSignature, 'utf-8');

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedError('Invalid payment signature');
    }

    return await db.transaction(async (tx) => {
      const bookingRows = await tx
        .select()
        .from(bookings)
        .where(inArray(bookings.id, input.bookingIds))
        .orderBy(bookings.id)
        .for('update');

      if (bookingRows.length !== input.bookingIds.length) {
        throw new NotFoundError('Booking');
      }

      for (const booking of bookingRows) {
        if (booking.bookedBy !== input.userId) {
          throw new UnauthorizedError('You can only verify your own payments');
        }
        if (booking.status !== 'pending') {
          throw new ConflictError(
            'Cannot capture payment for booking with status ' + booking.status
          );
        }
      }

      // Record the successful payment
      await tx.insert(payments).values(
        bookingRows.map((booking) => ({
          bookingId: booking.id,
          gatewayOrderId: input.gatewayOrderId,
          gatewayPaymentId: input.gatewayPaymentId,
          gatewayPaymentSignature: input.gatewayPaymentSignature,
          event: 'payment_captured' as const,
          method: input.method,
          amount: booking.totalAmount,
          currency: booking.currency,
          gatewayResponse: JSON.stringify(input),
        }))
      );

      // Update booking status to confirmed
      const updatedBookings = await tx
        .update(bookings)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(inArray(bookings.id, input.bookingIds))
        .returning();

      // Update seat status to booked
      const seatIds = updatedBookings.map((booking) => booking.seatId);
      await tx
        .update(seats)
        .set({ status: 'sold' })
        .where(inArray(seats.id, seatIds));

      for (const booking of updatedBookings) {
        appEmitter.emit('seat:status_changed', {
          tripId: booking.tripId,
          seatId: booking.seatId,
          status: 'sold',
          lockedUntil: null,
          lockedByUserId: null,
        });
      }

      return updatedBookings;
    });
  }

  // --- Handle payment failure ---
  static async handleFailure(input: {
    bookingIds: string[];
    gatewayOrderId: string;
    gatewayResponse?: string;
    userId: string;
  }) {
    return await db.transaction(async (tx) => {
      const bookingRows = await tx
        .select()
        .from(bookings)
        .where(inArray(bookings.id, input.bookingIds))
        .orderBy(bookings.id)
        .for('update');

      if (bookingRows.length !== input.bookingIds.length) {
        throw new NotFoundError('Booking');
      }

      for (const booking of bookingRows) {
        if (booking.bookedBy !== input.userId) {
          throw new UnauthorizedError(
            'You can only record payment failure for your own bookings'
          );
        }
      }

      const pendingBookings = bookingRows.filter(
        (booking) => booking.status === 'pending'
      );
      if (pendingBookings.length === 0) {
        return;
      }

      await tx.insert(payments).values(
        pendingBookings.map((booking) => ({
          bookingId: booking.id,
          gatewayOrderId: input.gatewayOrderId,
          event: 'payment_failed' as const,
          amount: booking.totalAmount,
          currency: booking.currency,
          gatewayResponse: input.gatewayResponse,
        }))
      );

      const pendingIds = pendingBookings.map((booking) => booking.id);
      await tx
        .update(bookings)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(inArray(bookings.id, pendingIds));

      const seatIds = pendingBookings.map((booking) => booking.seatId);
      await tx
        .update(seats)
        .set({ status: 'available' })
        .where(inArray(seats.id, seatIds));

      for (const booking of pendingBookings) {
        appEmitter.emit('seat:status_changed', {
          tripId: booking.tripId,
          seatId: booking.seatId,
          status: 'available',
          lockedUntil: null,
          lockedByUserId: null,
        });
      }
    });
  }

  // --- Handle Refunds (called by admin or automatically for cancellations) ---
  static async initiateRefund(input: {
    bookingId: string;
    cancellationReason: string;
    refundAmount?: number;
  }) {
    return await db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .for('update');

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.status !== 'confirmed') {
        throw new ConflictError('Only confirmed bookings can be refunded');
      }

      // find the captured payment to get gatewayPaymentId
      const [capturedPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.bookingId, input.bookingId))
        .orderBy(payments.createdAt)
        .limit(1);

      if (!capturedPayment?.gatewayPaymentId) {
        throw new NotFoundError('captured payment record');
      }

      const fullAmount = booking.totalAmount;
      const refundAmount = input.refundAmount ?? fullAmount;

      if (refundAmount > fullAmount) {
        throw new ConflictError(
          'Refund amount cannot be greater than the original amount'
        );
      }

      // Initiate refund via Razorpay
      const refund = await razorpay.payments.refund(
        capturedPayment.gatewayPaymentId,
        { amount: refundAmount }
      );

      // Record the refund in the database
      await tx.insert(payments).values({
        bookingId: input.bookingId,
        gatewayOrderId: capturedPayment.gatewayOrderId,
        gatewayPaymentId: capturedPayment.gatewayPaymentId,
        gatewayRefundId: refund.id,
        event: 'refund_initiated' as const,
        amount: booking.totalAmount,
        refundAmount: refundAmount,
        currency: booking.currency,
        gatewayResponse: JSON.stringify(refund),
      });

      // Update booking status to refunded
      await tx
        .update(bookings)
        .set({
          status: 'refunded',
          cancelledAt: new Date(),
          cancellationReason: input.cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId));

      // release seat
      await tx
        .update(seats)
        .set({ status: 'available', lockedUntil: null, lockedByUserId: null })
        .where(eq(seats.id, booking.seatId));

      appEmitter.emit('seat:status_changed', {
        seatId: booking.seatId,
        status: 'available',
        lockedUntil: null,
        lockedByUserId: null,
      });

      return refund;
    });
  }

  // --- Admin only: List refund outbox rows for retrying failed refunds ---
  static async listRefundOutbox(input: RefundOutboxFilter) {
    const offset = (input.page - 1) * input.limit;

    const rows = await db
      .select()
      .from(refundOutbox)
      .where(eq(refundOutbox.status, input.status))
      .limit(input.limit)
      .offset(offset)
      .orderBy(desc(refundOutbox.createdAt));

    return rows;
  }

  // --- Admin only: retry a failed refund outbox row ---
  static async retryRefund(outboxId: string) {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(refundOutbox)
        .where(eq(refundOutbox.id, outboxId))
        .for('update');

      if (!row) {
        throw new NotFoundError('Refund outbox row');
      }

      if (row.status !== 'failed') {
        throw new ConflictError(
          `Only failed refund outbox rows can be retried (current status: ${row.status})`
        );
      }

      const [updatedRow] = await tx
        .update(refundOutbox)
        .set({
          status: 'pending',
          attempts: 0,
          lastError: null,
          nextAttemptAt: new Date(),
        })
        .where(eq(refundOutbox.id, outboxId))
        .returning();

      return updatedRow;
    });
  }

  // --- Razorpay webhook handler Verfies webhook signature and records the event ---
  static async handleWebhook(input: { rawBody: string; signature: string }) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(input.rawBody)
      .digest('hex');

    if (expectedSignature !== input.signature) {
      throw new UnauthorizedError('Webhook signature verification failed.');
    }

    const event = JSON.parse(input.rawBody);

    if (event.event === 'refund.processed') {
      const refundId = event.payload.refund.entity.id as string;
      const paymentId = event.payload.refund.entity.payment_id as string;

      // find the payment record
      const [existingRefund] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayRefundId, refundId));

      if (!existingRefund) return;

      await db.insert(payments).values({
        bookingId: existingRefund.bookingId,
        gatewayOrderId: existingRefund.gatewayOrderId,
        gatewayPaymentId: paymentId,
        gatewayRefundId: refundId,
        event: 'refund_completed' as const,
        amount: existingRefund.amount,
        refundAmount: existingRefund.refundAmount,
        currency: existingRefund.currency,
        gatewayResponse: JSON.stringify(event),
      });
    }
  }
}
