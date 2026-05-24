import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import fp from 'fastify-plugin';
import { appEmitter } from './emitter';

export const socketPlugin = fp(async (fastify, options) => {
    // const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // const pubClient = new Redis(redisUrl, {
    //     maxRetriesPerRequest: null,
    //     enableReadyCheck: true,
    //     lazyConnect: true,
    // });
    // const subClient = pubClient.duplicate();

    // const handleRedisError = (error: Error) => {
    //     fastify.log.error(error, 'Redis client error');
    // }

    // pubClient.on('error', handleRedisError);
    // subClient.on('error', handleRedisError);

    // const safeConnect = async (client: Redis, name: 'Pub' | 'Sub') => {
    //     const status = client.status;

    //     if (status === 'ready') {
    //         fastify.log.info(`Redis ${name} already connected/ready`)
    //         return;
    //     }

    //     if (status === 'connecting') {
    //         fastify.log.info(`Redis ${name} is already connecting, waiting for it to be ready...`);
    //         return;
    //     }

    //     try {
    //         await client.connect();
    //         fastify.log.info(`Redis ${name} connected successfully!`);
    //     } catch (error) {
    //         fastify.log.error({ error }, `Failed to connect Redis ${name}`);
    //         throw error;
    //     }
    // }

    // await Promise.all([
    //     safeConnect(pubClient, 'Pub'),
    //     safeConnect(subClient, 'Sub'),
    // ])


    const io = new SocketIOServer(fastify.server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    })

    // io.adapter(createAdapter(pubClient, subClient));

    fastify.decorate('io', io);

    // Array to hold cleanup functions
    const subscriptions: Array<() => void> = [];

    const subscribeToGlobalEvents = (eventName: string, handler: (payload: any) => void) => {
        appEmitter.on(eventName, handler);
        subscriptions.push(() => appEmitter.off(eventName, handler));
    }

    subscribeToGlobalEvents('seat:status_changed', (payload) => {
        io.emit('seat:status_changed', payload);
    })

    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    let pubClient: Redis | undefined;
    let subClient: Redis | undefined;

    if(!isTestEnv) {
        const redisUrl = process.env.REDIS_URL;
        if(!redisUrl) {
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
            if(pubClient) pubClient.disconnect();
            if(subClient) subClient.disconnect();
        } catch (error) {
            instance.log.error({ error }, 'Error during Socket.IO server or Redis clients shutdown');
        }
    })
}, {
    name: 'socket.io-plugin'
})