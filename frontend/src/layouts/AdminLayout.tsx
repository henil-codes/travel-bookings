import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  end?: boolean;
}

const iconProps = {
  className: 'h-5 w-5 flex-shrink-0',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
} as const;

function TicketIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"
      />
    </svg>
  )
}

function RouteIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  )
}

function RefundIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"
      />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Bookings', path: '/admin', icon: <TicketIcon />, end: true },
  { label: 'Trips', path: '/admin/trips', icon: <RouteIcon /> },
  { label: 'Failed Refunds', path: '/admin/refunds', icon: <RefundIcon /> },
]

function NavLinkClasses({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600'
    : 'text-slate-600 hover:bg-slate-100'
    }`
}

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
                Mannat Travels Admin
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold select-none">
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
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="md:w-60 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200">
          <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto md:sticky md:top-16">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={NavLinkClasses}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
