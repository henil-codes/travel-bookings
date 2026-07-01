import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl font-extrabold text-slate-200">403</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">
          Access denied
        </h1>
        <p className="text-slate-500 mt-2">
          You don't have permission to view this page.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 text-brand-500 font-medium hover:text-brand-600"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
