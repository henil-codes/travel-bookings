import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import cookie from '@fastify/cookie';
import { FastifyReply, FastifyRequest } from 'fastify'

export const authPlugin = fp(async (fastify, opts) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        fastify.log.error('JWT_SECRET is not defined in environment variables');
        throw new Error('JWT_SECRET is required for authentication');
    }

    // Register the cookie plugin
    fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET, 
        hook: 'onRequest',
    })

    // Register the JWT plugin
    fastify.register(fastifyJwt, {
        secret: secret,
        sign: {
            expiresIn: '7d',
        },
        cookie: {
            cookieName: 'token',
            signed: false,
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