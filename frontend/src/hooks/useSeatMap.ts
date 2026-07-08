import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api } from '../core/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Seat, SeatStatus } from '../types/seat';
import type { ApiResponse } from '../types/api';

// seats grouped by status, plus a summary of counts
interface SeatMapResponse {
  available: Seat[];
  locked: Seat[];
  reserved: Seat[];
  sold: Seat[];
  summary: {
    total: number;
    available: number;
    locked: number;
    reserved: number;
    sold: number;
  }
}

interface SeatStatusChangedPayload {
  tripId: string;
  seatId: string;
  status: SeatStatus;
  lockedUntil: string | null;
  lockedByUserId: string | null;
}

// The backend response for seat map may be grouped by status.
function flattenSeatMap(data: SeatMapResponse): Seat[] {
  return [
    ...data.available,
    ...data.locked,
    ...data.reserved,
    ...data.sold,
    ]
}

export function useSeatMap(tripId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['seatMap', tripId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SeatMapResponse>>(`/trips/${tripId}/seats`);
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
      (updated: SeatStatusChangedPayload) => {
        queryClient.setQueryData<Seat[]>(['seatMap', tripId], (prev) =>
          prev
            ? prev.map((seat) =>
                seat.id === updated.seatId ? { 
                  ...seat, 
                  status: updated.status,
                  lockedUntil: updated.lockedUntil,
                  lockedByUserId: updated.lockedByUserId,
                } : seat
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
