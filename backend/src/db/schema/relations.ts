import { relations } from 'drizzle-orm';
import { seats } from './seats';
import { bookings } from './bookings';
import { passengers } from './passengers';
import { trips } from './trips';

// --- TRIP RELATIONS ---
export const tripRelations = relations(trips, ({many}) => ({
    seats: many(seats),
    bookings: many(bookings),
}))

// --- BOOKING RELATIONS ---
export const bookingRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  seat: one(seats, {
    fields: [bookings.seatId],
    references: [seats.id],
  }),
}));

// --- SEAT RELATIONS ---
export const seatRelations = relations(seats, ({ one, many }) => ({
  trip: one(trips, {
    fields: [seats.tripId],
    references: [trips.id],
  }),
  bookings: many(bookings),
}));

// --- PASSENGER RELATIONS ---
export const passengerRelations = relations(passengers, ({ one }) => ({
  booking: one(bookings, {
    fields: [passengers.id],
    references: [bookings.passengerId],
  })
}))
