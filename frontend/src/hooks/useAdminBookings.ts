import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { BookingWithDetails, AdminBookingFilter } from '../types/booking';
import type { ApiResponse } from '../types/api';

export function useAdminBookings(filters: AdminBookingFilter = {}) {
  return useQuery({
    queryKey: ['adminBookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const res = await api.get<ApiResponse<BookingWithDetails[]>>(
        `/bookings?${params}`
      );
      return res.data.data;
    },
  });
}
