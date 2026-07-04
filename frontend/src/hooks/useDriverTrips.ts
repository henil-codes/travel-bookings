import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Trip } from '../types/trip';
import type { ApiResponse } from '../types/api';

export function useMyDriverTrips(statusFilter?: string) {
    const userId = useAuthStore((state) => state.user?.id);

    return useQuery({
        queryKey: ['driverTrips', userId, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (userId) params.set('driverId', userId);
            if (statusFilter) params.set('status', statusFilter);
            const response = await api.get<ApiResponse<Trip[]>>(`/trips?${params}`);
            return response.data.data;
        },
        enabled: !!userId,
    })
}