import { z } from 'zod';

export const createOrderParamsSchema = z.object({
    bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
})

// Verify payment - called after Razorpay checkout succeeds on client
export const verifyPaymentSchema = z.object({
    bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
    razorpayOrderId: z.string().min(1, { message: 'Razorpay order Id is required' }),
    razorpayPaymentId: z.string().min(1, { message: 'Razorpay payment ID is required' }),
    razorpaySignature: z.string().min(1, { message: 'Razorpay signature is required' }),
})

// Handle payment failure - called when Razorpay checkout fails
export const paymentFailureSchema = z.object({
    bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
    gatewayOrderId: z.string().min(1, { message: 'Gateway order ID is required' }),
    gatewayResponse: z.string().max(2048).optional(), // raw error payload of debugging purposes
})

// Initiate refund - admin only
export const initiateRefundSchema = z.object({
    cancellationReason: z.string().min(1, { message: 'Cancellation reason is required' }).max(255),
    refundAmount: z.number().int().positive({ message: 'Refund amount must be in paise' }),
})

export const refundParamsSchema = z.object({
    bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
})

// Webhook - Razorpay server-to-server event
export const webhookHeaderSchema = z.object({
    'x-razorpay-signature': z.string().min(1, { message: 'Missing Razorpay webhook signature' }),
})