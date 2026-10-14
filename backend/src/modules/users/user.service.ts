import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq, and } from 'drizzle-orm'
import type { UserFilterInput, UpdateUserStatusInput } from './user.validation'
import { NotFoundError } from '@/core/errors'

export class UserService {
    static async listUsers(filters: UserFilterInput) {
        const conditions = [];

        if (filters.role) {
            conditions.push(eq(users.role, filters.role));
        }
        if (filters.accountStatus) {
            conditions.push(eq(users.accountStatus, filters.accountStatus));
        }

        const offset = (filters.page - 1) * filters.limit;

        return await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                accountStatus: users.accountStatus,
            })
            .from(users)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .limit(filters.limit)
            .offset(offset)
            .orderBy(users.name);
    }

    static async updateAccountStatus(userId: string, input: UpdateUserStatusInput) {
        const [user] = await db
            .update(users)
            .set({ accountStatus: input.accountStatus, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();

        if (!user) {
            throw new NotFoundError('User');
        }

        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }

}