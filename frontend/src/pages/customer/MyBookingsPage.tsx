import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMyBookings } from '../../hooks/useMyBookings';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { api, getApiError } from '../../core/api';
import type { BookingWithDetails } from '../../types/booking';

export function MyBookingsPage() {
  const [page] = useState(1);
  const { data: bookings, isLoading, isError } = useMyBookings(page);
  const queryClient = useQueryClient();

  const [cancelTarget, setCancelTarget] = useState<BookingWithDetails | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  function closeCancelModal() {
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
  }

  async function handleCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    setCancelError('');

    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`, {
        cancellationReason: cancelReason.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      setCancelTarget(null);
      setCancelReason('');
    } catch (error) {
      setCancelError(getApiError(error));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Bookings</h1>
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Alert variant="error">
          Failed to load bookings. Please try again later.
        </Alert>
      )}
      {!isLoading &&
        !isError &&
        bookings &&
        (bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-500">No bookings yet.</p>
            <a href="/" className="text-brand-500 text-sm mt-2 inline-block">
              Browse trips →
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const dep = new Date(booking.trip.departureTime).toLocaleString(
                'en-IN',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                }
              );
              const canCancel =
                booking.status === 'pending' || booking.status === 'completed';

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {booking.trip.startLocation} → {booking.trip.endLocation}
                      </p>
                      <p className="text-sm text-slate-500 mt-0 5">{dep}</p>
                    </div>
                    <Badge label={booking.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: 'Passenger', value: booking.passenger.name },
                      { label: 'Seat', value: `#${booking.seat.seatNumber}` },
                      {
                        label: 'Amount',
                        value: `₹${(booking.totalAmount / 100).toLocaleString('en-IN')}`,
                      },
                      {
                        label: 'Booking ID',
                        value: booking.id.slice(0, 8).toUpperCase(),
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-slate-400 text-xs">{label}</p>
                        <p className="font-medium text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  {canCancel && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setCancelTarget(booking);
                          setCancelError('');
                        }}
                      >
                        Cancel booking
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {/* Cancel Confirmation modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => closeCancelModal()}
        title="Cancel booking"
      >
        <p className="text-sm text-slate-600 mb-4">
          Please provide a reason for cancellation. This cannot be undone.
        </p>
        <Input
          id="cancel-reason"
          label="Reason"
          placeholder="e.g. Change of plans"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
        {cancelError && (
          <div className="mt-3">
            <Alert variant="error">{cancelError}</Alert>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => closeCancelModal()}
          >
            Keep booking
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={cancelling}
            disabled={!cancelReason.trim()}
            onClick={handleCancel}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
