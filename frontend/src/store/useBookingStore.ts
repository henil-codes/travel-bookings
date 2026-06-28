import { create } from 'zustand';
import type { Trip } from '../types/trip';
import type { Seat } from '../types/seat';

interface BookingState {
  selectedTrip: Trip | null;
  selectedSeat: Seat | null;
  bookingId: string | null;
  razorpayOrderId: string | null;
  setSelectedTrip: (trip: Trip) => void;
  setSelectedSeat: (seat: Seat | null) => void;
  setBookingId: (bookingId: string) => void;
  setRazorpayOrderId: (razorpayOrderId: string) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()((set) => ({
  selectedTrip: null,
  selectedSeat: null,
  bookingId: null,
  razorpayOrderId: null,
  setSelectedTrip: (trip) =>
    set({ selectedTrip: trip, selectedSeat: null, bookingId: null }),
  setSelectedSeat: (seat) => set({ selectedSeat: seat }),
  setBookingId: (id) => set({ bookingId: id }),
  setRazorpayOrderId: (id) => set({ razorpayOrderId: id }),
  clearBooking: () =>
    set({
      selectedTrip: null,
      selectedSeat: null,
      bookingId: null,
      razorpayOrderId: null,
    }),
}));
