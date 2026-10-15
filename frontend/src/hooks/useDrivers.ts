import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type { UserOption, AccountStatus } from '../types/user';
import type { ApiResponse } from '../types/api';

interface DriverFilter {
    accountStatus?: AccountStatus;
}

export function useDrivers(filters: DriverFilter = {}) {
    return useQuery({
        queryKey: ['users', 'drivers', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.accountStatus) params.set('accountStatus', filters.accountStatus);
            const res = await api.get<ApiResponse<UserOption[]>>(`/users?${params}`);
            return res.data.data;
        }
    })
}