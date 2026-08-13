import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminTripDetail } from '../../hooks/useAdminTripDetail';
import { useAdminBookings } from '../../hooks/useAdminBookings';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api, getApiError } from '../../core/api';

const CANCELLABLE_STATUSES = ['scheduled', 'boarding'];

export function AdminTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = id!;
  const queryClient = useQueryClient();

  const {
    data: trip,
    isLoading: tripLoading,
    isError: tripError,
  } = useAdminTripDetail(tripId);
  const { data: bookings, isLoading: bookingLoading } = useAdminBookings({
    tripId,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  async function handleCancelTrip() {
    setCancelling(true);
    setCancelError('');
    try {
      await api.post(`/trips/${tripId}/status`, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['adminTripDetail', tripId] });
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      setConfirmOpen(false);
    } catch (error) {
      setCancelError(getApiError(error));
    } finally {
      setCancelling(false);
    }
  }

  if (tripLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Alert variant="error">Failed to load this trip.</Alert>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(trip.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {trip.startLocation} → {trip.endLocation}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Departs {new Date(trip.departureTime).toLocaleString('en-IN')}
            </p>
          </div>
          <Badge label={trip.status} />
        </div>

        {canCancel && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Cancel Trip
            </Button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Bookings</h2>

      {bookingLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!bookingLoading &&
        bookings &&
        (bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-500">No bookings for this trip.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3"
                key={booking.id}
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {booking.passenger.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Seat #{booking.seat.seatNumber} · ₹
                    {(booking.totalAmount / 100).toLocaleString('en-IN')}
                  </p>
                </div>
                <Badge label={booking.status} />
              </div>
            ))}
          </div>
        ))}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this trip?"
      >
        <p className="text-sm text-slate-600 mb-4">
          This cancels the trip and cancades to every pending/confirmed booking
          pendings are cancelled and their seats released immediately; confirmed
          bookings are queued for refund. This cannot be undone.
        </p>
        {cancelError && (
          <div className="mb-3">
            <Alert variant="error">{cancelError}</Alert>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirmOpen(false)}
          >
            Keep trip
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={cancelling}
            onClick={handleCancelTrip}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
