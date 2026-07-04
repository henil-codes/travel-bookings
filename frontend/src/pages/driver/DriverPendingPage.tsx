import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';

export function DriverPendingPage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'driver' && user.accountStatus === 'active') {
      navigate('/driver/dashboard', { replace: true });
    }
  }, [user, navigate]);

  function handleSignout() {
    clearAuth();
    navigate('/driver/login', { replace: true });
  }

  const isSuspended = user?.accountStatus === 'suspended';

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl p-10 shadow-2xl">
          {isSuspended ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Account suspended
              </h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Your driver account has been suspended. Please contact our
                support team for more information.
              </p>
            </>
          ) : (
            <>
              {/* Pending approval state*/}
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Application under review
              </h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Your driver application has been submitted and is being reviewed
                by our team. You will receive an email notification once your
                application has been approved or if any additional information
                is required.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mt-6 text-left text-sm space-y-2">
                {[
                  { icon: '✓', text: 'Application submitted', done: true },
                  { icon: '⏳', text: 'Backgroud verification', done: false },
                  { icon: '—', text: 'Account activation', done: false },
                ].map(({ icon, text, done }) => (
                  <div
                    key={text}
                    className={`flex items-center gap-2 ${done ? 'text-green-600' : 'text-slate-400'}`}
                  >
                    <span className="w-5 text-center font-mono text-xs">
                      {icon}
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Once approved, sign in again to access your dashboard.
              </p>
            </>
          )}
          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={handleSignout}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
