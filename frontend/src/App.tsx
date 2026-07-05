import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ActiveDriverRoute, ProctedRoute } from './core/ProctectedRoute';
import { CustomerLayout } from './layouts/CustomerLayout';
import { DriverLayout } from './layouts/DriverLayout';

// Customer pages
import { LoginPage } from './pages/customer/LoginPage';
import { RegisterPage } from './pages/customer/Registerpage';
import { ForgotPasswordPage } from './pages/customer/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/customer/ResetPasswordPage';
import { HomePage } from './pages/customer/HomePage';
import { TripDetailPage } from './pages/customer/TripDetailPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { BookingConfirmPage } from './pages/customer/BookingConfirmPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';

// Driver pages
import { DriverLoginPage } from './pages/driver/DriverLoginPage';
import { DriverRegisterPage } from './pages/driver/DriverRegisterPage';
import { DriverPendingPage } from './pages/driver/DriverPendingPage';
import { DriverDashboardPage } from './pages/driver/DriverDashboardPage';

// Error pages
import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';

import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { api } from './core/api';
import { Spinner } from './components/ui/Spinner';

const router = createBrowserRouter([
  // Customer auth pages
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Customer pages
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/trips/:id', element: <TripDetailPage /> },

      // Protected pages
      {
        element: <ProctedRoute allowedRoles={['customer']} />,
        children: [
          { path: '/checkout', element: <CheckoutPage /> },
          {
            path: '/booking/confirm/:bookingId',
            element: <BookingConfirmPage />,
          },
          { path: '/my-bookings', element: <MyBookingsPage /> },
        ],
      },
    ],
  },

  // Driver routes
  { path: '/driver/login', element: <DriverLoginPage /> },
  { path: '/driver/register', element: <DriverRegisterPage /> },

  // Driver protected routes
  {
    element: (
      <ProctedRoute allowedRoles={['driver']} redirectTo="/driver/login" />
    ),
    children: [
      // Driver pending page
      { path: '/driver/pending', element: <DriverPendingPage /> },
      // Driver dashboard page
      {
        element: <ActiveDriverRoute />,
        children: [
          {
            element: <DriverLayout />,
            children: [
              { path: '/driver/dashboard', element: <DriverDashboardPage /> },
            ],
          },
        ],
      },
    ],
  },
  // Admin routes

  // Error pages
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    // When the app boots, check if the browser has a valid cookie session
    api
      .get('/auth/me')
      .then((res) => {
        // If successful, save the user data to Zustand
        setAuth(res.data.data.user);
      })
      .catch(() => {
        // If it fails (no cookie, expired cookie), ensure the store is clean
        clearAuth();
      })
      .finally(() => {
        // Stop the loading spinner and render the app
        setIsInitializing(false);
      });
  }, [setAuth, clearAuth]);

  // Show a blank screen or a spinner while checking the session
  // This prevents the UI from flickering "Sign in" for a split second before popping in the user's name
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
