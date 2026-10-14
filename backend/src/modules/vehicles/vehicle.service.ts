import { db } from '@/db'
import { vehicles } from '@/db/schema/vehicles';
import type { VehicleFilterInput, CreateVehicleInput } from './vehicle.validation'

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

    static async createVehicle(input: CreateVehicleInput) {
        const [vehicle] = await db.insert(vehicles).values(input).returning();
        return vehicle;
    }
}