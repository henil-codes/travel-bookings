import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDrivers } from '../../hooks/useDrivers';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { api, getApiError } from '../../core/api';
import type { UserOption, AccountStatus } from '../../types/user';

const statusBadge: Record<AccountStatus, { label: string; colorClass: string }> = {
    active: { label: 'Active', colorClass: 'bg-green-100 text-green-700' },
    deactivated: { label: 'Pending approval', colorClass: 'bg-amber-100 text-amber-700' },
    suspended: { label: 'Suspended', colorClass: 'bg-red-100 text-red-700' },
}

export function AdminDriversPage() {
    const queryClient = useQueryClient();
    const { data: drivers, isLoading, isError } = useDrivers();
    const [suspendTarget, setSuspendTarget] = useState<UserOption | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');

    async function updateStatus(userId: string, accountStatus: AccountStatus) {
        setUpdatingId(userId);
        setActionError('');
        try {
            await api.patch(`/users/${userId}/status`, { accountStatus });
            queryClient.invalidateQueries({ queryKey: ['users', 'drivers'] });
            setSuspendTarget(null);
        } catch (error) {
            setActionError(getApiError(error));
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Drivers</h1>

            {actionError && (
                <div className="mb-4">
                    <Alert variant="error">{actionError}</Alert>
                </div>
            )}

            {isLoading && (
                <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                </div>
            )}

            {isError && (
                <Alert variant="error">Failed to load drivers. Please try again later.</Alert>
            )}

            {!isLoading && !isError && drivers && (drivers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500">No drivers have registered yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {drivers.map((driver) => {
                        const badge = statusBadge[driver.accountStatus];
                        return (
                            <div key={driver.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="font-semibold text-slate-900">{driver.name}</p>
                                    <p className="text-sm text-slate-500">{driver.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge label={badge.label} colorClass={badge.colorClass} />
                                    {driver.accountStatus === 'deactivated' && (
                                        <Button size="sm" loading={updatingId === driver.id} onClick={() => updateStatus(driver.id, 'active')}>
                                            Approve
                                        </Button>
                                    )}
                                    {driver.accountStatus === 'active' && (
                                        <Button size="sm" variant="danger" onClick={() => setSuspendTarget(driver)}>
                                            Suspend
                                        </Button>
                                    )}

                                    {driver.accountStatus === 'suspended' && (
                                        <Button size="sm" loading={updatingId === driver.id} onClick={() => updateStatus(driver.id, 'active')}>
                                            Reactivate
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}

            <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title="Suspend Driver">
                <p className="text-sm text-slate-600 mb-5">
                    {suspendTarget?.name} will no longer be able to sign in or be assigned to trips until reactivated.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setSuspendTarget(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" className="flex-1" loading={!!suspendTarget && updatingId === suspendTarget.id} onClick={() => suspendTarget && updateStatus(suspendTarget.id, 'suspended')}>
                        Confirm Suspend</Button>
                </div>
            </Modal>
        </div>
    )
}