import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useVehicles } from '../../hooks/useVehicles';
import { AMENITY_OPTIONS } from '../../components/trip/amenities';
import { AMENITY_VALUES } from '../../types/vehicle';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { api, getApiError } from '../../core/api';

const schema = z.object({
    vehicleNumber: z.string().min(1, 'Vehicle number is required').max(100),
    vehicleType: z.string().min(1, 'Vehicle type is required').max(100),
    capacity: z.coerce.number().int().positive('Capacity must be at least 1'),
    amenities: z.enum(AMENITY_VALUES).array().default([]),
})
type FormData = z.input<typeof schema>

export function AdminVehiclesPage() {
    const queryClient = useQueryClient();
    const { data: vehicles, isLoading, isError } = useVehicles();
    const [modalOpen, setModalOpen] = useState(false);
    const [apiError, setApiError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { amenities: [] } });

    function closeModal() {
        setModalOpen(false);
        setApiError('');
        reset();
    }

    async function onSubmit(values: FormData) {
        setApiError('');
        const parsed = schema.parse(values);
        try {
            await api.post('/vehicles', parsed);
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            closeModal();
        } catch (error) {
            setApiError(getApiError(error));
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
                <Button onClick={() => setModalOpen(true)}>Add Vehicle</Button>
            </div>

            {isLoading && (
                <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                </div>
            )}

            {isError && (
                <Alert variant="error">Failed to load vehicles. Please try again later.</Alert>
            )}

            {!isLoading && !isError && vehicles && (vehicles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500">No vehicles yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="font-semibold text-slate-900">{vehicle.vehicleNumber}</p>
                                <p className="text-sm text-slate-500">{vehicle.vehicleType}</p>
                                {vehicle.amenities.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        {vehicle.amenities.map((amenity) => AMENITY_OPTIONS.find((opt) => opt.value === amenity)?.label).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-sm text-slate-600">{vehicle.capacity} seats</div>

                        </div>
                    ))}
                </div>
            ))
            }

            <Modal open={modalOpen} onClose={closeModal} title="Add Vehicle">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        id="vehicleNumber"
                        label="Vehicle Number"
                        placeholder="JK01AB1234"
                        error={errors.vehicleNumber?.message}
                        {...register('vehicleNumber')}
                    />
                    <Input
                        id="vehicleType"
                        label="Vehicle Type"
                        placeholder="AC Sleeper"
                        error={errors.vehicleType?.message}
                        {...register('vehicleType')}
                    />
                    <Input
                        id="capacity"
                        label="Capacity (seats)"
                        type="number"
                        min={1}
                        error={errors.capacity?.message}
                        {...register('capacity')}
                    />

                    <div>
                        <p className="block text-sm font-medium text-slate-700 mb-2">Amenities</p>
                        <div className="grid grid-cols-2 gap-2">
                            {AMENITY_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                >
                                    <input
                                        type="checkbox"
                                        value={opt.value}
                                        {...register('amenities')}
                                        className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 focus:ring-brand-400"
                                    />
                                    {opt.icon} {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {apiError && <Alert variant="error">{apiError}</Alert>}

                    <div className="flex gap-3 py-2">
                        <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
                        <Button type="submit" className="flex-1" loading={isSubmitting}>Add vehicle</Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}