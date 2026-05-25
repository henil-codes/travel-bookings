import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { AuthService } from './auth.service'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { buildApp } from '@/app'
import { FastifyInstance } from 'fastify'

const baseUser = {
    name: 'Auth Test User',
    email: 'authtest@example.com',
    password: 'securePassword123!',
    countryCode: '+1',
    localPhone: '5551234567'
};

describe('AuthService', () => {
    afterAll(async () => {
        await db.delete(users).where(eq(users.email, baseUser.email));
    })

    it('should register a new user and return safe user without passwordHash', async () => {
        const result = await AuthService.register(baseUser);

        expect(result.id).toBeDefined();
        expect(result.email).toBe(baseUser.email);
        expect(result.name).toBe(baseUser.name);
        expect(result.role).toBe('customer');
        expect(result.authProvider).toBe('local');
        expect((result as any).passwordHash).toBeUndefined();
    });
    
    

})