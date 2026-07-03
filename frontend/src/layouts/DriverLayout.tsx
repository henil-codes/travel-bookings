import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export function DriverLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate('/driver/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-brand-800 text-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center" />
              <svg
                className="w-4 h-4"
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
            <div>
              <p className="text-xs text-white/60 leading-none">BusBook</p>
              <p className="text-sm font-semibold leading-tight">
                Driver Portal
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-4 ">
            <NavLink
              to="/driver/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`
              }
            >
              My Trips
            </NavLink>
            <div className="flex items-center gap-2 pl-4 border-l border-white/20">
              <span className="text-sm text-white/70 hidden sm:block">
                {user?.name.split('')[0]}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                Sign out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auth w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
