export type TripStatus = 'pending' | 'cancelled' | 'completed' | 'boarding' | 'departed';

export interface Trip {
    id: string;
    name: string;
    vehicleId: string;
    driverId: string;
    startLocation: string;
    endLocation: string;
    departureTime: string;
    arrivalTime: string;
    capacity: number;
    status: TripStatus;
    createdAt: string;
}

export interface TripFilter {
    startLocation?: string;
    endLocation?: string;
    date?: string;
    status?: TripStatus;
    page?: number;
    limit?: number;
}
