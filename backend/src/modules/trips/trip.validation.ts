import { number, z } from 'zod';
import { tripStatusEnum } from '@/db/schema/trips';

export const createTripSchema = z
  .object({
    name: z.string().min(1).max(255),
    startLocation: z.string().min(1).max(255),
    endLocation: z.string().min(1).max(255),
    departureTime: z
      .string()
      .datetime({ message: 'Invalid ISO date time format' }),
    arrivalTime: z
      .string()
      .datetime({ message: 'Invalid ISO date time format' }),
    vehicleId: z.string().uuid(),
    capacity: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.departureTime) <= new Date(data.arrivalTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Arrival time must be after departure time',
        path: ['arrivalTime'],
      });
    }

    if (new Date(data.departureTime) >= new Date()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Departure time must be in the future',
        path: ['departureTime'],
      });
    }
  });

export const updateTripSchema = z
  .object({
    vehicleId: z.string().uuid().optional(),
    name: z.string().min(1).max(255).optional(),
    startLocation: z.string().min(1).max(255).optional(),
    endLocation: z.string().min(1).max(255).optional(),
    departureTime: z.string().min(1).max(255).optional(),
    arrivalTime: z.string().min(1).max(255).optional(),
    capacity: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.departureTime && data.arrivalTime) {
      if (new Date(data.departureTime) <= new Date(data.arrivalTime)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Arrival time must be after departure time',
          path: ['arrivalTime'],
        });
      }
    }
  });

export const updateTripStatusSchema = z.object({
  status: z.enum(tripStatusEnum.enumValues),
});

export const tripFilterSchema = z.object({
    startLocation: z.string().min(1).optional(),
    endLocation: z.string().min(1).optional(),
    date: z.string().date({ message: 'Use YYYY-MM-DD format'}).optional(),
    status: z.enum(tripStatusEnum.enumValues).optional().default('scheduled'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateTripPayload = z.infer<typeof createTripSchema>;
export type UpdateTripPayload = z.infer<typeof updateTripSchema>;
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>;
export type TripFilterInput = z.infer<typeof tripFilterSchema>;
