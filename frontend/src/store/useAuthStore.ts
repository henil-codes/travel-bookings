import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/user';
import { api } from '../core/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setAuth: (user: User, options?: {isGuest?: boolean}) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      setAuth: (user, options) => set({ user, isAuthenticated: true, isGuest: options?.isGuest ?? false }),
      setUser: (user) => set({ user, isAuthenticated: user !== null }),
      clearAuth: () => set({ user: null, isAuthenticated: false, isGuest: false }),
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout failed:', error);
        }        
        finally {
          set({ user: null, isAuthenticated: false, isGuest: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
