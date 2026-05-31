import { db } from '@/db';
import { vehicles } from '@/db/schema';
import { seats } from '@/db/schema';
import type {
  CreateTripPayload,
  UpdateTripPayload,
  UpdateTripStatusInput,
  TripFilterInput,
} from './trip.validation';
import { trips, tripStatusEnum } from '@/db/schema/trips';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/core/errors';
import { eq, and, gte, lt, ilike, sql } from 'drizzle-orm';

export class TripService {
  static async createTrip(input: CreateTripPayload, createdBy: { id: string; role: string }) {
    if (createdBy.role !== 'operator' && createdBy.role !== 'admin') {
      throw new UnauthorizedError('You do not have permission to create a trip.')
    }

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, input.vehicleId));

    if (!vehicle) {
      throw new NotFoundError('Vehicle');
    }

    const [trip] = await db
      .insert(trips)
      .values({
        name: input.name,
        startLocation: input.startLocation,
        endLocation: input.endLocation,
        departureTime: new Date(input.departureTime),
        arrivalTime: new Date(input.arrivalTime),
        vehicleId: input.vehicleId,
        capacity: input.capacity,
        status: 'scheduled',
      })
      .returning();

    return trip;
  }

  // list trips with optional filters and pagination
  static async listTrips(filters: TripFilterInput) {
    const conditions = [];

    if (filters.startLocation) {
      conditions.push(ilike(trips.startLocation, `%${filters.startLocation}%`));
    }

    if (filters.endLocation) {
      conditions.push(ilike(trips.endLocation, `%${filters.endLocation}%`));
    }

    if (filters.status) {
      conditions.push(eq(trips.status, filters.status));
    }

    // filter by date (trips departing on the specified date)
    if (filters.date) {
      const start = new Date(filters.date);
      const end = new Date(filters.date);
      end.setDate(end.getDate() + 1);

      conditions.push(gte(trips.departureTime, start));
      conditions.push(lt(trips.departureTime, end));
    }

    const offset = (filters.page - 1) * filters.limit;

    const [result] = await db
      .select()
      .from(trips)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .offset(offset)
      .orderBy(trips.departureTime);

    return result;
  }

  static async getTripById(tripId: string) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
      throw new NotFoundError('Trip');
    }

    return trip;
  }

  static async getSeatMap(tripId: string) {
    await TripService.getTripById(tripId);

    const allSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.tripId, tripId));

    const seatMap = {
      available: allSeats.filter((seat) => seat.status === 'available'),
      locked: allSeats.filter((seat) => seat.status === 'locked'),
      reserved: allSeats.filter((seat) => seat.status === 'reserved'),
      sold: allSeats.filter((seat) => seat.status === 'sold'),
      summary: {
        total: allSeats.length,
        available: allSeats.filter((seat) => seat.status === 'available')
          .length,
        locked: allSeats.filter((seat) => seat.status === 'locked').length,
        reserved: allSeats.filter((seat) => seat.status === 'reserved').length,
        sold: allSeats.filter((seat) => seat.status === 'sold').length,
      },
    };

    return seatMap;
  }

  static async checkVehicleAvailability(
    vehicleId: string,
    departureTime: Date,
    tripIdToExclude?: string
  ) {
    const conflictingTrip = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.vehicleId, vehicleId),
          eq(trips.departureTime, departureTime),
          tripIdToExclude ? sql`${trips.id} != ${tripIdToExclude}` : undefined
        )
      )
      .limit(1);

    return conflictingTrip.length > 0;
  }

  // updateTrip - admin or operator can update trip details if trip is not started yet
  static async updateTrip(
    tripId: string,
    input: UpdateTripPayload,
    requestingUser: { id: string; role: string }
  ) {
    if (requestingUser.role !== 'operator' && requestingUser.role !== 'admin') {
      throw new UnauthorizedError(
        'You do not have permission to update this trip'
      );
    }

    const trip = await TripService.getTripById(tripId);

    // prevent updates if trip has already started
    if (['departed', 'completed', 'cancelled'].includes(trip.status)) {
      throw new ConflictError(
        'Cannot update trip that has already been ' + trip.status
      );
    }

    // if both time and vehicle are being updated, check for conflicts first
    if (input.departureTime && input.vehicleId) {
      // check if new departure time is in the future
      const newDepartureTime = input.departureTime
        ? new Date(input.departureTime)
        : trip.departureTime;
      const newArrivalTime = input.arrivalTime
        ? new Date(input.arrivalTime)
        : trip.arrivalTime;

      if (newArrivalTime <= newDepartureTime) {
        throw new ConflictError('Arrival time must be after departure time');
      }

      // check if new vehicle is available at the new departure time
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId));
      if (!vehicle) {
        throw new NotFoundError('Vehicle');
      }

      if (trip.vehicleId !== input.vehicleId) {
        const isAvailable = await TripService.checkVehicleAvailability(
          input.vehicleId,
          newDepartureTime,
          tripId
        );
        if (!isAvailable) {
          throw new ConflictError(
            'Vehicle is already assigned to another trip during the specified time'
          );
        }

        const [updatedTrip] = await db
          .update(trips)
          .set({
            name: input.name,
            startLocation: input.startLocation,
            endLocation: input.endLocation,
            departureTime: newDepartureTime,
            arrivalTime: newArrivalTime,
            vehicleId: input.vehicleId,
          })
          .where(eq(trips.id, tripId))
          .returning();

        return updatedTrip;
      } else {
        throw new ConflictError(
          'New vehicle must be different from the current vehicle'
        );
      }
    }
  }

  // updateTripStatus - admin or operator can update trip status with valid transitions
  static async updateTripStatus(
    tripId: string,
    input: UpdateTripStatusInput,
    requestingUser: { id: string; role: string }
  ) {
    if (requestingUser.role !== 'operator' && requestingUser.role !== 'admin') {
      throw new UnauthorizedError(
        'You do not have permission to update this trip'
      );
    }

    const trip = await TripService.getTripById(tripId);

    // validate status transition
    const validTransitions: Record<string, string[]> = {
      scheduled: ['boarding', 'cancelled'],
      boarding: ['departed', 'cancelled'],
      departed: ['completed'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[trip.status].includes(input.status)) {
      throw new ConflictError(
        `Invalid status transition from ${trip.status} to ${input.status}`
      );
    }

    const [updatedTrip] = await db
      .update(trips)
      .set({ status: input.status })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  }

  // deleteTrip - admin only
  static async deleteTrip(tripId: string, requestingUser: { id: string; role: string }) {
    if (requestingUser.role !== 'admin' && requestingUser.role !== 'operator') {
      throw new UnauthorizedError('You do not have permission to delete this trip');
    }

    const trip = await TripService.getTripById(tripId);

    // prevent deletion if trip has already started
    if (['departed', 'completed'].includes(trip.status)) {
      throw new ConflictError('Cannot delete trip that has already been ' + trip.status);
    }

    await db.transaction(async (tx) => {
      // delete associated seats
      await tx.delete(seats).where(eq(seats.tripId, tripId));

      // delete the trip
      await tx.delete(trips).where(eq(trips.id, tripId));
    })
  }
}
