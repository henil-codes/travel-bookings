import {db} from '@/db'
import { trips, tripStatusEnum } from '@/db/schema/trips'
import { ConflictError } from '@/core/errors'

type TripStatus = (typeof tripStatusEnum.enumValues)[number];

export class TripService {
    static async createTrip(tripData: {
        name: string;
        startLocation: string;
        endLocation: string;
        departureTime: Date;
        arrivalTime: Date;
        vehicleId: string;
        capacity: number;
        status?: TripStatus;
    }) {
        if(tripData.arrivalTime <= tripData.departureTime) {
            throw new ConflictError('Arrival time must be after departure time');
        }

        const [trip] = await db.insert(trips).values(tripData).returning();
        return trip;
    }

}