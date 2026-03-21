import { z } from 'zod';

export const lockSeatSchema = z.object({
    seatId: z.string().uuid({ message: 'Invalid seat ID format' }),
    userId: z.string().min(1, { message: 'User ID is required' }),
    lockDuration: z.number().int().positive({ message: 'Lock duration must be a positive integer' }),
})

/* export const bookingSchema = z.object({
    seatId: z.string().uuid({ message: 'Invalid seat ID format' }),
    userId: z.string().min(1, { message: 'User ID is required' }),
    paymentDetails: z.object({
        cardNumber: z.string().min(13).max(19).regex(/^\d+$/, { message: 'Card number must contain only digits' }),
        expiryMonth: z.number().int().min(1).max(12, { message: 'Expiry month must be between 1 and 12' }),
        expiryYear: z.number().int().min(new Date().getFullYear(), { message: 'Expiry year cannot be in the past' }),
        cvv: z.string().min(3).max(4).regex(/^\d+$/, { message: 'CVV must contain only digits' }),
    }),
}); */

export type  LockSeatPayload = z.infer<typeof lockSeatSchema>;
// export type BookingPayload = z.infer<typeof bookingSchema>;
