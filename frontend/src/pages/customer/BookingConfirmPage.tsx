import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../core/api';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import type { BookingWithDetails } from '../../types/booking';
import type { ApiResponse } from '../../types/api';

export function BookingConfirmPage() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BookingWithDetails>>(
        `/bookings/${bookingId}`
      );
      return res.data.data;
    },
    enabled: !!bookingId,
  });

  if (isLoading)
    return (
      <div className="py-32">
        <Spinner size="lg" />
      </div>
    );
  if (isError || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">Could not load booking details.</p>
        <Link
          to="/my-bookings"
          className="text-brand-500 text-sm mt-2 inline-block"
        >
          View my bookings
        </Link>
      </div>
    );
  }

  const dep = new Date(data.trip.departureTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <svg
            className="w-10 h-10 text-green-600"
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
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Booking confirmed!</h1>
        <p className="text-slate-500 mt-1">Your sent has been reserved successfully.</p>
      </div>

      {/* Booking card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-brand-500 text-white p-5">
            <p className="text-sm opacity-80">
                {data.trip.startLocation} → {data.trip.endLocation}
            </p>
            <p className="text-xl font-bold mt-1">{dep}</p>
        </div>

        <div className="p-5 space-y-3 text-sm">
            {[
                { label: 'Booking ID', value: data.id.slice(0, 8).toUpperCase() },
                { label: 'Passenger', value: data.passenger.name },
                { label: 'Age', value: String(data.passenger.age) },
                { label: 'Seat', value: `#${data.seat.seatNumber}`},
                { label: 'Amount paid', value: `₹${(data.totalAmount / 100).toLocaleString('en-IN')}`,}
            ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                </div>
            ))}
            <div className="flex justify-between pt-2">
                <div className="text-slate-500">Status</div>
                <Badge label={data.status} />
            </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/my-bookings">
            <button className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">
                View all bookings
            </button>
        </Link>
        <Link to="/" className="text-center text-sm text-brand-500 hover:text-brand-600 font-medium">
            Book another trip
        </Link>
      </div>
    </div>
  );
}
