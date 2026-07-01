import type { Trip } from '../../types/trip';
import type { Seat } from '../../types/seat';

const seatTypeLabel: Record<string, string> = {
  standard: 'Standard',
  accessible: 'Accessible',
  women_only: 'Women Only',
};

interface Props {
  trip: Trip;
  seat: Seat;
}

export function BookingSummary({ trip, seat }: Props) {
  const dep = new Date(trip.departureTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-slate-900">Booking summary</h3>
        <div className="space-y-2 text-slate-600">
            <div className="flex justify-between">
                <span>Route</span>
                <span className="font-medium text-slate-900 text-right">
                    {trip.startLocation} → {trip.endLocation}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Departure</span>
                <span className="font-medium text-slate-900">{dep}</span>
            </div>
            <div className="flex justify-between">
                <span>Seat</span>
                <span className="font-medium text-slate-900">
                    #{seat.seatNumber} · {seatTypeLabel[seat.seatType]}
                </span>
            </div>
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span className="text-lg">
                ₹{(seat.price / 100).toLocaleString('en-IN')}
            </span>
        </div>
    </div>
  )
}
