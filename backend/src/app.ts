import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { globalErrorHandler } from './core/errorHandler';
import { socketPlugin } from './core/socket';
import { authPlugin } from './core/auth';
import { seatRoutes } from './modules/seats/seat.routes';
import { authRoutes } from './modules/auth/auth.routes';

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
    origin: 'http://localhost:5173', // Adjust this to your frontend URL
  });

  app.register(socketPlugin);
  app.register(authPlugin);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(globalErrorHandler);

  // Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(seatRoutes, { prefix: '/api/v1/seats' })

  return app;
};