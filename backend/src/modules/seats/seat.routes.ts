import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { lockSeatSchema } from "../core/validation";
import { SeatService } from "./seat.service";
import { success } from "zod";
import { AppError } from "../core/errors";

export const seatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();

    server.post(
        '/lock',
        {
            schema: {
                body: lockSeatSchema,
                description: 'Locks a seat for 10 minutes to allow the user to complete the booking process.',
                tags: ['Seats'],
            }
        },
        async (request, reply) => {
            const { seatId, userId } = request.body;

            try {
                const lockedSeat = await SeatService.lockSeat(seatId, userId);

                // TODO: Emit event to notify other services about the seat lock

                return reply.status(200).send({
                    success: true,
                    message: 'Seat locked successfully',
                    data: lockedSeat,
                })
            } catch (error: unknown) {
                if (error instanceof AppError && error.message === 'SEAT_UNAVAILABLE') {
                    return reply.status(409).send({
                        success: false,
                        error: 'Seat is already taken or locked by another user',
                    })
                }

                if (error instanceof AppError && error.message === 'SEAT_NOT_FOUND') {
                    return reply.status(404).send({
                        success: false,
                        error: 'Seat not found',
                    })
                }

                request.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal Server Error while locking seat',
                })
            }
        }
    )
}