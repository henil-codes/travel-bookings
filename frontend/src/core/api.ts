import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
    headers: { 'Content-Type' : 'application/json' },
    withCredentials: true,
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error.response?.status === 401;
        const isNotAuthChecked = !error.config?.url?.includes('/auth/me');

        if (isUnauthorized && isNotAuthChecked) {
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
)

export function getApiError(error: unknown) : string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.message;
    }
    return 'Something went wrong. Please try again.';
}