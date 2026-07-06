import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../types/user';
import type { ApiResponse } from '../types/api';
import { Spinner } from '../components/ui/Spinner';

interface Props {
  children: ReactNode;
}

export function AuthBootstrap({ children }: Props) {
  const { setUser, clearAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<ApiResponse<User>>('/auth/me')
      .then((response) => {
        setUser(response.data.data);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
