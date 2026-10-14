import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { VehicleService } from './vehicle.service'
import { requireRole } from '@/core/guards'
import { vehicleFilterSchema, createVehicleSchema } from './vehicle.validation'

export const vehicleRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();

    // GET / - admin + manager
    server.get('/', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            description: 'Lists vehicles for admin pickers. Admin or manager only.',
            tags: ['Vehicles', 'Admin'],
            querystring: vehicleFilterSchema,
        }
    }, async (request, reply) => {
        const result = await VehicleService.listVehicles(request.query);

        return reply.status(200).send({
            success: true,
            data: result,
        })
    })

    // POST / - admin + manager
    server.post('/', {
        preHandler: [fastify.authenticate, requireRole('admin', 'manager')],
        schema: {
            description: 'Creates a new vehicle. Admin or manager only.',
            tags: ['Vehicles', 'Admin'],
            body: createVehicleSchema,
        }
    }, async (request, reply) => {
        const vehicle = await VehicleService.createVehicle(request.body);

        return reply.status(201).send({
            success: true,
            message: 'Vehicle created successfully',
            data: vehicle,
        })
    })
}