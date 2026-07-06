import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { api, getApiError } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import type { ApiResponse } from '../../types/api';
import type { User } from '../../types/user';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export function DriverLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setApiError('');
    try {
      const response = await api.post<
        ApiResponse<{ user: User; token: string }>
      >('/auth/login', data);
      const { user } = response.data.data;

      if (user.role !== 'driver') {
        setApiError(
          'This portal is for drivers only. Please use the correct login page.'
        );
        return;
      }

      setAuth(user);

      if (user.accountStatus !== 'active') {
        navigate('/driver/pending', { replace: true });
      } else {
        navigate('/driver/dashboard', { replace: true });
      }
    } catch (error) {
      setApiError(getApiError(error));
    }
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/*Header*/}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Driver Portal</h1>
          <p className="text-brand-300 text-sm mt-1">
            Sign in to manage your trips
          </p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {apiError && (
            <div className="mb-4">
              <Alert variant="error">{apiError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register('email')}
              id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
            />
            <Input
              {...register('password')}
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password?.message}
              autoComplete="current-password"
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New driver?{' '}
            <Link
              to="/driver/register"
              className="text-brand-500 font-medium hover:text-brand-600"
            >
              Apply to join
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link
            to="/"
            className="text-brand-300 text-sm hover:text-white transition-colors"
          >
            ← Back to customer site
          </Link>
        </p>
      </div>
    </div>
  );
}
