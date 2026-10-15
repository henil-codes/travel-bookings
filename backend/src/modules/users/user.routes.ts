import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { UserService } from './user.service'
import { requireRole } from '@/core/guards'
import { userFilterSchema, updateUserStatusSchema } from './user.validation'
import { z } from 'zod';

export const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();

    // GET / - admin + manager
    server.get('/', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            description: 'Lists users, optionally filtered by role. Admin or manager only.',
            tags: ['Users', 'Admin'],
            querystring: userFilterSchema,
        }
    }, async (request, reply) => {
        const result = await UserService.listUsers(request.query);

        return reply.status(200).send({
            success: true,
            data: result,
        })
    })

    // PATCH /:id/status - admin
    server.patch('/:id/status', {
        preHandler: [fastify.authenticate, requireRole('admin')],
        schema: {
            description: 'Updates the account status of a user. Admin only.',
            tags: ['Users', 'Admin'],
            params: z.object({ id: z.string().uuid() }),
            body: updateUserStatusSchema,
        }
    }, async (request, reply) => {
        const user = await UserService.updateAccountStatus(request.params.id, request.body);

        return reply.status(200).send({
            success: true,
            message: 'User account status updated successfully',
            data: user,
        })
    })
}