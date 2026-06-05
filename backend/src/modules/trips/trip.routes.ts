import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod';
import { TripService } from './trip.service'
import { requireRole } from '@/core/guards'
import {
    createTripSchema,
    updateTripSchema,
    updateTripStatusSchema,
    tripFilterSchema,
} from './trip.validation'

export const tripRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();

    // GET / - public, with filters
    server.get('/', {
        schema: {
            description: 'Returns available trips with optional filters.',
            tags: ['trips'],
            querystring: tripFilterSchema,
        }
    },
        async (request, reply) => {
            const trips = await TripService.listTrips(request.query);

            return reply.status(200).send({
                success: true,
                data: trips,
            })
        }
    );

    // GET /:id - public
    server.get('/:id', {
        schema: {
            description: 'Returns available trips with optional filters.',
            tags: ['trips'],
            params: z.object({ id: z.string().uuid() }),
        }
    },
        async (request, reply) => {
            const trip = await TripService.getTripById(request.params.id)

            return reply.status(200).send({
                success: true,
                data: trip,
            })
        }
    )

    // GET /:id/seats - public
    server.get('/:id/seats', {
        schema: {
            description: 'Returns the seat map for a trip grouped by status.',
            tags: ['trips'],
            params: z.object({ id: z.string().uuid() }),
        }
    },
        async (request, reply) => {
            const seatMap = await TripService.getSeatMap(request.params.id);

            return reply.status(200).send({
                success: true,
                data: seatMap,
            })
        }
    )

    // POST / - admin + operator
    server.post('/', {
        preHandler: [fastify.authenticate, requireRole('admin', 'operator')],
        schema: {
            body: createTripSchema,
            description: 'Creates a new trip. Admin or operator only.',
            tags: ['trips'],
        }
    }, async (request, reply) => {
        const trip = await TripService.createTrip(request.body, request.user);

        return reply.status(201).send({
            success: true,
            message: 'Trip created successfully',
            data: trip,
        })
    })

    // PATCH /:id - admin + operator
    server.patch('/:id', {
        preHandler: [fastify.authenticate, requireRole('admin', 'operator')],
        schema: {
            body: updateTripSchema,
            params: z.object({ id: z.string().uuid() }),
            description: 'Updates trip details. Admin or operator only.',
            tags: ['trips'],
        }
    }, async (request, reply) => {
        const trip = await TripService.updateTrip(request.params.id, request.body, request.user);

        return reply.status(200).send({
            success: true,
            message: 'Trip updated successfully',
            data: trip,
        })
    })

    // PATCH /:id/status - admin + operator
    server.patch('/:id/status', {
        preHandler: [fastify.authenticate, requireRole('admin', 'operator')],
        schema: {
            body: updateTripStatusSchema,
            params: z.object({ id: z.string().uuid() }),
            description: 'Updates trip status. Admin or operator only.',
            tags: ['trips'],
        }
    }, async (request, reply) => {
        const trip = await TripService.updateTripStatus(request.params.id, request.body, request.user);

        return reply.status(200).send({
            success: true,
            message: 'Trip status updated successfully',
            data: trip,
        })
    })


    // DELETE /:id - admin only
    server.delete('/:id', {
        preHandler: [fastify.authenticate, requireRole('admin')],
        schema: {
            params: z.object({ id: z.string().uuid() }),
            description: 'Deletes a trip. Admin only.',
            tags: ['trips'],
        }
    }, async (request, reply) => {
        await TripService.deleteTrip(request.params.id, request.user);

        return reply.status(200).send({
            success: true,
            message: 'Trip deleted successfully',
        })
    })
}
