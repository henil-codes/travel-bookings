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
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">BusBook</span>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
                {user ? (<>
                    <NavLink to="/my-bookings" className={({isActive}) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                        My Bookings
                    </NavLink>
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        <span className="text-sm text-slate-600 hidden sm:block">
                            {user.name.split(' ')[0]}
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            Sign out
                        </Button>
                    </div>
                </>) : (
                    <div className="flex items-center gap-2">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">Sign in</Button>
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
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} BusBook. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
