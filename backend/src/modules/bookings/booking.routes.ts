import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { BookingService } from './booking.service';
import { createBookingSchema, CreateBookingPayload } from '@/core/validation';

export const bookingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();
    // POST /bookings
    server.post('/', {
        preHandler: [fastify.authenticate],
        schema: {
            body: createBookingSchema,
            description: 'Create a booking fo a locked seat.',
            tags: ['Bookings']
        }
    },
    async (request, reply) => {
        const bookedBy = request.user.id;

        const { booking, passenger } = await BookingService.createBooking({
            ...request.body,
            bookedBy,
        })

        return reply.status(201).send({
            success: true,
            message: 'Booking created successfully',
            data: { booking, passenger },
        })
    }
)
}