import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq, and } from 'drizzle-orm'
import type { UserFilterInput } from './user.validation'

export class UserService {
    static async listUsers(filters: UserFilterInput) {
        const conditions = [];

        if (filters.role) {
            conditions.push(eq(users.role, filters.role));
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
    
}