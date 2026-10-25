import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { TripListItem, TripFilter } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useTrips(filters: TripFilter = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });

      const res = await api.get<ApiResponse<TripListItem[]>>(`/trips?${params}`);
      return res.data.data;
    },
    enabled: options.enabled,
  });
}
