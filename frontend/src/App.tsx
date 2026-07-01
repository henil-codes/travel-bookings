import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProctedRoute } from './core/ProctectedRoute';
import { CustomerLayout } from './layouts/CustomerLayout';
import { LoginPage } from './pages/customer/LoginPage';
import { RegisterPage } from './pages/customer/Registerpage';
import { ForgotPasswordPage } from './pages/customer/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/customer/ResetPasswordPage';
import { HomePage } from './pages/customer/HomePage'
import { TripDetailPage } from './pages/customer/TripDetailPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { BookingConfirmPage } from './pages/customer/BookingConfirmPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';

const router = createBrowserRouter([
  // Public auth pages
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
          { path: '/booking/confirm/:bookingId', element: <BookingConfirmPage /> },
          { path: '/my-bookings', element: <MyBookingsPage /> }
        ],
      },
    ],
  },

  // Driver routes
  // Admin routes

  // Error pages
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return <RouterProvider router={router} />;
}
