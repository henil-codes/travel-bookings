import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useDrivers } from '../../hooks/useDrivers'
import { useVehicles } from '../../hooks/useVehicles'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { api, getApiError } from '../../core/api'
import type { ApiResponse } from '../../types/api'
import type { Trip } from '../../types/trip'

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    startLocation: z.string().min(1, 'Start location is required').max(255),
    endLocation: z.string().min(1, 'End location is required').max(255),
    departureTime: z.string().min(1, 'Departure time is required'),
    arrivalTime: z.string().min(1, 'Arrival time is required'),
    vehicleId: z.string().uuid('Select a vehicle'),
    driverId: z.string().uuid('Select a driver'),
    capacity: z.coerce.number().int().positive('Capacity must be at leaset 1'),
    basePriceRupees: z.coerce
        .number()
        .int()
        .positive('Price must be at least ₹1'),
})
    .refine(
        (data) => new Date(data.arrivalTime) > new Date(data.departureTime),
        { message: 'Arrival time must be after departure time', path: ['arrivalTime'] }
    )
    .refine((data) => new Date(data.departureTime) > new Date(), {
        message: 'Departure must be in the future',
        path: ['departureTime'],
    })

type FormData = z.input<typeof schema>

export function AdminTripCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [apiError, setApiError] = useState('');

    const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
    const { data: drivers, isLoading: driversLoading } = useDrivers();

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const vehicleOptions = (vehicles ?? []).map((v) => ({
        value: v.id,
        label: `${v.vehicleNumber} · ${v.vehicleType} · (${v.capacity} seats)`,
    }));

    const driverOptions = (drivers ?? []).map((d) => ({
        value: d.id,
        label: `${d.name} · ${d.email}`,
    }))

    // Default capacity from the chosen vehicle - still editable
    function handleVehicleChange(vehicleId: string) {
        const vehicle = (vehicles ?? []).find((v) => v.id === vehicleId);
        if (vehicle) setValue('capacity', vehicle.capacity);
    }

    async function onSubmit(values: FormData) {
        setApiError('');
        const parsed = schema.parse(values);

        try {
            const response = await api.post<ApiResponse<Trip>>('/trips', {
                name: parsed.name,
                startLocation: parsed.startLocation,
                endLocation: parsed.endLocation,
                departureTime: new Date(parsed.departureTime).toISOString(),
                arrivalTime: new Date(parsed.arrivalTime).toISOString(),
                vehicleId: parsed.vehicleId,
                driverId: parsed.driverId,
                capacity: parsed.capacity,
                basePrice: parsed.basePriceRupees * 100,
            })

            queryClient.invalidateQueries({ queryKey: ['adminTrips'] });
            navigate(`/admin/trips/${response.data.data.id}`);
        } catch (error) {
            setApiError(getApiError(error))
        }
    }

    if (vehiclesLoading || driversLoading) {
        return (
            <div className="flex justify-center py-16">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link
                to="/admin/trips"
                className="text-sm text-slate-500 hover:text-brand-600"
            >
                &larr; Back to Trips
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-3 mb-6">New Trip</h1>

            {vehicleOptions.length === 0 && (
                <div className="mb-4">
                    <Alert variant="warning">No vehicles exist yet. A trip cannot be created without one.</Alert>
                </div>
            )}
            {driverOptions.length === 0 && (
                <div className="mb-4">
                    <Alert variant="warning">No drivers exist yet. A trip cannot be created without one.</Alert>
                </div>
            )}

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
            >
                <Input
                    id="name"
                    label="Trip name"
                    placeholder="Jammu to Srinagar"
                    error={errors.name?.message}
                    {...register('name')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        id="startLocation"
                        label="From"
                        placeholder="Jammu"
                        error={errors.startLocation?.message}
                        {...register('startLocation')}
                    />

                    <Input
                        id="endLocation"
                        label="To"
                        placeholder="Srinagar"
                        error={errors.endLocation?.message}
                        {...register('endLocation')}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        id="departureTime"
                        label="Departure"
                        type="datetime-local"
                        error={errors.departureTime?.message}
                        {...register('departureTime')}
                    />

                    <Input
                        id="arrivalTime"
                        label="Arrival"
                        type="datetime-local"
                        error={errors.arrivalTime?.message}
                        {...register('arrivalTime')}
                    />
                </div>

                <Select
                    id="vehicleId"
                    label="Vehicle"
                    placeholder="Select a vehicle"
                    options={vehicleOptions}
                    error={errors.vehicleId?.message}
                    {...register('vehicleId', {
                        onChange: (e) => handleVehicleChange(e.target.value),
                    })}
                />

                <Select
                    id="driverId"
                    label="Driver"
                    placeholder="Select a driver"
                    options={driverOptions}
                    error={errors.driverId?.message}
                    {...register('driverId')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        id="capacity"
                        label="Capacity (seats)"
                        type="number"
                        min={1}
                        error={errors.capacity?.message}
                        {...register('capacity')}
                    />

                    <Input
                        id="basePriceRupees"
                        label="Base price (₹ per seat)"
                        type="number"
                        min={1}
                        error={errors.basePriceRupees?.message}
                        {...register('basePriceRupees')}
                    />
                </div>

                <p className="text-xs text-slate-400">
                    {`Creating the trip generates one seat per capacity unit at the base price.`}
                </p>

                {apiError && <Alert variant="error">{apiError}</Alert>}

                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => navigate('/admin/trips')}
                    >Cancel</Button>
                    <Button type="submit" className="flex-1" loading={isSubmitting}>
                        Create trip
                    </Button>
                </div>
            </form>
        </div>
    )
}