import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../types/user';
import type { ApiResponse } from '../types/api';

interface Props {
  children: ReactNode;
}

export function AuthBootstrap({ children }: Props) {
  const { isAuthenticated, setUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    api
      .get<ApiResponse<User>>('/auth/me')
      .then((response) => {
        setUser(response.data.data);
      })
      .catch(() => {});
  }, []);

  return <>{children}</>;
}
