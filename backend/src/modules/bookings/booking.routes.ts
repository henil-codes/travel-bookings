import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { BookingService } from './booking.service';
import { number, z } from 'zod';
import { paymentStatusEnum } from '@/db/schema/bookings'
import { BookingFilter, bookingFilterSchema, CreateBookingPayload, createBookingSchema, BookingParams, bookingParamsSchema, CancelBookingPayload, cancelBookingSchema } from './booking.validation';
import { UnauthorizedError } from '@/core/errors';
import { requireRole } from '@/core/guards';

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
            querystring: bookingFilterSchema, 
        }
    },
        async (request, reply) => {
            const { userId, status, page, limit } = request.query;
            const requestingUser = request.user;

            const filterUserId = requestingUser.role === 'admin' ? userId : requestingUser.id;

            const result = await BookingService.listBookings({
                userId: filterUserId,
                status,
                page,
                limit,
            })

            return reply.status(200).send({
                success: true,
                data: result,
            })
        }
    )

    server.get('/:id', { 
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Returns a single booking by ID.',
            tags: ['Bookings'],
            params: bookingParamsSchema,
        }
    }, async (request, reply) => {
        const booking = await BookingService.getBookingById(request.params.id);

        if (request.user.role !== 'admin' && booking.bookedBy !== request.user.id) {
            throw new UnauthorizedError('You do not have permission to this booking.')
        }
        
        return reply.status(200).send({
            success: true,
            data: booking,
        })
    })

    // GET /admin/all - admin-only: all bookings unfiltered
    server.get('/admin/all', {
        preHandler: [fastify.authenticate, requireRole('admin')],
        schema: {
            description: 'Admin only. Returns all bookings without filters.',
            tags: ['Bookings', 'Admin'],
            querystring: bookingFilterSchema,
        }
    }, async (request, reply) => {
        const { page, limit } = request.query;

        const result = await BookingService.listBookings({
            page,
            limit,
        })

        return reply.status(200).send({
            success: true,
            data: result,
        })
    })

    // POST /:id/cancel - cancel a booking 
    server.post('/:id/cancel', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Cancels a booking. Customers have a time-limited window.',
            tags: ['Bookings'],
            params: bookingParamsSchema,
            body: cancelBookingSchema,
        }
    }, async (request, reply) => {
        const booking = await BookingService.getBookingById(request.params.id);

        if (request.user.role !== 'admin') {
            if (booking.bookedBy !== request.user.id) {
                throw new UnauthorizedError('You do not have permission to cancel this booking.')
            }

            const CANCELLATION_WINDOW_MINUTES = 2 * 60 * 60 * 1000;
            const trip = await BookingService.getTripByBookingId(request.params.id);
            const timeUntilDeparture = new Date(trip.departureTime).getTime() - Date.now();
            
            if (timeUntilDeparture < CANCELLATION_WINDOW_MINUTES) {
                throw new UnauthorizedError('Cancellation window has passed. Bookings can only be cancelled up to 2 hours before departure.')
            }
        }

        const result = await BookingService.cancelBooking({
            bookingId: request.params.id,
            cancellationReason: request.body.cancellationReason,
        })

        return reply.status(200).send({
            success: true,
            message: 'Booking cancelled successfully',
            data: result,
        })
    })
}