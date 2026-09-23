import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { VehicleService } from './vehicle.service'
import { requireRole } from '@/core/guards'
import { vehicleFilterSchema } from './vehicle.validation'

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
}