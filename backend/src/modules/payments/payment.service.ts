import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '@/db';
import { payments, paymentMethodEnum } from '@/db/schema/payments';
import { bookings } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { eq } from 'drizzle-orm';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/core/errors';
import { appEmitter } from '@/core/emitter';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class PaymentService {
  // --- Create a payment order ---
  static async createPaymentOrder(bookingId: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.status !== 'pending') {
      throw new ConflictError(
        'Cannot create payment order with status ' + booking.status
      );
    }

    const amountInPaise = booking.totalAmount;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: booking.currency,
      receipt: booking.id,
    });

    // Save the payment order details in the database
    await db.insert(payments).values({
      bookingId: booking.id,
      gatewayOrderId: order.id,
      event: 'order_created',
      amount: booking.totalAmount,
      currency: booking.currency,
      gatewayResponse: JSON.stringify(order),
    });

    // return order details to the frontend
    return {
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: booking.currency,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  }

  // --- Called after Razorpay checkout success, to verify and capture payment ---
  static async handleSuccess(input: {
    bookingId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewayPaymentSignature: string;
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
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .for('update');

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.status !== 'pending') {
        throw new ConflictError(
          'Cannot capture payment for booking with status ' + booking.status
        );
      }

      // Record the successful payment
      await tx.insert(payments).values({
        bookingId: input.bookingId,
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
        gatewayPaymentSignature: input.gatewayPaymentSignature,
        event: 'payment_captured',
        method: input.method,
        amount: booking.totalAmount,
        currency: booking.currency,
        gatewayResponse: JSON.stringify(input),
      });

      // Update booking status to confirmed
      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      // Update seat status to booked
      await tx
        .update(seats)
        .set({ status: 'sold' })
        .where(eq(seats.id, booking.seatId));

      appEmitter.emit('seat:status_changed', {
        seatId: booking.seatId,
        status: 'sold',
        lockedUntil: null,
      });

      return updatedBooking;
    });
  }

  // --- Handle payment failure ---
  static async handleFailure(input: {
    bookingId: string;
    gatewayOrderId: string;
    gatewayResponse?: string;
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

      if (booking.status !== 'pending') {
        throw new ConflictError(
          'Cannot record payment failure for booking with status ' +
            booking.status
        );
      }

      await tx.insert(payments).values({
        bookingId: input.bookingId,
        gatewayOrderId: input.gatewayOrderId,
        event: 'payment_failed',
        amount: booking.totalAmount,
        currency: booking.currency,
        gatewayResponse: input.gatewayResponse,
      });

      await tx
        .update(bookings)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId));

      await tx
        .update(seats)
        .set({ status: 'available' })
        .where(eq(seats.id, booking.seatId));

      appEmitter.emit('seat:status_changed', {
        seatId: booking.seatId,
        status: 'available',
        lockedUntil: null,
      });
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

      if (booking.status !== 'completed') {
        throw new ConflictError('Only completed bookings can be refunded');
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
        event: 'refund_initiated',
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
        event: 'refund_completed',
        amount: existingRefund.amount,
        refundAmount: existingRefund.refundAmount,
        currency: existingRefund.currency,
        gatewayResponse: JSON.stringify(event),
      });
    }
  }
}
