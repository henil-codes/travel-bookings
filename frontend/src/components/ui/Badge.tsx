const tripStatusMap: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  boarding: 'bg-amber-100 text-amber-700',
  departed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentStatusMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  refunded: 'bg-purple-100 text-purple-700',
};

export const statusColorMap = { ...tripStatusMap, ...paymentStatusMap };

interface Props {
  label: string;
  colorClass?: string;
}

export function Badge({ label, colorClass }: Props) {
  const classes =
    colorClass ?? statusColorMap[label] ?? 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold upppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}
