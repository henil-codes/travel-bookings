import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { PaginatedBookings } from '../types/booking';
import type { ApiResponse } from '../types/api';

export function useMyBookings(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['myBookings', page, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedBookings>>(
        `/bookings?page=${page}&limit=${limit}`
      );
      return res.data.data;
    },
  });
}
