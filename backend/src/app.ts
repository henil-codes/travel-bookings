import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rawBody from 'fastify-raw-body';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { globalErrorHandler } from './core/errorHandler';
import { socketPlugin } from './core/socket';
import { authPlugin } from './core/auth';
import { seatRoutes } from './modules/seats/seat.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { bookingRoutes } from './modules/bookings/booking.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { tripRoutes } from './modules/trips/trip.routes';

export const buildApp = (): FastifyInstance => {

  const envToLogger = {
    development: {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
      }
    },
    production: true,
    test: false,
  }

  const app = Fastify({
    logger: envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,
  });

  // Plugins & Compilers
  app.register(cors, {
    origin: process.env.CORS_ORIGIN,
  });

  app.register(socketPlugin);
  app.register(authPlugin);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(globalErrorHandler);
  app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf-8',
    runFirst: true,
  })

  // Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(seatRoutes, { prefix: '/api/v1/seats' })
  app.register(tripRoutes, { prefix: '/api/v1/trips' })
  app.register(bookingRoutes, { prefix: '/api/v1/bookings' })
  app.register(paymentRoutes, { prefix: '/api/v1/payments' })

  return app;
};