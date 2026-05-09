import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import fp from 'fastify-plugin';
import { appEmitter } from './emitter';

export const socketPlugin = fp(async (fastify, options) => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
    });
    const subClient = pubClient.duplicate();

    const handleRedisError = (error: Error) => {
        fastify.log.error(error, 'Redis client error');
    }

    pubClient.on('error', handleRedisError);
    subClient.on('error', handleRedisError);

    const safeConnect = async (client: Redis, name: 'Pub' | 'Sub') => {
        const status = client.status;

        if (status === 'ready') {
            fastify.log.info(`Redis ${name} already connected/ready`)
            return;
        }

        if (status === 'connecting') {
            fastify.log.info(`Redis ${name} is already connecting, waiting for it to be ready...`);
            return;
        }

        try {
            await client.connect();
            fastify.log.info(`Redis ${name} connected successfully!`);
        } catch (error) {
            fastify.log.error({ error }, `Failed to connect Redis ${name}`);
            throw error;
        }
    }

    await Promise.all([
        safeConnect(pubClient, 'Pub'),
        safeConnect(subClient, 'Sub'),
    ])

    const io = new SocketIOServer(fastify.server, {
        cors: {
            origin: process.env.CORS_ORIGIN ||'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    })

    io.adapter(createAdapter(pubClient, subClient));

    fastify.decorate('io', io);

    appEmitter.on('seat:status_changed', (payload) => {
        io.emit('seat:status_changed', payload);
    });

    fastify.addHook('onClose', async (instance) => {
        instance.log.info('Closing Socket.IO server and Redis clients...');
        try {
            await io.close();
            await pubClient.quit();
            await subClient.quit();
        } catch (error) {
            instance.log.error({ error }, 'Error during Socket.IO server or Redis clients shutdown');
        }
    })
}, {
    name: 'socket.io-plugin'
})