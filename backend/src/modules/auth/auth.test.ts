import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { AuthService } from './auth.service'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { buildApp } from '@/app'
import { FastifyInstance } from 'fastify'
import { ConflictError, UnauthorizedError } from '@/core/errors'

const baseUser = {
    name: 'Auth Test User',
    email: 'authtest@example.com',
    password: 'securePassword123!',
    countryCode: '+1',
    localPhone: '5551234567',
    accountStatus: 'active',
    role: 'customer',
    authProvider: 'local',
};

// --- Unit tests for AuthService ---
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

    it('should store a hashed password, not plaintest', async () => {
        const [userRecord] = await db.select().from(users).where(eq(users.email, baseUser.email));

        expect(userRecord.passwordHash).not.toBe(baseUser.password);
        const isHashed = await bcrypt.compare(baseUser.password, userRecord.passwordHash!);
        expect(isHashed).toBe(true);
    })

    it('should throw ConflictError when email is already registered', async () => {
        await expect(AuthService.register(baseUser)).rejects.toThrow(ConflictError);
    })

    // ---------------------------------

    describe('AuthService - login()', () => {
        let localUserId: string;
        let googleUserId: string;

        beforeAll(async () => {
            const passwordHash = await bcrypt.hash(baseUser.password, 10);

            const [localUser] = await db.insert(users).values({
                name: 'Local User',
                email: 'localuser@example.com',
                countryCode: '+1',
                localPhone: '9999999999',
                passwordHash,
                authProvider: 'local',
                accountStatus: 'active',
            }).returning();
            localUserId = localUser.id;

            const [googleUser] = await db.insert(users).values({
                name: 'Google User',
                email: 'googleuser@example.com',
                countryCode: '+1',
                localPhone: '8888888888',
                passwordHash: null,
                authProvider: 'google',
                accountStatus: 'active',
            }).returning();
            googleUserId = googleUser.id;
        }, 15000);

        afterAll(async () => {
            await db.delete(users).where(eq(users.id, localUserId));
            await db.delete(users).where(eq(users.id, googleUserId));
        })

        it('should return safe user without passwordHash on valid credentials', async () => {
            const result = await AuthService.login({
                email: 'localuser@example.com',
                password: baseUser.password,
            })

            expect(result.id).toBe(localUserId);
            expect(result.email).toBe('localuser@example.com');
            expect((result as any).passwordHash).toBeUndefined();
        })

        it('should throw UnauthorizedError for wrong password', async () => {
            await expect(AuthService.login({
                email: 'localuser@example.com',
                password: 'WrongPassword!',
            })).rejects.toThrow(UnauthorizedError);
        })

        it('should use vague error message for wrong password (security)', async () => {
            await expect(AuthService.login({
                email: 'localuser@example.com',
                password: 'WrongPassword!',
            })).rejects.toThrow('Invalid email or password');
        })

        it('should throw UnauthorizedError for non-existent email', async () => {
            await expect(AuthService.login({
                email: 'ghost@example.com',
                password: baseUser.password,
            })).rejects.toThrow(UnauthorizedError);
        })

        it('should throw UnauthorizedError when google user tries to login with password', async () => {
            await expect(AuthService.login({
                email: 'googleuser@example.com',
                password: baseUser.password,
            })).rejects.toThrow(UnauthorizedError);
        })
    })

    // --- Integration tests - HTTP endpoints + JWT ---
    describe('Auth Routes - /api/v1/auth', () => {
        let app: FastifyInstance;
        let serverUrl: string;
        let registeredUserId: string;

        const routeUser = {
            name: 'Route Test User',
            email: 'routetest@example.com',
            password: 'RoutePass456!',
            countryCode: '+1',
            localPhone: '7777777777',
            accountStatus: 'active',
            role: 'customer',
            authProvider: 'local',
        }

        beforeAll(async () => {
            app = buildApp();
            await app.listen({ port: 0, host: '127.0.0.1' });
            const address = app.server.address();
            if (typeof address === 'string' || !address) {
                throw new Error('Failed to get server address');
            }

            serverUrl = `http://127.0.0.1:${address.port}`;
        }, 15000);

        afterAll(async () => {
            if (registeredUserId) {
                await db.delete(users).where(eq(users.id, registeredUserId));
            }
            await app.close();
        })

        // --- POST /register ---
        it('POST /register should return 201 with user and JWT token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routeUser),
            })

            expect(response.status).toBe(201);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.data.token).toBeDefined();
            expect(body.data.user.email).toBe(routeUser.email);
            expect((body.data.user as any).passwordHash).toBeUndefined();

            registeredUserId = body.data.user.id;
        })

        it('POST /register should return 409 if duplicate email', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routeUser),
            })

            expect(response.status).toBe(409);
            const body = await response.json();
            expect(body.success).toBe(false);
        })

        // --- POST /login ---

        it('POST /login should return 200 with user and JWT token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: routeUser.email,
                    password: routeUser.password,
                })
            })

            expect(response.status).toBe(200);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.data.token).toBeDefined();
            expect(body.data.user.email).toBe(routeUser.email);
            expect((body.data.user as any).passwordHash).toBeUndefined();
        })

        it('POST /login should return 401 for wrong password', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: routeUser.email,
                    password: 'wrongpassword',
                })
            })

            expect(response.status).toBe(401);
            const body = await response.json();
            expect(body.success).toBe(false);
        })

        // --- GET /me ---
        it('GET /me should return 401 with no token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/me`);
            expect(response.status).toBe(401);
        })

        it('GET /me should return user JWT payload with valid token', async () => {
            const loginResponse = await fetch(`${serverUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: routeUser.email,
                    password: routeUser.password,
                })
            })

            const { data } = await loginResponse.json();
            const token = data.token;

            const meResponse = await fetch(`${serverUrl}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            expect(meResponse.status).toBe(200);
            const body = await meResponse.json();

            expect(body.success).toBe(true);
            expect(body.data.jwtPayload.id).toBe(registeredUserId);
            expect(body.data.jwtPayload.role).toBe('customer');
        })

        it('GET /me should return 401 with a tampered token', async () => {
            const response = await fetch(`${serverUrl}/api/v1/auth/me`, {
                headers: { Authorization: 'Bearer tampered.jwt.token' },
            })

            expect(response.status).toBe(401);
        })
    })




})