import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { io as Client, Socket } from 'socket.io-client'
import { buildApp } from '../app';
import crypto from 'crypto';
// import { db } from '../db';
// import { seats } from '../db/schema/seats';
import { AppError } from '../core/errors';

describe('Seat WebSocket Integration', () => {
    let app: FastifyInstance;
    let clientSocket: Socket;
    let serverUrl: string;

    beforeAll(async () => {
        app = buildApp();
        await app.listen({ port: 0, host: '127.0.0.1' });

        const address = app.server.address();
        if (typeof address === 'string' || !address) {
            throw new AppError('Failed to start server for testing', 500, false);
        }

        serverUrl = `http://127.0.0.1:${address.port}`;

        clientSocket = Client(serverUrl);

        await new Promise<void>((resolve) => {
            clientSocket.on('connect', () => {
                resolve();
            })
        })
    })

    afterAll(async () => {
        clientSocket.close();
        await app.close();
    })

    it('should emit seat:status_changed event when a seat is locked', async () => {
        const testSeatId = crypto.randomUUID();
        const testUserId = crypto.randomUUID();

        const socketEventPromise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new AppError('WebSocket event timed out', 500, false));
            }, 3000);

            clientSocket.on('seat:status_changed', (data) => {
                clearTimeout(timer);
                resolve(data);
            })
        })

        const response = await app.inject({
            method: 'POST',
            url: 'api/v1/seats/lock',
            payload: {
                seatId: testSeatId,
                userId: testUserId,
            }
        })

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.success).toBe(true);

        const socketData = await socketEventPromise as any;

        expect(socketData).toBeDefined();
        expect(socketData.seatId).toBe(testSeatId);
        expect(socketData.status).toBe('locked');
        expect(socketData.lockedUntil).toBeDefined();
    })
})