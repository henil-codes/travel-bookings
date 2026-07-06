import { create } from 'zustand';
import type { Trip } from '../types/trip';
import type { Seat } from '../types/seat';

const MAX_SEATS = 6;

interface BookingState {
  selectedTrip: Trip | null;
  selectedSeats: Seat[];
  bookingIds: string[];
  razorpayOrderId: string | null;

  setSelectedTrip: (trip: Trip) => void;
  toggleSeat: (seat: Seat | null) => void;
  clearSeats: () => void;
  setBookingIds: (bookingIds: string[]) => void;
  setRazorpayOrderId: (razorpayOrderId: string) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()((set, get) => ({
  selectedTrip: null,
  selectedSeats: [],
  bookingIds: [],
  razorpayOrderId: null,

  setSelectedTrip: (trip) =>
    set({ selectedTrip: trip, selectedSeats: [], bookingIds: [] }),

  toggleSeat: (seat) => {
    if (!seat) return;

    const { selectedSeats } = get();
    const alreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (alreadySelected) {
      set({ selectedSeats: selectedSeats.filter((s) => s.id !== seat.id) });
      return;
    }

    if (selectedSeats.length >= MAX_SEATS) return;

    set({ selectedSeats: [...selectedSeats, seat] });
  },
  clearSeats: () => set({ selectedSeats: [] }),

  setBookingIds: (ids) => set({ bookingIds: ids }),
  setRazorpayOrderId: (id) => set({ razorpayOrderId: id }),

  clearBooking: () =>
    set({
      selectedTrip: null,
      selectedSeats: [],
      bookingIds: [],
      razorpayOrderId: null,
    }),
}));
