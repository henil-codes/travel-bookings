import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../core/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Spinner } from '../../components/ui/Spinner';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=auth_failed');
      return;
    }

    // Set token, fetch user profile, and redirect to dashboard
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    api
      .get('/auth/me')
      .then((res) => {
        const user = res.data.data.user;
        setAuth(user, token);

        // Redirect straight to dashboard based on role!
        const dest = user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver/dashboard' : '/';
        navigate(dest, { replace: true });
      })
      .catch(() => {
        navigate('/login?error=profile_fetch_failed');
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Spinner size="lg" />
      <p className="mt-4 text-slate-500 font-medium">
        Authenticating your account...
      </p>
    </div>
  );
}
