import { z } from 'zod';

export const createOrderBodySchema = z.object({
  bookingIds: z
    .array(z.string().uuid({ message: 'Invalid booking Id format' }))
    .min(1, { message: 'At least one booking ID is required' })
    .max(6, {
      message: 'You can only pay for a maximum of 6 bookings at once',
    }),
});

export const createOrderResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    razorpayOrderId: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    keyId: z.string(),
  }),
});

// Verify payment - called after Razorpay checkout succeeds on client
export const verifyPaymentSchema = z.object({
  bookingIds: z
    .array(z.string().uuid({ message: 'Invalid booking ID format' }))
    .min(1)
    .max(6),
  razorpayOrderId: z
    .string()
    .min(1, { message: 'Razorpay order Id is required' }),
  razorpayPaymentId: z
    .string()
    .min(1, { message: 'Razorpay payment ID is required' }),
  razorpaySignature: z
    .string()
    .min(1, { message: 'Razorpay signature is required' }),
});

// Handle payment failure - called when Razorpay checkout fails
export const paymentFailureSchema = z.object({
  bookingIds: z
    .array(z.string().uuid({ message: 'Invalid booking ID format' }))
    .min(1)
    .max(6),
  gatewayOrderId: z
    .string()
    .min(1, { message: 'Gateway order ID is required' }),
  gatewayResponse: z.string().max(2048).optional(), // raw error payload of debugging purposes
});

// Initiate refund - admin only
export const initiateRefundSchema = z.object({
  cancellationReason: z
    .string()
    .min(1, { message: 'Cancellation reason is required' })
    .max(255),
  refundAmount: z
    .number()
    .int()
    .positive({ message: 'Refund amount must be in paise' }),
});

export const refundParamsSchema = z.object({
  bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
});

// Webhook - Razorpay server-to-server event
export const webhookHeaderSchema = z.object({
  'x-razorpay-signature': z
    .string()
    .min(1, { message: 'Missing Razorpay webhook signature' }),
});

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type VerifyPaymentBody = z.infer<typeof verifyPaymentSchema>;
export type PaymentFailureBody = z.infer<typeof paymentFailureSchema>;