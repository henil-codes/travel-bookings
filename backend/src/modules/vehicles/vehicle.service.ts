import { db } from '@/db'
import { vehicles } from '@/db/schema/vehicles';
import type { VehicleFilterInput } from './vehicle.validation'

export class VehicleService {
    static async listVehicles(filters: VehicleFilterInput) {
        const offset = (filters.page - 1) * filters.limit;

        return await db
            .select()
            .from(vehicles)
            .limit(filters.limit)
            .offset(offset)
            .orderBy(vehicles.vehicleNumber);
    }
}