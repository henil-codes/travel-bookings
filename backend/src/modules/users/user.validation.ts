import { z } from 'zod'
import { roleEnum } from '@/db/schema/users'

export const userFilterSchema = z.object({
    role: z.enum(roleEnum.enumValues).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(100),
})

export type UserFilterInput = z.infer<typeof userFilterSchema>;