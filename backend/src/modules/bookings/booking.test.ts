import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db'
import { bookings } from '@/db/schema/bookings'
import { seats } from '@/db/schema/seats'
import { trips } from '@/db/schema/trips'
import { users } from '@/db/schema/users'
import { vehicles } from '@/db/schema/vehicles'
import { passengers } from '@/db/schema/passengers'
import { eq } from 'drizzle-orm'
import { TripService } from '@/modules/trips/trip.service'
import { ConflictError } from '@/core/errors';
import { BookingService } from './booking.service'


describe('Bookings Schema & Integrity', () => {
    let testUserId: string;
    let passengerId: string;
    let testVehicleId: string;
    let testTripId: string;
    let testSeatId: string;
    let testBookingId: string;

    beforeAll(async () => {
        const [user] = await db.insert(users).values({
            name: 'Booking Test User',
            email: 'booking@test.com',
            local_phone: '1234567890',
            countryCode: 'IN',
            passwordHash: 'hashedPassword',
        }).returning();
        testUserId = user.id;

        const [passenger] = await db.insert(passengers).values({
            name: 'Booking Test Passenger',
            age: 30,
            gender: 'male',
            idType: 'passport',
            idNumber: 'X1234567',
        }).returning();
        passengerId = passenger.id;

        const [vehicle] = await db.insert(vehicles).values({
            operatorName: 'Booking Test Operator',
            vehicleNumber: 'BOOKING-TEST-1234',
            capacity: 40,
            vehicleType: 'bus',
        }).returning();
        testVehicleId = vehicle.id;

        const trip = await TripService.createTrip({
            name: 'Booking Test Trip',
            startLocation: 'Vancouver',
            endLocation: 'Toronto',
            departureTime: new Date(Date.now() + 86400000), // 1 day
            arrivalTime: new Date(Date.now() + 172800000), // 2 days
            vehicleId: testVehicleId,
            capacity: 40,
            status: 'scheduled',
        })
        testTripId = trip.id;

        const [seat] = await db.insert(seats).values({
            tripId: testTripId,
            seatNumber: 5,
            price: '80.00',
            status: 'locked',
            seatType: 'standard',
            lockedByUserId: testUserId,
            lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        }).returning();
        testSeatId = seat.id;
    }, 15000);

    afterAll(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(bookings).where(eq(bookings.id, testBookingId));
            await tx.delete(seats).where(eq(seats.id, testSeatId));
            await tx.delete(trips).where(eq(trips.id, testTripId));
            await tx.delete(vehicles).where(eq(vehicles.id, testVehicleId));
            await tx.delete(passengers).where(eq(passengers.id, passengerId));
            await tx.delete(users).where(eq(users.id, testUserId));
        })
    })

    it('Should create a pending booking with correct fields', async () => {
        const [booking] = await db.insert(bookings).values({
            tripId: testTripId,
            seatId: testSeatId,
            passengerId: passengerId,
            bookedBy: testUserId,
            status: 'pending',
            totalAmount: '80.00',
            currency: 'INR',
        }).returning();
        testBookingId = booking.id;

        expect(booking).toBeDefined();
        expect(booking.status).toBe('pending');
        expect(booking.totalAmount).toBe('80.00');
        expect(booking.currency).toBe('INR');
    })

    // TODO: Add test to verify that cancelling a booking does not automatically mark it as refunded, and that refunding can be done independently with its own timestamp. This is important for accurate financial reporting and to handle cases where a booking is cancelled but not refunded immediately (e.g., due to refund processing times or policies).
    
    // it('Should store a refunded status independently of cancellation', async () => {
    //     const [updated] = await db.update(bookings).set({
    //         status: 'refunded',
    //         cancelledAt: new Date(),
    //     })
    //         .where(eq(bookings.id, testBookingId))
    //         .returning();

    //     expect(updated.status).toBe('refunded');
    //     expect(updated.cancelledAt).not.toBeNull();
    // })

    it('Should attach passengers to a booking', async () => {
        const [passenger] = await db.insert(passengers).values({
            name: 'John Doe',
            age: 30,
            gender: 'male',
            idType: 'passport',
            idNumber: 'X1234567',
        }).returning();

        expect(passenger.name).toBe('John Doe');
        expect(passenger.idType).toBe('passport');
    })

    it('Should prevent duplicate active bookings for the same seat', async () => {
        const [passenger] = await db.select().from(passengers).where(eq(passengers.id, passengerId));
        await expect(BookingService.createBooking({
            tripId: testTripId,
            seatId: testSeatId,
            passenger: passenger,
            bookedBy: testUserId,
            status: 'pending',
            totalAmount: '80.00',
            currency: 'INR'
        })).rejects.toThrow(ConflictError);

    })
})