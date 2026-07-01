import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSeatMap } from '../../hooks/useSeatMap';
import { SeatMap } from '../../components/seat/SeatMap';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
// import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api, getApiError } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { Trip } from '../../types/trip';
import type { Seat } from '../../types/seat';
import type { ApiResponse } from '../../types/api';

function formatDateTime(dateTime: string) {
  return new Date(dateTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setSelectedTrip, setSelectedSeat, selectedSeat } = useBookingStore();
  const [lockError, setLockError] = useState('');
  const [locking, setLocking] = useState(false);

  const tripQuery = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Trip>>(`/trips/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const seatQuery = useSeatMap(id!);

  async function handleSeatSelect(seat: Seat) {
    if (!user) {
      navigate('/login', { state: { from: `/trips/${id}` } });
      return;
    }

    setLockError('');
    setLocking(true);
    try {
      await api.post('/seats/lock', { seatId: seat.id });
      setSelectedTrip(tripQuery.data!);
      setSelectedSeat(seat);
      navigate('/checkout');
    } catch (error) {
      setLockError(getApiError(error));
    } finally {
      setLocking(false);
    }
  }

  if (tripQuery.isLoading || seatQuery.isLoading) {
    return (
      <div className="py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (tripQuery.isError || !tripQuery.data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Alert variant="error">Could not load trip details</Alert>
        <Link to="/" className="text-brand-500 text-sm mt-4 inline-block">
          ← Back to trips
        </Link>
      </div>
    );
  }

  const trip = tripQuery.data;
  const seats = seatQuery.data ?? [];
  const availableCount = seats.filter((s) => s.status === 'available').length;
  const minPrice =
    seats.length > 0 ? Math.min(...seats.map((s) => s.price)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/"
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        All trips
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat map */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Select a seat
            </h2>
            {seatQuery.isError && (
              <Alert variant="warning">Live updates unavailable</Alert>
            )}
          </div>
          {lockError && <Alert variant="error">{lockError}</Alert>}
          {locking && (
            <div className="py-4">
              <Spinner />
            </div>
          )}
          <SeatMap
            seats={seats}
            selectedSeatId={selectedSeat?.id ?? null}
            currentUserId={user?.id ?? null}
            onSeatSelect={handleSeatSelect}
          />
        </div>

        {/* Trip info panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge label={trip.status} />
              <span className="text-xs text-slate-400">{trip.name}</span>
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-900">
                {trip.startLocation}
                <span className="text-slate-400 mx-2">→</span>
                {trip.endLocation}
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Departs {formatDateTime(trip.departureTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Arrives {formatDateTime(trip.arrivalTime)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Available seats</span>
                <span className="font-semibold text-slate-900">
                  {availableCount}
                </span>
              </div>
              {minPrice > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Starting from</span>
                  <span className="font-semibold text-slate-900">
                    ₹{(minPrice / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!user && (
          <Alert variant="info">
            <Link to="/login" className="underline">
              Sign in
            </Link>{' '}
            to lock and book a seat. If you don't have an account,{' '}
            <Link to="/register" className="underline">
              create one
            </Link>
            .
          </Alert>
        )}
      </div>
    </div>
  );
}
