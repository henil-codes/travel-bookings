import type { VehicleAmenity } from './vehicle';

export type TripStatus = 'scheduled' | 'cancelled' | 'completed' | 'boarding' | 'departed';

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

export interface TripStats {
    totalBookings: number;
    activeBookings: number;
    grossRevenue: number;
    refundInitiated: number;
    refundSettled: number;
}

export interface TripWithStats extends Trip {
    stats: TripStats;
}

export interface AdminTripFilter extends TripFilter {
    status?: TripStatus;
    driverId?: string;
    startLocation?: string;
    endLocation?: string;
    date?: string;
    page?: number;
    limit?: number;
}

export interface TripListItem extends Trip {
    fromPrice: number | null;
    availableSeats: number;
    amenities: VehicleAmenity[];
}