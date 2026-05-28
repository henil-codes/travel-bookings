import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { lockSeatSchema } from '../../core/validation';
import { SeatService } from './seat.service';
import { AppError } from '../../core/errors';

export const seatRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.post(
    '/lock',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: lockSeatSchema,
        description:
          'Locks a seat for 10 minutes to allow the user to complete the booking process.',
        tags: ['Seats'],
      },
    },
    async (request, reply) => {
      const { seatId } = request.body;
      const userId = request.user.id;

      const lockedSeat = await SeatService.lockSeat(seatId, userId);

      return reply.status(200).send({
        success: true,
        message: 'Seat locked successfully',
        data: lockedSeat,
      });
    }
  );

  server.get('/', async (request, reply) => {
    return reply.status(200).send({
      success: true,
      message: 'Seat routes are working',
    });
  });
};
