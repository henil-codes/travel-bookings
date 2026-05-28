import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from './errors'
import { roleEnum } from '@/db/schema/users'

type Role = typeof roleEnum.enumValues[number];

export const requireRole = (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        if(!roles.includes(request.user.role)) {
            throw new UnauthorizedError(`Access denied. Required role: ${roles.join(' or ')}`)
        }
    }
}