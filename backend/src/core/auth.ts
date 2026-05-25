import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyReply, FastifyRequest } from 'fastify'

export const authPlugin = fp(async (fastify, opts) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        fastify.log.error('JWT_SECRET is not defined in environment variables');
    }

    // Register the JWT plugin
    fastify.register(fastifyJwt, {
        secret: secret || 'default-secret',
        sign: {
            expiresIn: '7d',
        }
    })

    // Protection middleware
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (error) {
            reply.code(401).send({
                success: false,
                error: 'Unauthorized',
                message: 'Missing or invalid authentication token',
            });
        }
    })
}, {
    name: 'auth-plugin'
})