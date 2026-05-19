import { z } from 'zod';
import { genderEnum, idTypeEnum } from '@/db/schema/passengers'

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
    bookedBy: z.string().min(1),
    tripId: z.string().uuid(),
    passenger: z.object({
        name: z.string().min(1),
        age: z.number().int().positive(),
        gender: z.enum(genderEnum.enumValues),
        isAccessibilityRequired: z.boolean().default(false),
        idType: z.enum(idTypeEnum.enumValues),
        idNumber: z.string().toUpperCase().transform((val) => val.replace(/[\s-]/g, '')),
    }).superRefine((data, ctx) => {
        if (data.idType === 'aadhar' &&
            !/^\d{12}$/.test(data.idNumber)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Aadhar card must be exactly 12 digits',
                path: ['idNumber'],
            });
        }

        else if (data.idType === 'pan' &&
            !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.idNumber)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Invalid PAN card format',
                path: ['idNumber'],
            })
        }

        else if (data.idType === 'passport' &&
            !/^[A-PR-W][1-9]\d\s?\d{4}[1-9]$/.test(data.idNumber)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Invalid Passport format',
                path: ['idNumber'],
            })
        }

        else if (data.idType === 'driving_license' && 
            !/^[A-Z]{2}\d{13}$/.test(data.idNumber)) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Invalid Driving License format',
                    path: ['idNumber'],
                })
            }
    })
})

export type LockSeatPayload = z.infer<typeof lockSeatSchema>;
export type VerifyPaymentPayload = z.infer<typeof verifyPaymentSchema>;
export type CreateBookingPayload = z.infer<typeof createBookingSchema>;