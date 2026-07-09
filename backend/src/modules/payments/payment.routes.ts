import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { BookingService } from '../bookings/booking.service';
import {
  verifyPaymentSchema,
  createOrderParamsSchema,
  paymentFailureSchema,
  refundParamsSchema,
  initiateRefundSchema,
  webhookHeaderSchema,
  createOrderResponseSchema,
} from './payment.validation';
import { requireRole } from '@/core/guards';
import { UnauthorizedError } from '@/core/errors';

export const paymentRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /:bookingId/order - Create Razorpay order
  server.post(
    '/:bookingId/order',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Create Razorpay order for a pending booking',
        tags: ['Payments'],
        params: createOrderParamsSchema,
        response: { 201: createOrderResponseSchema },
      },
    },
    async (request, reply) => {
      const booking = await BookingService.getBookingById(
        request.params.bookingId
      );

      if (booking.bookedBy !== request.user.id) {
        throw new UnauthorizedError('You can only pay for your own bookings');
      }

      const order = await PaymentService.createPaymentOrder(
        request.params.bookingId
      );

      return reply.status(201).send({
        success: true,
        message: 'Razorpay order created successfully',
        data: order,
      });
    }
  );

  // POST /verify - Verify Payment after Razorpay checkout completes
  server.post(
    '/verify',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description:
          'Verifies Razorpay payment signature and confirms booking.',
        tags: ['Payments'],
        body: verifyPaymentSchema,
      },
    },
    async (request, reply) => {
      const {
        bookingId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } = request.body;

      const booking = await BookingService.getBookingById(bookingId);

      if (booking.bookedBy !== request.user.id) {
        throw new UnauthorizedError('You can only verify your own payments');
      }

      const result = await PaymentService.handleSuccess({
        bookingId,
        gatewayOrderId: razorpayOrderId,
        gatewayPaymentId: razorpayPaymentId,
        gatewayPaymentSignature: razorpaySignature,
      });

      return reply.status(200).send({
        success: true,
        message: 'Payment verified and booking confirmed',
        data: result,
      });
    }
  );

  // POST /failure - Called when Razorpay checkout fails on cliend
  server.post(
    '/failure',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Records a failed payment attempt and releases the seat.',
        tags: ['Payments'],
        body: paymentFailureSchema,
      },
    },
    async (request, reply) => {
      const booking = await BookingService.getBookingById(
        request.body.bookingId
      );

      if (booking.bookedBy !== request.user.id) {
        throw new UnauthorizedError(
          'You can only report failure for your own payments'
        );
      }

      await PaymentService.handleFailure(request.body);

      return reply.status(200).send({
        success: true,
        message: 'Payment failure recorded and Seat has been released',
      });
    }
  );

  // POST /refund/:bookingId - Initiate refund (Admin only)
  server.post(
    '/refund/:bookingId',
    {
      preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
      schema: {
        description:
          'Admin only. Initiates a Razorpay reufnd for a completed booking.',
        tags: ['Payments', 'Admin'],
        params: refundParamsSchema,
        body: initiateRefundSchema,
      },
    },
    async (request, reply) => {
      const refund = await PaymentService.initiateRefund({
        bookingId: request.params.bookingId,
        cancellationReason: request.body.cancellationReason,
        refundAmount: request.body.refundAmount,
      });

      return reply.status(200).send({
        success: true,
        message: 'Refund Initiated successfully',
        data: refund,
      });
    }
  );

  // POST /webhook - Razorpay sever-to-server webhook
  server.post(
    '/webhook',
    {
      config: { rawBody: true },
      schema: {
        description: 'Razorpay webhook endpoint. Verified by signature.',
        tags: ['Payments'],
        headers: webhookHeaderSchema,
        body: z.object({}),
      },
    },
    async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'] as string;

      if (!signature) {
        return reply.status(400).send({
          success: false,
          error: 'Missing Razorpay webhook signature',
        });
      }

      console.log('Raw Body: ', request.rawBody);

      await PaymentService.handleWebhook({
        rawBody: request.rawBody as string,
        signature,
      });

      return reply.status(200).send({ received: true });
    }
  );
};
