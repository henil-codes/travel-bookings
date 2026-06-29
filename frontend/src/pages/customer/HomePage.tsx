import { useState } from 'react';
import { TripFilterBar } from '../../components/trip/TripFilterBar';
import { TripCard } from '../../components/trip/TripCard';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { useTrips } from '../../hooks/useTrips';
import type { TripFilter } from '../../types/trip';

export function HomePage() {
  const [filters, setFilters] = useState<TripFilter>({ status: 'scheduled' });
  const { data: trips, isLoading, isError } = useTrips(filters);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Find your bus</h1>
        <p className="text-slate-500 mt-1">
          Search and book seats on upcoming trips
        </p>
      </div>

      <div className="mb-8">
        <TripFilterBar onFilter={setFilters} />
      </div>

      {isLoading && (
        <div className="py-20">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Alert variant="error">Failed to load trips. Please try again.</Alert>
      )}

      {!isLoading && !isError && (
        <>
          {trips && trips.length > 0 ? (
            <>
              <p className="text-sm text-slate-500 mb-4">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
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
              <p className="text-slate-500 font-medium">No trips found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your search filters
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
