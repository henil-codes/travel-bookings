import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
// import { eventRouts } from './modules/booking-engine/routes/events';
// import { seatRouts } from './modules/booking-engine/routes/seats';

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'development',
  });

  app.register(cors, {
    origin: 'http://localhost:5173', // Adjust this to your frontend URL
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
};
