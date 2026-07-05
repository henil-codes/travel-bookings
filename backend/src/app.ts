import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rawBody from 'fastify-raw-body';
import fastifyOauth2 from '@fastify/oauth2';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { globalErrorHandler } from './core/errorHandler';
import { socketPlugin } from './core/socket';
import { authPlugin } from './core/auth';
import cookie from '@fastify/cookie';
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
      },
    },
    production: true,
    test: false,
  };

  const app = Fastify({
    logger:
      envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,

  });

  const rawCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!rawCallbackUrl) {
    throw new Error('GOOGLE_CALLBACK_URL is not defined');
  }

  const googleCallbackUrl = rawCallbackUrl.replace(/['"']/g, '').trim();

  // Plugins & Compilers
  app.register(cors, {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.register(cookie);
  app.register(socketPlugin);
  app.register(authPlugin);
  app.register(fastifyOauth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/api/v1/auth/google',
    callbackUri: googleCallbackUrl,

    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    }
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(globalErrorHandler);
  app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf-8',
    runFirst: true,
  });

  // Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(seatRoutes, { prefix: '/api/v1/seats' });
  app.register(tripRoutes, { prefix: '/api/v1/trips' });
  app.register(bookingRoutes, { prefix: '/api/v1/bookings' });
  app.register(paymentRoutes, { prefix: '/api/v1/payments' });

  return app;
};
