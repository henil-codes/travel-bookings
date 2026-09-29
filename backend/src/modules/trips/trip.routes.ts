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
    adminTripFilterSchema
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

    // GET /admin - admin + manager, trips with aggregates
    server.get('/admin', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            description: 'Lists trips with booking and revenue aggregates. Admin or manger only.',
            tags: ['trips', 'Admin'],
            querystring: adminTripFilterSchema,
        }
    }, async (request, reply) => {
        const result = await TripService.listTripsForAdmin(request.query);

        return reply.status(200).send({
            success: true,
            data: result,
        })
    })

    // GET /locations - public, distinct cities used in any trip(for search autocomplete)
    server.get('/locations', {
        schema: {
            description: 'Returns distinct set of cities used as a start or end location across all trips.',
            tags: ['trips'],
        }
    }, async (request, reply) => {
        const locations = await TripService.listKnownLocations();

        return reply.status(200).send({
            success: true,
            data: locations,
        })
    })

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

    // GET /:id/stats - admin + manager
    server.get('/:id/stats', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            description: 'Returns booking and revenue aggregates for one trip. Admin or manger only.',
            tags: ['trips', 'Admin'],
            params: z.object({ id: z.string().uuid() }),
        }
    }, async (request, reply) => {
        const stats = await TripService.getTripStats(request.params.id);

        return reply.status(200).send({
            success: true,
            data: stats,
        })
    })

    // POST / - admin + manager
    server.post('/', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            body: createTripSchema,
            description: 'Creates a new trip. Admin or manager only.',
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

    // PATCH /:id - admin + manager
    server.patch('/:id', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            body: updateTripSchema,
            params: z.object({ id: z.string().uuid() }),
            description: 'Updates trip details. Admin or manager only.',
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

    // PATCH /:id/status - admin + manager
    server.patch('/:id/status', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager', 'driver')],
        schema: {
            body: updateTripStatusSchema,
            params: z.object({ id: z.string().uuid() }),
            description: 'Updates trip status. Admin or manager only.',
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
