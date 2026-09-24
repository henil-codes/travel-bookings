import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { TripStats } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useTripStats(tripId: string) {
    return useQuery({
        queryKey: ['tripStats', tripId],
        queryFn: async () => {
            const res = await api.get<ApiResponse<TripStats>>(`/trips/${tripId}/stats`);
            return res.data.data;
        },
        enabled: !!tripId,
    })
}