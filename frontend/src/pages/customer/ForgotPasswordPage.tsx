import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { api, getApiError } from '../../core/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z.object({ email: z.email() });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
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
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch (error) {
      setApiError(getApiError(error));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500 mt-1">
            We'll send a reset link to your email
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          {sent ? (
            <Alert variant="success">
              Check your inbox - if that email is registered, you will receive a
              reset link shortly.
            </Alert>
          ) : (
            <>
              {apiError && <Alert variant="error">{apiError}</Alert>}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 mt-4"
              >
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                />
                <Button type="submit" loading={isSubmitting} className="w-full">
                  Send reset link
                </Button>
              </form>
            </>
          )}
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
