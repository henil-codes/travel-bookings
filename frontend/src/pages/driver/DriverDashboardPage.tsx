import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useMyDriverTrips } from '../../hooks/useDriverTrips';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { api, getApiError } from '../../core/api';
import type { Trip, TripStatus } from '../../types/trip';

const NEXT_STATUSES: Partial<Record<TripStatus, TripStatus[]>> = {
  scheduled: ['boarding', 'cancelled'],
  boarding: ['departed', 'cancelled'],
  departed: ['completed'],
};

const ACTION_LABELS: Partial<Record<TripStatus, string>> = {
  boarding: 'Starting Boarding',
  departed: 'Mark Departed',
  completed: 'Mark Completed',
  cancelled: 'Cancel Trip',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function TripStatusCard({
  trip,
  onUpdateStatus,
}: {
  trip: Trip;
  onUpdateStatus: (trip: Trip, status: TripStatus) => void;
}) {
  const nextStatuses = NEXT_STATUSES[trip.status] ?? [];
  const primaryNext = nextStatuses.find((s) => s !== 'cancelled');
  const canCancel = nextStatuses.includes('cancelled');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-slate-900 text-lg">
            {trip.startLocation}
            <span className="text-slate-400 mx-2">→</span>
            {trip.endLocation}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{trip.name}</p>
        </div>
        <Badge label={trip.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Departure</p>
          <p className="font-medium text-slate-800">
            {formatDate(trip.departureTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Arrival</p>
          <p className="font-medium text-slate-800">
            {formatDate(trip.arrivalTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Capacity</p>
          <p className="font-medium text-slate-800">{trip.capacity}</p>
        </div>
      </div>

      {(primaryNext || canCancel) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {primaryNext && (
            <Button size="sm" onClick={() => onUpdateStatus(trip, primaryNext)}>
              {ACTION_LABELS[primaryNext] ?? primaryNext}
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onUpdateStatus(trip, 'cancelled')}
            >
              Cancel Trip
            </Button>
          )}
        </div>
      )}

      {trip.status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            This trip has been completed.
          </p>
        </div>
      )}
    </div>
  );
}

export function DriverDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const activeTrips = useMyDriverTrips();

  const [confirmTarget, setConfirmTarget] = useState<{
    trip: Trip;
    status: TripStatus;
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const isLoading = activeTrips.isLoading;
  const isError = activeTrips.isError;
  const trips = activeTrips.data ?? [];

  const activeCount = trips.filter((t) =>
    ['scheduled', 'boarding', 'departed'].includes(t.status)
  ).length;
  const completedCount = trips.filter((t) => t.status === 'completed').length;

  async function confirmStatusUpdate() {
    if (!confirmTarget) return;
    setUpdating(true);
    setUpdateError('');

    try {
      await api.patch(`/trips/${confirmTarget.trip.id}/status`, {
        status: confirmTarget.status,
      });
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
      setConfirmTarget(null);
    } catch (error) {
      setUpdateError(getApiError(error));
    } finally {
      setUpdating(false);
    }
  }

  const confirmActionLabel = confirmTarget
    ? (ACTION_LABELS[confirmTarget.status] ?? confirmTarget.status)
    : '';
  const isDangerous = confirmTarget?.status === 'cancelled';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Trips</h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, {user?.name.split(' ')[0]}
        </p>
      </div>

      {/* Summary cards*/}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: 'Active Trips',
            value: activeCount,
            color: 'bg-brand-50 text-brand-700',
          },
          {
            label: 'Completed',
            value: completedCount,
            color: 'bg-green-50 text-green-700',
          },
          {
            label: 'Total assigned',
            value: trips.length,
            color: 'bg-slate-50 text-slate-700',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl px-5 py-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="py-16">
          <Spinner size="lg" />
        </div>
      )}
      {isError && (
        <Alert variant="error">
          Failed to load trips. This may require you to log in again. Please
          refresh the page or log out and log back in.
        </Alert>
      )}
      {!isLoading &&
        !isError &&
        (trips.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <svg
              className="mx-auto h-12 w-12 text-slate-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <p className="text-slate-500 font-medium">No Trips assigned yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Your trips will appear here once an admin assigns them to you.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...trips]
              .sort(
                (a, b) =>
                  new Date(a.departureTime).getTime() -
                  new Date(b.departureTime).getTime()
              )
              .map((trip) => (
                <TripStatusCard
                  key={trip.id}
                  trip={trip}
                  onUpdateStatus={(trip, status) => {
                    setUpdateError('');
                    setConfirmTarget({ trip: trip, status: status });
                  }}
                />
              ))}
          </div>
        ))}

      {/* Confirmation modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmActionLabel}
      >
        {confirmTarget && (
          <>
            <p className="text-sm text-slate-600 mb-1">
              {confirmTarget.trip.startLocation} →
              {confirmTarget.trip.endLocation}
            </p>
            <p className="text-sm text-slate-500 mb-5">
              {isDangerous
                ? 'This will cancel the trip. All reservations will need to be handled by an admin.'
                : `Change trip status to "${confirmTarget.status}". This cannot be undone.`}
            </p>

            {updateError && (
              <div className="mb-4">
                <Alert variant="error">{updateError}</Alert>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant={isDangerous ? 'danger' : 'primary'}
                className="flex-1"
                loading={updating}
                onClick={confirmStatusUpdate}
              >
                Confirm
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
