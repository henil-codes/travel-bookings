import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { api, getApiError } from '../../core/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { StepIndicator } from '../../components/ui/StepIndicator';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),

    countryCode: z.string().min(1).max(5),
    localPhone: z.string().min(5, 'Enter a valid phone number').max(15),
    licensenumber: z.string().min(5, 'Enter a valid license number').max(50),
    licenseIssueDate: z
      .date()
      .max(new Date(), 'License issue date cannot be in the future'),
    licenseExpiryDate: z.date(),

    agreeToTerms: z.literal(true, {
      message: 'You must agree to the terms',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.licenseExpiryDate > data.licenseIssueDate, {
    message: 'License expiry date must be after issue date',
    path: ['licenseExpiryDate'],
  })
  .refine((data) => data.licenseExpiryDate > new Date(), {
    message: 'License expiry date must be in the future',
    path: ['licenseExpiryDate'],
  });

type FormData = z.infer<typeof schema>;

const STEPS = [
  { label: 'Account' },
  { label: 'Credentials' },
  { label: 'Review' },
];

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  0: ['name', 'email', 'password', 'confirmPassword'],
  1: [
    'countryCode',
    'localPhone',
    'licensenumber',
    'licenseIssueDate',
    'licenseExpiryDate',
  ],
};

export function DriverRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    trigger,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { countryCode: '+91' },
  });

  const values = watch();

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields);
    if (valid) {
      setStep((step) => step + 1);
    }

    async function onSubmit(data: FormData) {
      setApiError('');
      try {
        await api.post('/auth/driver/register', {
          name: data.name,
          email: data.email,
          password: data.password,
          countryCode: data.countryCode,
          localPhone: data.localPhone,
          licenseNumber: data.licensenumber,
          licenseIssueDate: data.licenseIssueDate.toISOString(),
          licenseExpiryDate: data.licenseExpiryDate.toISOString(),
        });
        setSubmitted(true);
      } catch (error) {
        setApiError(getApiError(error));
      }
    }

    if (submitted) {
      return (
        <div className="min-h-screen bg-brand-900 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-white rounded-2xl p-10 shadow-2xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Application submitted!
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                Thank you for registering as a driver. Your application is under
                review. You will receive an email notification once your account
                is approved.
              </p>
              <Link to="/driver/login">
                <Button className="mt-6 w-full">Go to Driver Login</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-brand-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              Driver Application
            </h1>
            <p className="text-brand-300 text-sm mt-1">
              Join our network of professional drivers
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center mb-8">
            <StepIndicator steps={STEPS} current={step} />
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {apiError && (
              <div className="mb-4">
                <Alert variant="error">{apiError}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* -- Step 1: Account --*/}
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    Account details
                  </h2>
                  <Input
                    {...register('name')}
                    id="name"
                    label="Full name"
                    placeholder="As on your driving license"
                    error={errors.name?.message}
                  />
                  <Input
                    {...register('email')}
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                  />
                  <Input
                    {...register('password')}
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="Min. 8 characters"
                    error={errors.password?.message}
                  />
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type="password"
                    label="Confirm password"
                    placeholder="Re-enter your password"
                    error={errors.confirmPassword?.message}
                  />
                </div>
              )}

              {/* -- Step 2: Credentials --*/}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    Contact & driving credentials
                  </h2>
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
                      />
                    </div>
                  </div>
                  <Input
                    {...register('licensenumber')}
                    id="licenseNumber"
                    label="Driving license number"
                    placeholder="e.g. GJ0120230012345"
                    error={errors.licensenumber?.message}
                    className="uppercase"
                  />
                  <Input
                    {...register('licenseIssueDate', { valueAsDate: true })}
                    id="licenseIssueDate"
                    label="License issue date"
                    type="date"
                    error={errors.licenseIssueDate?.message}
                  />
                  <Input
                    {...register('licenseExpiryDate', { valueAsDate: true })}
                    id="licenseExpiryDate"
                    label="License expiry date"
                    type="date"
                    error={errors.licenseExpiryDate?.message}
                  />
                </div>
              )}

              {/* -- Step 3: Review --*/}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    Review your application
                  </h2>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    {[
                      { label: 'Name', value: values.name },
                      { label: 'Email', value: values.email },
                      {
                        label: 'Phone',
                        value: `${values.countryCode} ${values.localPhone}`,
                      },
                      { label: 'License number', value: values.licensenumber },
                      {
                        label: 'License issue date',
                        value: values.licenseIssueDate?.toLocaleDateString(),
                      },
                      {
                        label: 'License expiry date',
                        value: values.licenseExpiryDate?.toLocaleDateString(),
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-slate-900">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer mt-2">
                    <input
                      {...register('agreeToTerms')}
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                    />
                    <span className="text-sm text-slate-600">
                      I confirm all details are accurate and I agree to the{' '}
                      <span className="text-brand-500">
                        Driver Terms of Service
                      </span>
                    </span>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-xs text-red-500">
                      {errors.agreeToTerms.message}
                    </p>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div
                className={`flex gap-3 mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}
              >
                {step > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep((step) => step - 1)}
                  >
                    ← Back
                  </Button>
                )}
                {step < 2 ? (
                  <Button type="button" onClick={goNext}>
                    Continue →
                  </Button>
                ) : (
                  <Button type="submit" loading={isSubmitting}>
                    Submit Application
                  </Button>
                )}
              </div>
            </form>
          </div>

          <p className="text-center text-brand-300 text-sm mt-">
            Already applied?{' '}
            <Link
              to="/driver/login"
              className="text-white font-medium hover:text-brand-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }
}
