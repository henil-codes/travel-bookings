import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { AMENITY_ICON, AMENITY_LABEL } from './amenities';
import type { TripListItem } from '../../types/trip';

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
  trip: TripListItem;
}

export function TripCard({ trip }: Props) {
  const departure = formatDateTime(trip.departureTime);
  const arrival = formatDateTime(trip.arrivalTime);

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block w-full bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col gap-4"
    >
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

      {/* Amenities */}
      {trip.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trip.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {AMENITY_ICON[amenity]} {AMENITY_LABEL[amenity]}
            </span>
          ))}
          {trip.amenities.length > 4 && (
            <span className="text-xs text-slate-400 px-1">
              +{trip.amenities.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          {trip.fromPrice === null ? (
            <span className="text-sm font-semibold text-slate-400">Sold out</span>
          ) : (
            <>
              <span className="text-xs text-slate-400">From</span>
              <p className="text-lg font-bold text-slate-900">
                ₹{(trip.fromPrice / 100).toLocaleString('en-IN')}
              </p>
            </>
          )}
        </div>
        <span className="bg-brand-500 group-hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          View seats
        </span>
      </div>
    </Link>
  );
}
