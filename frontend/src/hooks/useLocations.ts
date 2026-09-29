import { useQuery } from '@tanstack/react-query'
import { api } from '../core/api'
import type { ApiResponse } from '../types/api'

export function useLocations() {
    return useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<string[]>>('/trips/locations');
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}