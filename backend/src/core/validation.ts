import { z } from 'zod';

export const lockSeatSchema = z.object({
    seatId: z.string().uuid({ message: 'Invalid seat ID format' }),
    userId: z.string().min(1, { message: 'User ID is required' }),
})

// For Razorpay payment verification after client completes payment
export const verifyPaymentSchema = z.object({
    bookingId: z.string().uuid(),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
})

// For creating a booking order
export const createBookingSchema = z.object({
    seatId: z.string().uuid(),
    userId: z.string().min(1),
    tripId: z.string().uuid(),
})

export type  LockSeatPayload = z.infer<typeof lockSeatSchema>;
export type VerifyPaymentPayload = z.infer<typeof verifyPaymentSchema>;
export type CreateBookingPayload = z.infer<typeof createBookingSchema>;