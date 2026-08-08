import { z } from 'zod';
import { genderEnum, idTypeEnum } from '@/db/schema/passengers'
import { paymentStatusEnum } from '@/db/schema/bookings';

// Seat locking schema
export const lockSeatSchema = z.object({
    seatId: z.string().uuid({ message: 'Invalid seat ID format' })
})

// Create booking schema
export const createBookingSchema = z.object({
    seatId: z.uuid(),
    tripId: z.uuid(),
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

// Cancel booking schema
export const cancelBookingSchema = z.object({
    cancellationReason: z.string().min(1, { message: 'Cancellation reason is required' }).max(255, { message: 'Cancellation reason cannot exceed 255 characters' }),
})

// List bookings - query filters
export const bookingFilterSchema = z.object({
    userId: z.string().uuid({ message: 'Invalid user ID format' }).optional(),
    tripId: z.string().uuid({ message: 'Invalid trip ID format' }).optional(),
    status: z.enum(paymentStatusEnum.enumValues).optional(),
    from: z.iso.date({ message: 'Use YYYY-MM-DD format'}).optional(),
    to: z.iso.date({ message: 'Use YYYY-MM-DD format'}).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
}).superRefine((data, ctx) => {
    if (data.from && data.to && new Date(data.to) < new Date(data.from)) {
        ctx.addIssue({
            code: 'custom',
            message: "'to' date must be after 'from' date",
            path: ['to'],
        })
    }
})

// Reusable param schemas
export const bookingParamsSchema = z.object({
    id: z.string().uuid({ message: 'Invalid booking ID format' }),
})

export type LockSeatPayload = z.infer<typeof lockSeatSchema>;
export type CreateBookingPayload = z.infer<typeof createBookingSchema>;
export type CancelBookingPayload = z.infer<typeof cancelBookingSchema>;
export type BookingFilter = z.infer<typeof bookingFilterSchema>;
export type BookingParams = z.infer<typeof bookingParamsSchema>;