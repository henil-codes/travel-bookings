import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { UserService } from './user.service'
import { requireRole } from '@/core/guards'
import { userFilterSchema } from './user.validation'

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
}