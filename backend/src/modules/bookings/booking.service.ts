import { PaymentService } from '@/modules/payments/payment.service';
import { db } from '@/db';
import { bookings, paymentStatusEnum } from '@/db/schema/bookings';
import { seats } from '@/db/schema/seats';
import { trips } from '@/db/schema/trips';
import { users } from '@/db/schema/users';
import { passengers } from '@/db/schema/passengers';
import { genderEnum, idTypeEnum } from '@/db/schema/passengers';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/core/errors';
import { eq, and, not, gte, lte, inArray, desc } from 'drizzle-orm';
import {
  BookingFilter,
  CreateBookingPayload,
  LockSeatPayload,
  CancelBookingPayload,
  createBookingSchema,
  BookingParams,
} from './booking.validation';

const bookingDetailSelect = {
  booking: bookings,
  trip: {
    name: trips.name,
    startLocation: trips.startLocation,
    endLocation: trips.endLocation,
    departureTime: trips.departureTime,
    arrivalTime: trips.arrivalTime,
  },
  seat: {
    seatNumber: seats.seatNumber,
    seatType: seats.seatType,
  },
  passenger: {
    name: passengers.name,
    updatedAt: passengers.updatedAt,
    createdAt: passengers.createdAt,
  },
};

type BookingDetailRow = {
  booking: typeof bookings.$inferSelect;
  trip: Pick<
    typeof trips.$inferSelect,
    'name' | 'startLocation' | 'endLocation' | 'departureTime' | 'arrivalTime'
  >;
  seat: Pick<typeof seats.$inferSelect, 'seatNumber' | 'seatType'>;
  passenger: Pick<
    typeof passengers.$inferSelect,
    'name' | 'updatedAt' | 'createdAt'
  >;
};

function toBookingWithDetails(row: BookingDetailRow) {
  return {
    ...row.booking,
    trip: row.trip,
    seat: row.seat,
    passenger: row.passenger,
  };
}

export class BookingService {
  static async createBooking(input: CreateBookingPayload, bookedBy: string) {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, bookedBy));

      if (!user) {
        throw new NotFoundError('User');
      }

      const [seat] = await tx
        .select()
        .from(seats)
        .where(eq(seats.id, input.seatId))
        .for('update');

      if (!seat) {
        throw new NotFoundError('Seat');
      }

      if (seat.status !== 'locked' || seat.lockedByUserId !== bookedBy) {
        throw new ConflictError(
          'Seat is not locked by this user. Please lock the seat before booking.'
        );
      }

      const [existingBooking] = await tx
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.seatId, input.seatId),
            not(inArray(bookings.status, ['failed', 'refunded', 'cancelled']))
          )
        );

      if (existingBooking) {
        throw new ConflictError('Seat is already booked');
      }

      if (
        seat.seatType === 'women_only' &&
        input.passenger.gender !== 'female'
      ) {
        throw new ConflictError(
          'This seat is reserved for female passengers only'
        );
      }

      if (
        seat.seatType === 'accessible' &&
        !input.passenger.isAccessibilityRequired
      ) {
        throw new ConflictError(
          'This seat is reserved for passengers requiring accessibility accommodations'
        );
      }

      const totalAmount = seat.price;

      const [passenger] = await tx
        .insert(passengers)
        .values({
          name: input.passenger.name,
          age: input.passenger.age,
          gender: input.passenger.gender,
          idNumber: input.passenger.idNumber,
          idType: input.passenger.idType,
          isAccessibilityRequired: input.passenger.isAccessibilityRequired,
          createdAt: new Date(),
        })
        .returning();

      const [booking] = await tx
        .insert(bookings)
        .values({
          tripId: input.tripId,
          seatId: input.seatId,
          bookedBy: bookedBy,
          passengerId: passenger.id,
          status: 'pending',
          totalAmount,
          currency: 'INR',
        })
        .returning();

      await tx
        .update(seats)
        .set({ status: 'reserved' })
        .where(eq(seats.id, input.seatId));

      return { booking, passenger };
    });
  }

  static async getBookingById(bookingId: BookingParams['id']) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    return booking;
  }

  static async getTripByBookingId(bookingId: BookingParams['id']) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, booking.tripId));

    if (!trip) {
      throw new NotFoundError('Trip');
    }

    return trip;
  }

  static async listBookings(input: BookingFilter) {
    const conditions = [];

    if (input.userId) {
      conditions.push(eq(bookings.bookedBy, input.userId));
    }

    if (input.status) {
      conditions.push(eq(bookings.status, input.status));
    }

    if (input.from) {
      conditions.push(gte(bookings.createdAt, new Date(input.from)));
    }

    if (input.to) {
      const toDate = new Date(input.to);
      toDate.setDate(toDate.getDate() + 1); // make 'to' inclusive
      conditions.push(lte(bookings.createdAt, toDate));
    }

    const offset = (input.page - 1) * input.limit;

    const result = await db
      .select()
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(input.limit)
      .offset(offset)
      .orderBy(desc(bookings.createdAt));

    return result;
  }

  static async getBookingDetails(bookingId: BookingParams['id']) {
    const [row] = await db
      .select(bookingDetailSelect)
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(seats, eq(bookings.seatId, seats.id))
      .innerJoin(passengers, eq(bookings.passengerId, passengers.id))
      .where(eq(bookings.id, bookingId));

    if (!row) {
      throw new NotFoundError('Booking');
    }

    return toBookingWithDetails(row);
  }

  static async listBookingWithDetails(input: BookingFilter) {
    const conditions = [];
    if (input.userId) {
      conditions.push(eq(bookings.bookedBy, input.userId));
    }
    if (input.tripId) {
      conditions.push(eq(bookings.tripId, input.tripId));
    }
    if (input.status) {
      conditions.push(eq(bookings.status, input.status));
    }
    if (input.from) {
      conditions.push(gte(bookings.createdAt, new Date(input.from)));
    }
    if (input.to) {
      const toDate = new Date(input.to);
      toDate.setDate(toDate.getDate() + 1);
      conditions.push(lte(bookings.createdAt, toDate));
    }

    const offset = (input.page - 1) * input.limit;

    const rows = await db
      .select(bookingDetailSelect)
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(seats, eq(bookings.seatId, seats.id))
      .innerJoin(passengers, eq(bookings.passengerId, passengers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(input.limit)
      .offset(offset)
      .orderBy(desc(bookings.createdAt));

    return rows.map(toBookingWithDetails);
  }

  static async cancelBooking(input: CancelBookingPayload, bookingId: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.status === 'pending') {
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          cancellationReason: input.cancellationReason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      await db
        .update(seats)
        .set({ status: 'available', lockedUntil: null, lockedByUserId: null })
        .where(eq(seats.id, booking.seatId));

      return updatedBooking;
    }

    if (booking.status === 'confirmed') {
      PaymentService.initiateRefund({
        bookingId,
        cancellationReason: input.cancellationReason,
      })

      const [refunded] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))

      return refunded;
    }

    throw new ConflictError(
      'Booking cannot be cancelled. Only pending or confirmed bookings can be cancelled.'
    )
  }
}
