import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
// import { eventRouts } from './modules/booking-engine/routes/events';
// import { seatRouts } from './modules/booking-engine/routes/seats';

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
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
};
