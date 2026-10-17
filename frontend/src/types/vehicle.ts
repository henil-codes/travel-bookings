export const AMENITY_VALUES = [
    'ac',
    'chargin_point',
    'wifi',
    'reclining_seats',
    'blanket',
    'entertainment_system',
    'washroom',
] as const;

export type VehicleAmenity = typeof AMENITY_VALUES[number];

export interface Vehicle {
    id: string;
    vehicleType: string;
    vehicleNumber: string;
    capacity: number;
    amenities: VehicleAmenity[];
}