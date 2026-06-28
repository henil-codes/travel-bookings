import { forwardRef, type SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  (
    { label, error, id, options, placeholder, className = '', ...props },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          {...props}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow disabled:bg-slate-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-400 focus:ring-red-300'
              : 'border-slate-200 focus:ring-brand-400'
          } ${className}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';