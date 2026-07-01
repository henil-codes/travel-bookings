import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-slate-200">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">
          Page not found
        </h1>
        <p className="text-slate-500 mt-2">
          The page you're looking for doesn't exist.
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
