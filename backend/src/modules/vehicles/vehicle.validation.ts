import { z } from 'zod';

export const vehicleFilterSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(100),
})

export const VEHICLE_AMENITIES = [
    'ac',
    'chargin_point',
    'wifi',
    'reclining_seats',
    'blanket',
    'entertainment_system',
    'washroom',
] as const;

export const createVehicleSchema = z.object({
    vehicleType: z.string().min(1).max(100),
    vehicleNumber: z.string().min(1).max(100),
    capacity: z.number().int().positive(),
    amenities: z.enum(VEHICLE_AMENITIES).array().default([]),
})

export type VehicleFilterInput = z.infer<typeof vehicleFilterSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;