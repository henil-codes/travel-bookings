import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminTrips } from '../../hooks/useAdminTrips'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import type { AdminTripFilter } from '../../types/trip'

const STATUS_OPTIONS = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'boarding', label: 'Boarding' },
    { value: 'departed', label: 'Departed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

function inr(paise: number) {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function AdminTripsPage() {
    const [filters, setFilters] = useState<AdminTripFilter>({});
    const { data: trips, isLoading, isError } = useAdminTrips(filters);

    function updateFilter<K extends keyof AdminTripFilter>(key: K, value: AdminTripFilter[K]) {
        setFilters((prev) => ({ ...prev, [key]: value || undefined }))
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Trips</h1>
                <Link to="/admin/trips/new">
                    <Button>New Trip</Button>
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200">
                <Select
                    id="status-filter"
                    label="Status"
                    placeholder="All statuses"
                    options={STATUS_OPTIONS}
                    value={filters.status ?? ''}
                    onChange={(e) => updateFilter('status', e.target.value as AdminTripFilter['status'])}
                />
                <Input
                    id="from-loc-filter"
                    label="From"
                    placeholder="Start location"
                    value={filters.startLocation ?? ''}
                    onChange={(e) => updateFilter('startLocation', e.target.value)}
                />
                <Input
                    id="to-loc-filter"
                    label="To"
                    placeholder="End location"
                    value={filters.endLocation ?? ''}
                    onChange={(e) => updateFilter('endLocation', e.target.value)}
                />
                <Input
                    id="date-filter"
                    label="Departure date"
                    type="date"
                    value={filters.date ?? ''}
                    onChange={(e) => updateFilter('date', e.target.value)}
                />
            </div>

            {isLoading && (
                <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                </div>
            )}

            {isError && (
                <Alert variant="error">
                    Failed to load trips. Please try again later.
                </Alert>
            )}

            {!isLoading && !isError && trips && (trips.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500">No trips match these filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {trips.map((trip) => {
                        const isOverdue = trip.status === 'scheduled' && new Date(trip.departureTime) < new Date();
                        return (
                            <div className="bg-white rounded-xl border border-slate-200 p-5" key={trip.id}>
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <Link
                                            to={`/admin/trips/${trip.id}`}
                                            className="font-semibold text-slate-900 hover:text-brand-600"
                                        >
                                            {trip.startLocation} → {trip.endLocation}
                                        </Link>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {trip.name} ·{' '}
                                            {new Date(trip.departureTime).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isOverdue && (
                                            <Badge label="Needs update" colorClass="bg-amber-100 text-amber-700" />
                                        )}
                                    </div>
                                    <Badge label={trip.status} />
                                </div>

                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                                    {[
                                        {
                                            label: 'Active bookings',
                                            value: `${trip.stats.activeBookings} / ${trip.capacity}`,
                                        },
                                        { label: 'Capacity', value: String(trip.capacity) },
                                        { label: 'Gross revenue', value: inr(trip.stats.grossRevenue), },
                                        { label: 'Refunds raised', value: inr(trip.stats.refundInitiated), },
                                        { label: 'Refunds settled', value: inr(trip.stats.refundSettled), },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-slate-400 text-xs">{label}</p>
                                            <p className="font-medium text-slate-900">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}