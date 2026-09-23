import { z } from 'zod';

export const vehicleFilterSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(100),
})

export type VehicleFilterInput = z.infer<typeof vehicleFilterSchema>;