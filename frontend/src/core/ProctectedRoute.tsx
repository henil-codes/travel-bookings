import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { Role } from '../types/user';

interface Props {
  allowedRoles: Role[];
  redirectTo?: string;
}

export function ProctedRoute({ allowedRoles, redirectTo = '/login' }: Props) {
  const { user, token } = useAuthStore();

  if (!token || !user) return <Navigate to={redirectTo} replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/403" replace />;

  return <Outlet />;
}

export function ActiveDriverRoute() {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/driver/login" replace />;
  if (user.role !== 'driver') return <Navigate to="/403" replace />;
  if (user.accountStatus !== 'active')
    return <Navigate to="/driver/pending" replace />;
  return <Outlet />;
}
