import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isBootCheck = (error.config?.url ?? '').endsWith('/auth/me');
      const publicPaths = [
        '/login',
        '/register',
        '/driver/login',
        '/driver/register',
        '/forgot-password',
        '/reset-password',
      ];
      const onPublicPage = publicPaths.some((p) =>
        window.location.pathname.startsWith(p)
      );

      useAuthStore.getState().clearAuth();

      if (!isBootCheck && !onPublicPage) {
        window.location.href = window.location.pathname.startsWith('/driver')
          ? '/driver/login'
          : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return 'Something went wrong. Please try again.';
}
