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

const schema = z
  .object({
    name: z.string().min(1).max(255),
    email: z.email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    countryCode: z.string().min(1).max(5),
    localPhone: z.string().min(5).max(15),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  // const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { countryCode: '+91' },
  });

  async function onSubmit({ confirmPassword: _, ...data }: FormData) {
    setApiError('');
    try {
      const res = await api.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/register',
        data
      );
      navigate('/', { replace: true });
    } catch (error) {
      setApiError(getApiError(error));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-500 rounded-xl mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Start booking trips today
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          {apiError && <Alert variant="error">{apiError}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Input
              {...register('name')}
              id="name"
              label="Full name"
              placeholder="Rahul Sharma"
              error={errors.name?.message}
              autoComplete="name"
            />
            <Input
              {...register('email')}
              id="email"
              label="Email"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
            />
            <div className="flex gap-2">
              <div className="w-24 flex-none">
                <Input
                  {...register('countryCode')}
                  id="countryCode"
                  label="Code"
                  placeholder="+91"
                  error={errors.countryCode?.message}
                />
              </div>
              <div className="flex-1">
                <Input
                  {...register('localPhone')}
                  id="localPhone"
                  type="tel"
                  label="Phone number"
                  placeholder="9876543210"
                  error={errors.localPhone?.message}
                  autoComplete="tel-national"
                />
              </div>
            </div>
            <Input
              {...register('password')}
              id="password"
              type="password"
              label="Password"
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              autoComplete="new-password"
            />
            <Input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              label="Confirm password"
              placeholder="*********"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <Button type="submit" loading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand-500 font-medium hover:text-brand-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
