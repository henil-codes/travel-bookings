import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminTripDetail } from '../../hooks/useAdminTripDetail';
import { useAdminBookings } from '../../hooks/useAdminBookings';
import { useTripStats } from '../../hooks/useTripStats';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api, getApiError } from '../../core/api';
import type { TripStatus } from '../../types/trip';

const VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  scheduled: ['boarding', 'cancelled'],
  boarding: ['departed', 'cancelled'],
  departed: ['completed'],
  completed: [],
  cancelled: [],
}

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function AdminTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = id!;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: trip,
    isLoading: tripLoading,
    isError: tripError,
  } = useAdminTripDetail(tripId);
  const { data: stats } = useTripStats(tripId);
  const { data, isLoading: bookingLoading } = useAdminBookings({
    tripId,
  });
  const bookings = data?.bookings;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleCancelTrip() {
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/trips/${tripId}/status`, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['adminTripDetail', tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripStats', tripId] })
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminTrips'] });
      setConfirmOpen(false);
    } catch (error) {
      setCancelError(getApiError(error));
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteTrip() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/trips/${tripId}`);
      queryClient.invalidateQueries({ queryKey: ['adminTrips'] });
      navigate('/admin/trips');
    } catch (error) {
      setDeleteError(getApiError(error));
      setDeleting(false);
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

  const canCancel = VALID_TRANSITIONS[trip.status].includes('cancelled');

  const hasStarted = ['departed', 'completed'].includes(trip.status) || new Date(trip.departureTime) <= new Date();
  const canDelete = !hasStarted && stats?.totalBookings === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/admin/trips"
        className="text-sm text-slate-500 hover:text-brand-600"
      >
        &larr; Back to trips
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-3 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="textxxl font-bold text-slate-900">
              {trip.startLocation} &rarr; {trip.endLocation}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {trip.name} &middot; Departs{' '}
              {new Date(trip.departureTime).toLocaleString('en-IN')}
            </p>
          </div>
          <Badge label={trip.status} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
        {[
          { label: 'Active bookings', value: stats ? String(stats.activeBookings) : '-' },
          { label: 'Capacity', value: String(trip.capacity) },
          { label: 'Gross revenue', value: stats ? inr(stats.grossRevenue) : '-' },
          { label: 'Refunds raised', value: stats ? inr(stats.refundInitiated) : '-' },
          { label: 'Refunds settled', value: stats ? inr(stats.refundSettled) : '-' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-slate-400 text-xs">{label}</p>
            <p className="font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {(canCancel || canDelete) && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3 flex-wrap">
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Cancel trip
            </Button>
          )}
          {canDelete && (
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              Delete Trip
            </Button>
          )}
        </div>
      )}

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
                    Seat #{booking.seat.seatNumber} &middot; {' '}
                    {inr(booking.totalAmount)}
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

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this trip?"
      >
        <p className="text-sm text-slate-600 mb-4">
          This permanently removes the trip and its seat map. Only possible becuase the trip has not started and has no bookings. This cannot be undone.
        </p>
        {deleteError && (
          <div className="mb-3">
            <Alert variant="error">{deleteError}</Alert>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDeleteOpen(false)}
          >
            Keep trip
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={deleting}
            onClick={handleDeleteTrip}
          >
            Confirm delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
