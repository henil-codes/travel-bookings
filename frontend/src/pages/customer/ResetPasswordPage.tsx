import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getApiError } from '../../core/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characterds'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ newPassword }: FormData) {
    setApiError('');
    if (!token) {
      setApiError('Invalid or missing reset token.');
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login', {
        state: { message: 'Password updated. Please sign in.' },
      });
    } catch (error) {
      setApiError(getApiError(error));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Set new password
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          {apiError && <Alert variant="error">{apiError}</Alert>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Input
              {...register('newPassword')}
              id="newPassword"
              type="password"
              label="New password"
              placeholder="Min. 8 characters"
              error={errors.newPassword?.message}
              autoComplete="new-password"
            />
            <Input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              label="Confirm password"
              placeholder="********"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Update password
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link
            to="/login"
            className="text-brand-500 font-medium hover:text-brand-600"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
