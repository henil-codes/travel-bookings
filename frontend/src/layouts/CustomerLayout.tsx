import logo from '../assets/vecteezy_bus-travel-logo-bus-design_69825892.jpg';
import { Suspense } from 'react';
import { Spinner } from '../components/ui/Spinner';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Vecteezy.com logo" className="h-16 w-16 rounded-full object-cover" />
              <span className="text-lg font-bold text-slate-900">Travel Bookings</span>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
              {user ? (
                <>
                  <NavLink
                    to="/my-bookings"
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`
                    }
                  >
                    <span className="hidden sm:inline">My Bookings</span>

                    {/* Compact icon on mobile */}
                    <svg
                      className="w-5 h-5 sm:hidden"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </NavLink>
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold select-none">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-slate-600 hidden sm:block">
                      {user.name.split(' ')[0]}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <span className="hidden sm:inline">Sign out</span>
                      <svg
                        className="w-4 h-4 sm:hidden"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <Spinner size="lg" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Travel Bookings. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
