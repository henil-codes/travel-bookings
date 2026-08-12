import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { Trip } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useAdminTripDetail(tripId: string) {
  return useQuery({
    queryKey: ['adminTripDetail', tripId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Trip>>(`/trips/${tripId}`);
      return res.data.data;
    },
    enabled: !!tripId,
  });
}
