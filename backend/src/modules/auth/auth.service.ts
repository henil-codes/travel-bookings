import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { ConflictError, UnauthorizedError } from '@/core/errors'
import { RegisterInput, LoginInput } from './auth.validation'

export class AuthService {
    static async register(input: RegisterInput) {
        try {
            const [existingUser] = await db.select().from(users).where(eq(users.email, input.email));

            if (existingUser) {
                throw new ConflictError('Email is already registered')
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(input.password, saltRounds);

            const [newUser] = await db.insert(users).values({
                name: input.name,
                email: input.email,
                countryCode: input.countryCode,
                localPhone: input.localPhone,
                passwordHash,
                authProvider: 'local',
                accountStatus: 'active',
            }).returning();

            const { passwordHash: _, ...safeUser } = newUser;
            return safeUser;
        } catch (error: any) {
            throw error;
        }
    }

    static async login(input: LoginInput) {
        const [user] = await db.select().from(users).where(eq(users.email, input.email));

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        if (user.authProvider !== 'local' || !user.passwordHash) {
            throw new UnauthorizedError(`Please login using your ${user.authProvider} account`);
        }

        if (user.accountStatus !== 'active') {
            throw new UnauthorizedError('Account is not active. Please contact support.');
        }

        const passwordValid = await bcrypt.compare(input.password, user.passwordHash);

        if (!passwordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }
}