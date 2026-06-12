import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(1).max(255),
    email: z.email(),
    password: z.string().min(8),
    countryCode: z.string().min(1).max(5),
    localPhone: z.string().min(5).max(15),
})

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
})

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;