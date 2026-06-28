export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type Gender = 'male' | 'female' | 'other';
export type IdType = 'aadhar' | 'pan' | 'passport' | 'driving_license';

export interface PassengerInput {
    name: string;
    age: number;
    gender: Gender;
    isAccessibilityRequired: boolean;
    idType: IdType;
    idNumber: string;
}

export interface Passenger extends PassengerInput {
    id: string;
    createdAt: string;
    updatedAt: string;
}

export interface Booking {
    id: string;
    tripId: string;
    seatId: string;
    passengerId: string;
    bookedBy: string;
    totalAmount: number; // paise
    currency: string;
    status: PaymentStatus;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
    cancelledAt: string | null;
}

export interface BookingWithDetails extends Booking {
    trip: {
        name: string;
        startLocation: string;
        endLocation: string;
        departureTime: string;
        arrivalTime: string;
    };
    seat: {
        seatNumber: string;
        seatType: string;
    };
    passenger: Passenger;
}