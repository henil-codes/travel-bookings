import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { api } from "../../core/api";
import { Spinner } from "../../components/ui/Spinner";

export function OAuthCallback() {
const [isInitializing, setIsInitializing] = useState(true);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    // When the app boots, check if the browser has a valid cookie session
    api.get('/auth/me')
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
}