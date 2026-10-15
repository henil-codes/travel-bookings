import { z } from 'zod'
import { roleEnum, accountStatusEnum } from '@/db/schema/users'

export const userFilterSchema = z.object({
    role: z.enum(roleEnum.enumValues).optional(),
    accountStatus: z.enum(accountStatusEnum.enumValues).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(100),
})

export const updateUserStatusSchema = z.object({
    accountStatus: z.enum(accountStatusEnum.enumValues),
})

export type UserFilterInput = z.infer<typeof userFilterSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;