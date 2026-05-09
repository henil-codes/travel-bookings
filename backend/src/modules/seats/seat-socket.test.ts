/* import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { io as Client, Socket } from 'socket.io-client';
import { buildApp } from '@/app';
import crypto from 'crypto';
import { AppError } from '@/core/errors';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { db } from '@/db';

describe('Seat WebSocket Integration', () => {
  let app: FastifyInstance;
  let clientSocket: Socket;
  let serverUrl: string;
  let testTripId: string;
  let testSeatId: string;

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
      });
    });

    const [trip] = await db
      .insert(trips)
      .values({
        name: 'Toronto to Montreal Express',
        startLocation: 'Toronto',
        endLocation: 'Montreal',
        departureTime: new Date(Date.now() + 86400000), // 1 day
        arrivalTime: new Date(Date.now() + 104400000), // 1 day + 5 hours
        capacity: 40,
      })
      .returning();
    testTripId = trip.id;

    const [seat] = await db
      .insert(seats)
      .values({
        tripId: testTripId,
        seatNumber: 13,
        price: '45.00',
        status: 'available',
      })
      .returning();
    testSeatId = seat.id;
  });

  afterAll(async () => {
    clientSocket.close();
    // await db.delete(seats).where(eq(seats.id, testSeatId));
    // await db.delete(trips).where(eq(trips.id, testTripId));
    await app.close();
  });

  it('should emit seat:status_changed event when a seat is locked', async () => {
    const testUserId = crypto.randomUUID();

    const socketEventPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new AppError('WebSocket event timed out', 500, false));
      }, 3000);

      clientSocket.on('seat:status_changed', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const response = await app.inject({
      method: 'POST',
      url: 'api/v1/seats/lock',
      payload: {
        seatId: testSeatId,
        userId: testUserId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const socketData = (await socketEventPromise) as any;

    expect(socketData).toBeDefined();
    expect(socketData.seatId).toBe(testSeatId);
    expect(socketData.status).toBe('locked');
    expect(socketData.lockedUntil).toBeDefined();
  });
});
 */