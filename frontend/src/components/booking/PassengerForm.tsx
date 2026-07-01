import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { PassengerInput } from '../../types/booking';

const ID_PATTERNS: Record<string, { pattern: RegExp; message: string }> = {
  aadhar: { pattern: /^\d{12}$/, message: 'Must be exactly 12 digits' },
  pan: {
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    message: 'Format: ABCDEF1234F',
  },
  passport: {
    pattern: /^[A-PR-W][1-9]\d\s?\d{4}[1-9]$/,
    message: 'Invalid passport format',
  },
  driving_license: {
    pattern: /^[A-Z]{2}\d{13}$/,
    message: 'Format: xx0000000000000',
  },
};

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().int().positive('Age must be a positive number').max(120),
    gender: z.enum(['male', 'female', 'other']),
    isAccessibilityRequired: z.boolean(),
    idType: z.enum(['aadhar', 'pan', 'passport', 'driving_license']),
    idNumber: z.string().min(1, 'ID number is required'),
  })
  .superRefine((data, ctx) => {
    const rule = ID_PATTERNS[data.idType];
    const normalized = data.idNumber.toUpperCase().replace(/[/s-]/g, '');
    if (rule && !rule.pattern.test(normalized)) {
      ctx.addIssue({
        code: 'custom',
        message: rule.message,
        path: ['idNumber'],
      });
    }
  });


export type PassengerFormData = z.infer<typeof schema>;

interface Props {
  onValidChange: (data: PassengerInput | null) => void;
}

export function PassengerForm({ onValidChange }: Props) {
  const {
    register,
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm<PassengerFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { isAccessibilityRequired: false, idType: 'aadhar' },
  });

  const watched = useWatch({ control });

  useEffect(() => {
    if (isValid) {
        const values = getValues();
        onValidChange({
            ...values, 
            idNumber: values.idNumber.toUpperCase().replace(/[\s-]/g, ''),
        })
    } else {
        onValidChange(null);
    }
  }, [watched, isValid, getValues, onValidChange]);

  return (
    <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
            Passenger details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
                {...register('name')}
                id="p-name"
                label="Full name"
                placeholder="As on goverment ID"
                error={errors.name?.message}
            />
            <Input 
                {...register('age')}
                id="p-age"
                type="number"
                label="Age"
                placeholder="25"
                error={errors.age?.message}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                    {...register('gender')}
                    id="p-gender"
                    label="Gender"
                    error={errors.gender?.message}
                    options={[
                        { value: 'male', label: 'Male'},
                        { value: 'female', label: 'Female'},
                        { value: 'other', label: 'Other'},
                    ]}
                 />

                 <Select 
                    {...register('idType')}
                    id="p-idType"
                    label="ID type"
                    error={errors.idType?.message}
                    options={[
                        { value: 'aadhar', label: 'Aadhar'},
                        { value: 'pan', label: 'PAN Card'},
                        { value: 'passport', label: 'Passport'},
                        { value: 'driving_license', label: 'Driving License'},
                    ]}
                 />
            </div>

            <Input 
                {...register('idNumber')}
                id="p-idNumber"
                label="ID number"
                placeholder="Enter ID number"
                error={errors.idNumber?.message}
                className="uppercase"
            />

            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                {...register('isAccessibilityRequired')}
                type="checkbox" 
                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                />
                <span className="text-sm text-slate-700">Requires accessibility accommodations</span>
            </label>
        </div>
    </div>
  )
}
