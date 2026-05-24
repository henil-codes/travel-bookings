import { db } from '@/db'
import { bookings, paymentStatusEnum } from '@/db/schema/bookings'
import { seats } from '@/db/schema/seats'
import { users } from '@/db/schema/users'
import { passengers } from '@/db/schema/passengers'
import { genderEnum, idTypeEnum } from '@/db/schema/passengers'
import { NotFoundError, ConflictError, UnauthorizedError } from '@/core/errors'
import { eq, and, not, inArray } from 'drizzle-orm'

interface PassengerInput {
    name: string;
    age: number;
    gender: typeof genderEnum.enumValues[number];
    isAccessibilityRequired?: boolean;
    idType: typeof idTypeEnum.enumValues[number];
    idNumber: string;
}

interface CreateBookingInput {
    tripId: string;
    seatId: string;
    passenger: PassengerInput;
    bookedBy: string;
    status: typeof paymentStatusEnum.enumValues[number];
    totalAmount: string;
    currency: string;

}

export class BookingService {
    static async createBooking(input: CreateBookingInput) {
        return await db.transaction(async (tx) => {

            const [user] = await tx.select().from(users).where(eq(users.id, input.bookedBy));

            if (!user) {
                throw new NotFoundError('User');
            }

            const [seat] = await tx.select().from(seats).where(eq(seats.id, input.seatId)).for('update')

            if (!seat) {
                throw new NotFoundError('Seat');
            }

            if (seat.status !== 'locked' || seat.lockedByUserId !== input.bookedBy) {
                throw new ConflictError('Seat is not locked by this user. Please lock the seat before booking.');
            }

            const [existingBooking] = await tx.select().from(bookings).where(and(eq(bookings.seatId, input.seatId), not(inArray(bookings.status, ['failed', 'refunded', 'cancelled']))));

            if (existingBooking) {
                throw new ConflictError('Seat is already booked');
            }

            if (seat.seatType === 'women_only' && input.passenger.gender !== 'female') {
                throw new ConflictError('This seat is reserved for female passengers only');
            }

            if (seat.seatType === 'accessible' && !input.passenger.isAccessibilityRequired) {
                throw new ConflictError('This seat is reserved for passengers requiring accessibility accommodations')
            }

            const totalAmount = seat.price;

            const [passenger] = await tx.insert(passengers).values({
                name: input.passenger.name,
                age: input.passenger.age,
                gender: input.passenger.gender,
                idNumber: input.passenger.idNumber,
                idType: input.passenger.idType,
                isAccessibilityRequired: input.passenger.isAccessibilityRequired
            }).returning();

            const [booking] = await tx.insert(bookings).values({
                tripId: input.tripId,
                seatId: input.seatId,
                bookedBy: input.bookedBy,
                passengerId: passenger.id,
                status: 'pending',
                totalAmount,
                currency: 'INR',
            }).returning();

            await tx
                .update(seats)
                .set({ status: 'reserved' })
                .where(eq(seats.id, input.seatId))

            return { booking, passenger };

        })
    }
}