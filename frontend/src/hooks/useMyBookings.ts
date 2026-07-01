import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { BookingWithDetails } from '../types/booking';
import type { ApiResponse } from '../types/api';

export function useMyBookings(page = 1) {
  return useQuery({
    queryKey: ['myBookings', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BookingWithDetails[]>>(
        `/bookings?page=${page}&limit=10`
      );
      return res.data.data;
    },
  });
}
