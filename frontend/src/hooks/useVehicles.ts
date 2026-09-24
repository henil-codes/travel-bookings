import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { Vehicle } from '../types/vehicle';
import type { ApiResponse } from '../types/api';

export function useVehicles() {
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<Vehicle[]>>('/vehicles');
            return res.data.data;
        }
    })
}