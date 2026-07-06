import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api } from '../core/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Seat } from '../types/seat';
import type { ApiResponse } from '../types/api';

// The backend response for seat map may be grouped by status.
// We flatten it to a Seat[] for the UI.
function flattenSeatMap(data: unknown): Seat[] {
  if (Array.isArray(data)) return data as Seat[];
  if (data && typeof data === 'object') {
    return Object.values(data).flat() as Seat[];
  }
  return [];
}

export function useSeatMap(tripId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['seatMap', tripId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/trips/${tripId}/seats`);
      return flattenSeatMap(res.data.data);
    },
    staleTime: 0,
  });

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: isAuthenticated ? { user: useAuthStore.getState().user } : undefined,
      transports: ['websocket'],
    });

    socket.emit('join:trip', tripId);

    socket.on(
      'seat:status_changed',
      (updated: Partial<Seat> & { id: string }) => {
        queryClient.setQueryData<Seat[]>(['seatMap', tripId], (prev) =>
          prev
            ? prev.map((seat) =>
                seat.id === updated.id ? { ...seat, ...updated } : seat
              )
            : prev
        );
      }
    );
    return () => {
      socket.emit('leave:trip', tripId);
      socket.disconnect();
    };
  }, [tripId, isAuthenticated, queryClient]);

  return query;
}
