import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ActiveDriverRoute, ProtectedRoute } from './core/ProctectedRoute';
import { CustomerLayout } from './layouts/CustomerLayout';
import { Spinner } from './components/ui/Spinner';
import { HomePage } from './pages/customer/HomePage';

// Customer pages (lazy)
const LoginPage = lazy(() => import('./pages/customer/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/customer/Registerpage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/customer/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/customer/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const TripSearchPage = lazy(() => import('./pages/customer/TripSearchPage').then((module) => ({ default: module.TripSearchPage })));
const TripDetailPage = lazy(() => import('./pages/customer/TripDetailPage').then((module) => ({ default: module.TripDetailPage })));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const BookingConfirmPage = lazy(() => import('./pages/customer/BookingConfirmPage').then((module) => ({ default: module.BookingConfirmPage })));
const MyBookingsPage = lazy(() => import('./pages/customer/MyBookingsPage').then((module) => ({ default: module.MyBookingsPage })));

// Driver layout/pages (lazy)
const DriverLayout = lazy(() => import('./layouts/DriverLayout').then((module) => ({ default: module.DriverLayout })));
const DriverLoginPage = lazy(() => import('./pages/driver/DriverLoginPage').then((module) => ({ default: module.DriverLoginPage })));
const DriverRegisterPage = lazy(() => import('./pages/driver/DriverRegisterPage').then((module) => ({ default: module.DriverRegisterPage })));
const DriverPendingPage = lazy(() => import('./pages/driver/DriverPendingPage').then((module) => ({ default: module.DriverPendingPage })));
const DriverDashboardPage = lazy(() => import('./pages/driver/DriverDashboardPage').then((module) => ({ default: module.DriverDashboardPage })));

// Admin layout/pages (lazy)
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage').then((module) => ({ default: module.AdminBookingsPage })));
const AdminTripDetailPage = lazy(() => import('./pages/admin/AdminTripDetailPage').then((module) => ({ default: module.AdminTripDetailPage })));
const AdminRefundOutboxPage = lazy(() => import('./pages/admin/AdminRefundOutboxPage').then((module) => ({ default: module.AdminRefundOutboxPage })));
const AdminTripsPage = lazy(() => import('./pages/admin/AdminTripsPage').then((module) => ({ default: module.AdminTripsPage })));
const AdminTripCreatePage = lazy(() => import('./pages/admin/AdminTripCreatePage').then((module) => ({ default: module.AdminTripCreatePage })));
const AdminVehiclesPage = lazy(() => import('./pages/admin/AdminVehiclesPage').then((module) => ({ default: module.AdminVehiclesPage })));
const AdminDriversPage = lazy(() => import('./pages/admin/AdminDriversPage').then((module) => ({ default: module.AdminDriversPage })));

// Error pages (lazy)
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const ForbiddenPage = lazy(() => import('./pages/errors/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })));


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
      { path: '/trips', element: <TripSearchPage /> },
      { path: '/trips/:id', element: <TripDetailPage /> },

      // Protected pages
      {
        element: <ProtectedRoute allowedRoles={['customer']} />,
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
      <ProtectedRoute allowedRoles={['driver']} redirectTo="/driver/login" />
    ),
    children: [
      { path: '/driver/pending', element: <DriverPendingPage /> },
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
  {
    element: <ProtectedRoute allowedRoles={['admin', 'manager']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminBookingsPage /> },
          { path: '/admin/trips', element: <AdminTripsPage /> },
          { path: '/admin/trips/new', element: <AdminTripCreatePage /> },
          { path: '/admin/trips/:id', element: <AdminTripDetailPage /> },
          { path: '/admin/refunds', element: <AdminRefundOutboxPage /> },
          { path: '/admin/vehicles', element: <AdminVehiclesPage /> },
          { path: '/admin/drivers', element: <AdminDriversPage /> },
        ],
      },
    ],
  },

  // Error pages
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

function FullPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<FullPageFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
