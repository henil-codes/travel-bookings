import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, getApiError } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import type { ApiResponse } from '../../types/api';
import type { User } from '../../types/user';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

const guestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.email(),
})
type GuestFormData = z.infer<typeof guestSchema>;

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
})
type LoginFormData = z.infer<typeof loginSchema>;

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GuestOrLoginModal({ open, onClose, onSuccess }: Props) {
    const [mode, setMode] = useState<'guest' | 'login'>('guest');
    const [apiError, setApiError] = useState('');
    const setAuth = useAuthStore((state) => state.setAuth);

    const guestForm = useForm<GuestFormData>({ resolver: zodResolver(guestSchema) });
    const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

    function switchMode(next: 'guest' | 'login') {
        setMode(next);
        setApiError('');
    }

    async function onGuestSubmit(data: GuestFormData) {
        setApiError('');
        try {
            const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/guest', data);
            setAuth(response.data.data.user, { isGuest: true });
            onSuccess();
        } catch (error) {
            setApiError(getApiError(error));
        }
    }

    async function onLoginSubmit(data: LoginFormData) {
        setApiError('');
        try {
            const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data);
            setAuth(response.data.data.user)
            onSuccess();
        } catch (error) {
            setApiError(getApiError(error));
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={mode === 'guest' ? 'Continue booking' : 'Sign in'}
        >
            {apiError && (
                <div className="mb-4">
                    <Alert variant="error">{apiError}</Alert>
                </div>
            )}

            {mode === 'guest' ? (
                <form onSubmit={guestForm.handleSubmit(onGuestSubmit)} className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Enter your details to continue - no password needed. You can save an account after booking.
                    </p>
                    <Input
                        {...guestForm.register('name')}
                        id="guest-name"
                        label="Full name"
                        placeholder="Rahul Sharma"
                        error={guestForm.formState.errors.name?.message}
                    />
                    <Input
                        {...guestForm.register('email')}
                        id="guest-email"
                        type="email"
                        label="Email"
                        placeholder="youremail@example.com"
                        error={guestForm.formState.errors.email?.message}
                    />
                    <Button
                        type="submit"
                        loading={guestForm.formState.isSubmitting}
                        className="w-full"
                    >
                        Continue
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        Have an account?{' '}
                        <button
                            type="button"
                            className="text-brand-500 font-medium hover:text-brand-600"
                            onClick={() => switchMode('login')}
                        >
                            Sign in instead
                        </button>
                    </p>


                </form>
            ) : (
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <Input
                        {...loginForm.register('email')}
                        id="login-email"
                        type="email"
                        label="Email"
                        error={loginForm.formState.errors.email?.message}
                    />
                    <Input
                        {...loginForm.register('password')}
                        id="login-password"
                        type="password"
                        label="Password"
                        error={loginForm.formState.errors.password?.message}
                    />
                    <Button
                        type="submit"
                        loading={loginForm.formState.isSubmitting}
                        className="w-full"
                    >
                        Sign in
                    </Button>
                    <p className="text-center text-sm text-slate-500">
                        New here?{' '}
                        <button
                            type="button"
                            className="text-brand-500 font-medium hover:text-brand-600"
                            onClick={() => switchMode('guest')}
                        >
                            Continue as guest
                        </button>
                    </p>
                </form>
            )}
        </Modal>
    )
}