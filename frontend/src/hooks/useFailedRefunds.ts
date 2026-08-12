import { useQuery } from '@tanstack/react-query';
import { api } from '../core/api';
import type {
  RefundOutboxRow,
  RefundOutboxFilter,
} from '../types/refundOutbox';
import type { ApiResponse } from '../types/api';

export function useFailedRefunds(filters: RefundOutboxFilter = {}) {
  return useQuery({
    queryKey: ['failedRefunds', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const res = await api.get<ApiResponse<RefundOutboxRow[]>>(
        `/payments/refund-outbox?${params}`
      );
      return res.data.data;
    },
  });
}
