import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { loginSchema, registerSchema } from './auth.validation';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();

    server.post('/register', {
        schema: {
            body: registerSchema,
        }
    }, async (request, reply) => {
        const user = await AuthService.register(request.body);

        const token = fastify.jwt.sign({
            id: user.id,
            role: user.role,
        })

        return reply.code(201).send({
            success: true,
            data: { user, token },
        })
    })

    server.post('/login', {
        schema: {
            body: loginSchema,
        }
    }, async (request, reply) => {
        const user = await AuthService.login(request.body);

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
    server.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        return reply.send({
            success: true,
            data: {
                message: 'You are securely authenticated!',
                jwtPayload: request.user,
            }
        })
    })
}