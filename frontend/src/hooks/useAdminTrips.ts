import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { TripWithStats, AdminTripFilter } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useAdminTrips(filters: AdminTripFilter = {}) {
    return useQuery({
        queryKey: ['adminTrips', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') params.set(key, String(value));
            });
            const res = await api.get<ApiResponse<TripWithStats[]>>(`/trips/admin?${params}`);

            return res.data.data;
        }
    })
} 