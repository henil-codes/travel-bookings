import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSeatMap } from '../../hooks/useSeatMap';
import { SeatMap } from '../../components/seat/SeatMap';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
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

const seatTypeLabel: Record<string, string> = {
  standard: 'Standard',
  accessible: 'Accessible',
  women_only: 'Women Only',
};

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setSelectedTrip, selectedSeats, toggleSeat, setSelectedSeats } = useBookingStore();
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

  useEffect(() => {
    if (tripQuery.data) {
      setSelectedTrip(tripQuery.data);
    }
  }, [tripQuery.data, setSelectedTrip]);

  async function handleSeatToggle(seat: Seat) {
    if (!user) {
      navigate('/login', { state: { from: `/trips/${id}` } });
      return;
    }
    toggleSeat(seat);
  }

  async function handleProceed() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedSeats.length === 0) return;

    setLockError('');
    setLocking(true);

    try {
      const responses = await Promise.all(
        selectedSeats.map((seat) =>
          api.post('/seats/lock', { seatId: seat.id })
        )
      );
      const lockedSeats = responses.map((res) => res.data.data);
      setSelectedSeats(lockedSeats);
      
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
  const selectedSeatIds = selectedSeats.map((s) => s.id);
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const availableCount = seats.filter((s) => s.status === 'available').length;

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
        <div className="lg:col-span-2 space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Select a seat
              <span className="text-sm font-normal text-slate-400 ml-2">
                (max 6)
              </span>
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
            capacity={trip.capacity}
            selectedSeatIds={selectedSeatIds}
            currentUserId={user?.id ?? null}
            onSeatToggle={handleSeatToggle}
          />
        </div>

        {/* Selection summary */}
        {selectedSeats.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Selected seats ({selectedSeats.length})
            </h3>

            <div className="space-y-2">
              {selectedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 bg-brand-600 text-white rounded flex items-center justify-center text-xs font-semibold">
                      {seat.seatNumber}
                    </span>
                    <span className="text-slate-600">
                      {seatTypeLabel[seat.seatType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">
                      ₹{(seat.price / 100).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => toggleSeat(seat)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-xl font-bold text-slate-900">
                  ₹{(totalPrice / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <Button
                onClick={handleProceed}
                loading={locking}
                disabled={selectedSeats.length === 0}
                size="lg"
              >
                Proceed to Checkout →
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge label={trip.status} />
              <span className="text-xs text-slate-400">{trip.name}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {trip.startLocation}
              <span className="text-slate-400 mx-2">→</span>
              {trip.endLocation}
            </p>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Departs {formatDateTime(trip.departureTime)}</p>
              <p>Arrives {formatDateTime(trip.arrivalTime)}</p>
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Available</span>
                <span className="font-semibold">{availableCount} seats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total capacity</span>
                <span className="font-semibold">{trip.capacity} seats</span>
              </div>
            </div>
          </div>
        </div>

        {!user && (
          <Alert variant="info">
            <Link to="/login" className="underline">
              Sign in
            </Link>{' '}
            to select and book a seat. If you don't have an account,{' '}
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
