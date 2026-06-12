import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import fp from 'fastify-plugin';
import { appEmitter } from './emitter';

export const socketPlugin = fp(async (fastify, options) => {

    const io = new SocketIOServer(fastify.server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    })

    fastify.decorate('io', io);

    // Array to hold cleanup functions
    const subscriptions: Array<() => void> = [];

    io.on('connection', (socket) => {
        fastify.log.info(`New client connected: ${socket.id}`);

        socket.on('join:trip', (tripId: string) => {
            socket.join(`trip:${tripId}`);
            fastify.log.info(`Client ${socket.id} joined room: trip:${tripId}`);
        })

        socket.on('leave:trip', (tripId: string) => {
            socket.leave(`trip:${tripId}`);
            fastify.log.info(`Client ${socket.id} left room: trip:${tripId}`);
        })

        socket.on('disconnect', () => {
            fastify.log.info(`Client disconnected: ${socket.id}`);
        })
    })

    const subscribeToGlobalEvents = (eventName: string, handler: (payload: any) => void) => {
        appEmitter.on(eventName, handler);
        subscriptions.push(() => appEmitter.off(eventName, handler));
    }

    subscribeToGlobalEvents('seat:status_changed', (payload) => {
        io.to(`trip:${payload.tripId}`).emit('seat:status_changed', payload);
    });

    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    let pubClient: Redis | undefined;
    let subClient: Redis | undefined;

    if (!isTestEnv) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            fastify.log.error('REDIS_URL is not defined in environment variables');
            throw new Error('REDIS_URL is required for socket.io Redis adapter');
        }
        pubClient = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: true,
        })
        subClient = pubClient.duplicate();

        const handleRedisError = (error: Error) => fastify.log.error(error, 'Redis client error');
        pubClient.on('error', handleRedisError);
        subClient.on('error', handleRedisError);

        await pubClient.connect();
        await subClient.connect();

        io.adapter(createAdapter(pubClient, subClient));
        fastify.log.info('Redis Adapter connected successfully');
    } else {
        fastify.log.info('Test environment detected: Bypassing Redis and using in-memory Socket.IO adapter');
    }

    fastify.addHook('onClose', async (instance) => {
        instance.log.info('Closing Socket.IO server and Redis clients...');

        // Call all cleanup functions to unsubscribe from events
        subscriptions.forEach(cleanup => cleanup());

        try {
            await io.close();
            if (pubClient) pubClient.disconnect();
            if (subClient) subClient.disconnect();
        } catch (error) {
            instance.log.error({ error }, 'Error during Socket.IO server or Redis clients shutdown');
        }
    })
}, {
    name: 'socket.io-plugin'
})