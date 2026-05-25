import { Server as SocketIOServer} from 'socket.io';
import '@fastify/jwt'
import { FastifyRequest, FastifyReply } from 'fastify';
import { roleEnum } from '@/db/schema/users';

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            id: string;
            role: typeof roleEnum.enumValues[number];
        }
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        // Socket.IO server instance
        io: SocketIOServer;

        // Authentication middleware
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}