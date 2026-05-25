import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';

export const authRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.post('/register', async (request, reply) => {
        const body = request.body as any;

        const user = await AuthService.register(body);

        const token = fastify.jwt.sign({
            id: user.id,
            role: user.role,
        })

        return reply.code(201).send({
            success: true,
            data: { user, token },
        })
    })

    fastify.post('/login', async (request, reply) => {
        const body = request.body as any;

        const user = await AuthService.login(body);

        const token = fastify.jwt.sign({
            id: user.id,
            role: user.role,
        })

        return reply.send({
            success: true,
            data: { user, token }
        })
    })

    // --- Helper route to verify JWT functionality, can be removed later ---
    fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        return reply.send({
            success: true,
            data: {
                message: 'You are securely authenticated!',
                jwtPayload: request.user,
            }
        })
    })
}