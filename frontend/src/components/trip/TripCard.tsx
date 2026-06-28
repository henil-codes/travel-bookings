import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { Trip } from '../../types/trip';

function formatDateTime(dateTime: string) {
  const date = new Date(dateTime);
  return {
    date: date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function durationLabel(departureTime: string, arrivalTime: string) {
  const minutes = Math.round(
    (new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) /
      60000
  );
  const hours = Math.floor(minutes / 60),
    mins = minutes % 60;
  return hours > 0 ? `${hours}hours ${mins}min` : `${mins}min`;
}

interface Props {
  trip: Trip;
}

export function TripCard({ trip }: Props) {
  const departure = formatDateTime(trip.departureTime);
  const arrival = formatDateTime(trip.arrivalTime);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <Badge label={trip.status} />
        <span className="text-xs text-slate-400">{trip.name}</span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{departure.time}</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-[5rem] truncate">
            {trip.startLocation}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-400">
            {durationLabel(trip.departureTime, trip.arrivalTime)}
          </span>
          <div className="w-full flex items-center gap-1">
            <div className="h-px flex-1 bg-slate-200" />
            <svg
              className="w-3 h-3 text-slate-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xs text-slate-400">{departure.date}</span>
        </div>
        <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{arrival.time}</p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-[5rem] truncate">{trip.endLocation}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
            <span className="text-xs text-slate-400">Seats available</span>
            <p className="text-sm font-medium text-slate-700">{trip.capacity} total</p>
        </div>
        <Link to={`/trips/${trip.id}`}>
            <button className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">View seats</button>
        </Link>
      </div>
    </div>
  );
}
