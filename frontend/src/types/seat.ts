export type SeatStatus = 'available' | 'locked' | 'reserved' | 'sold';
export type SeatType = 'standard' | 'accessible' | 'women_only';

export interface Seat {
    id: string;
    tripId: string;
    seatType: SeatType;
    seatNumber: number;
    price: number; // paise
    status: SeatStatus;
    lockedByUserId: string | null;
    lockedUntil: string | null;
    version: number;
}