import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TripFilterBar } from '../../components/trip/TripFilterBar';
import { TripCard } from '../../components/trip/TripCard';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { useTrips } from '../../hooks/useTrips';
import type { TripFilter } from '../../types/trip';

export function TripSearchPage() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState<TripFilter>({
        status: 'scheduled',
        startLocation: searchParams.get('startLocation') ?? undefined,
        endLocation: searchParams.get('endLocation') ?? undefined,
        date: searchParams.get('date') ?? undefined,
    });

    const hasSearched = !!(filters.startLocation && filters.endLocation);
    const { data: trips, isLoading, isError } = useTrips(filters, { enabled: hasSearched });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Find your bus</h1>
                <p className="text-slate-500 mt-1">
                    Search and book seats on upcoming trips
                </p>
            </div>

            <div className="mb-8">
                <TripFilterBar
                    onFilter={setFilters}
                    initial={{
                        from: searchParams.get('startLocation') ?? '',
                        to: searchParams.get('endLoacation') ?? '',
                        date: searchParams.get('date') ?? '',
                    }}
                />
            </div>

            {!hasSearched && (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-medium">Search for a trip to see results</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Enter a departure and destination city
                    </p>
                </div>
            )}

            {hasSearched && isLoading && (
                <div className="py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {hasSearched && isError && (
                <Alert variant="error">Failed to load trips. Please try again.</Alert>
            )}

            {hasSearched && !isLoading && !isError && (
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
                            <p className="text-slate-500 font-medium">No trips found</p>
                            <p className="text-sm text-slate-400 mb-1">
                                Try adjusting your search filters
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}