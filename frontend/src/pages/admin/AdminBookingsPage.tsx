import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminBookings } from '../../hooks/useAdminBookings';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import type { AdminBookingFilter } from '../../types/booking';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

export function AdminBookingsPage() {
  const [filters, setFilters] = useState<AdminBookingFilter>({});
  const { data: bookings, isLoading, isError } = useAdminBookings(filters);

  function updateFilter<K extends keyof AdminBookingFilter>(
    key: K,
    value: AdminBookingFilter[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">All Bookings</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200">
        <Select
          label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={filters.status ?? ''}
          onChange={(e) =>
            updateFilter(
              'status',
              e.target.value as AdminBookingFilter['status']
            )
          }
        />
        <Input
          id="trip-filter"
          label="Trip ID"
          placeholder="uuid"
          value={filters.tripId ?? ''}
          onChange={(e) => updateFilter('tripId', e.target.value)}
        />
        <Input
          id="from-filter"
          label="From"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => updateFilter('from', e.target.value)}
        />
        <Input
          id="to-filter"
          label="To"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => updateFilter('to', e.target.value)}
        />
      </div>

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
            <p className="text-slate-500">No bookings match these filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                className="bg-white rounded-xl border border-slate-200 p-5"
                key={booking.id}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <Link
                      to={`/admin/trips/${booking.tripId}`}
                      className="font-semibold text-slate-900 hover:text-brand-600"
                    >
                      {booking.trip.startLocation} → {booking.trip.endLocation}
                    </Link>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {new Date(booking.trip.departureTime).toLocaleString(
                        'en-IN'
                      )}
                    </p>
                  </div>
                  <Badge label={booking.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: 'Passenger', value: booking.passenger.name },
                    {
                      label: 'Booked By',
                      value: `${booking.bookedByUser.name} · ${booking.bookedByUser.email}`,
                    },
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
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
