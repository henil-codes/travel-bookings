import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { io as Client, Socket } from 'socket.io-client';
import { buildApp } from '@/app';
import { db } from '@/db';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { vehicles } from '@/db/schema/vehicles';
import { NotFoundError, ConflictError, AppError } from '@/core/errors';
import { eq } from 'drizzle-orm';
import { TripService } from '@/modules/trips/trip.service';
import { email } from 'zod';

describe('Seat WebSocket Integration', () => {
  let app: FastifyInstance;
  let testAuthToken: string;
  let clientSocket: Socket;
  let serverUrl: string;
  let testTripId: string;
  let testSeatId: string;
  let testUserId: string;
  let testVehicleId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const address = app.server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('Failed to get server address');
    }
    serverUrl = `http://127.0.0.1:${address.port}`;

    await new Promise<void>((resolve, reject) => {
      clientSocket = Client(serverUrl);
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
    });

    await fetch(`${serverUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'WebSocket Test User',
        email: 'websocket@test.com',
        password: 'websocket',
        countryCode: '+91',
        localPhone: '1234567890',
        authProvider: 'local',
        accountStatus: 'active',
      }),
    });

    // Simulate login to get auth token
    const loginResponse = await fetch(`${serverUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'websocket@test.com',
        password: 'websocket',
      }),
    });
    const loginData = await loginResponse.json();
    testAuthToken = loginData.data.token;
    testUserId = loginData.data.user.id;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: 'WS-TEST-1234',
        capacity: 40,
        vehicleType: 'bus',
      })
      .returning();
    testVehicleId = vehicle.id;

    const trip = await TripService.createTrip(
      {
        name: 'WebSocket Test Trip',
        startLocation: 'Vancouver',
        endLocation: 'Toronto',
        departureTime: new Date(Date.now() + 86400000).toISOString(), // 1 day
        arrivalTime: new Date(Date.now() + 104400000).toISOString(), // 1 day + 5 hours
        vehicleId: testVehicleId,
        capacity: 40,
        driverId: testUserId,
        basePrice: 5000,
      },
      { id: testUserId, role: 'manager' }
    );
    testTripId = trip.id;

    const seatMap = await TripService.getSeatMap(testTripId);
    testSeatId = seatMap.available[0].id;
  }, 15000);

  afterAll(async () => {
    clientSocket?.close();

    await db.transaction(async (tx) => {
      await tx.delete(seats).where(eq(seats.tripId, testTripId));
      await tx.delete(trips).where(eq(trips.id, testTripId));
      await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
      await tx.delete(users).where(eq(users.id, testUserId));
    });

    if (app) {
      await app.close();
    }
  });

  it('Should emit seat:status_changed when a seat is locked', async () => {
    clientSocket.emit('join:trip', testTripId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const socketEventPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('WebSocket event timeout after 3s')),
        3000
      );

      clientSocket.on('seat:status_changed', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAuthToken}`,
      },
      body: JSON.stringify({
        seatId: testSeatId,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    const socketData = await socketEventPromise;
    expect(socketData.seatId).toBe(testSeatId);
    expect(socketData.status).toBe('locked');
    expect(socketData.lockedUntil).toBeDefined();
  });

  it('Should not emit seat:status_changed when locking an already-locked seat', async () => {
    let eventFired = false;
    clientSocket.on('seat:status_changed', () => {
      eventFired = true;
    });

    const response = await fetch(`${serverUrl}/api/v1/seats/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAuthToken}`,
      },
      body: JSON.stringify({
        seatId: testSeatId,
      }),
    });

    expect(response.status).toBe(409);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(eventFired).toBe(false);
  });
});
