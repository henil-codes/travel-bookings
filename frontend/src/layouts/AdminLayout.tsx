import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export function AdminLayout() {
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
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold select-none">
                  A
                </span>
              </div>
              <span className="text-lg font-bold text-slate-900">
                BusBook Admin
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                Bookings
              </NavLink>
              <NavLink
                to="/admin/refunds"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                Failed Refunds
              </NavLink>

              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white tex-xs font-bold select-none">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-600 hidden sm:block">
                  {user?.name.split(' ')[0]}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
