import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { BookingService } from './booking.service';
import { number, z } from 'zod';
import { paymentStatusEnum } from '@/db/schema/bookings'
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
                status: 'pending',
                totalAmount: '0.00',
                currency: 'INR',
            })

            return reply.status(201).send({
                success: true,
                message: 'Booking created successfully',
                data: { booking, passenger },
            })
        }
    );

    // GET / - list bookings
    // Customer: sees only their bookings
    // Operator: sees all bookings for their trips
    // Admin: sees all bookings

    server.get('/', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Returns bookings. Customers see their own; admins see all; operators see bookings for their trips.',
            tags: ['Bookings'],
            querystring: z.object({
                userId: z.string().uuid().optional(), // For admin to filter by user
                status: z.enum(paymentStatusEnum.enumValues).optional(),
                page: z.coerce.number().int().positive().default(1),
                limit: z.coerce.number().int().positive().max(100).default(20),
            })
        }
    },
        async (request, reply) => {
            const { userId, status, page, limit } = request.query;
            const requestingUser = request.user;

            const filterUserId = requestingUser.role === 'admin' ? userId : requestingUser.id;

            const result = await BookingService
        }
    )
}