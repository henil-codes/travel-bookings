import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { UserOption } from '../types/user';
import type { ApiResponse } from '../types/api';

export function useDrivers() {
    return useQuery({
        queryKey: ['users', 'drivers'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<UserOption[]>>('/users?role=driver');
            return res.data.data;
        }
    })
}