import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { ConflictError, UnauthorizedError } from '@/core/errors'

export class AuthService {
    static async register(input: any) {
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
            local_phone: input.localPhone,
            passwordHash,
            authProvider: 'local',
        }).returning();

        const { passwordHash: _, ...safeUser } = newUser;
        return safeUser;
    }

    static async login(input: any) {
        const [user] = await db.select().from(users).where(eq(users.email, input.email));

        if(!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        if (user.authProvider !== 'local' || !user.passwordHash) {
            throw new UnauthorizedError(`Please login using your ${user.authProvider} account`);
        }

        const passwordValid = await bcrypt.compare(input.password, user.passwordHash);

        if (!passwordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }
}