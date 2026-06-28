import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { Trip, TripFilter } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useTrips(filters: TripFilter = {}) {
  return useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const res = await api.get<ApiResponse<Trip[]>>(`/trips?${params}`);
      return res.data.data;
    },
  });
}
