import { useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';

export function useRequireRole(allowed: string[]) {
  const { user, loading } = useAuth();

  // Simple guard: wait until auth is resolved, then if the user exists and role is not allowed, redirect to root
  useEffect(() => {
    if (loading) return; // wait for auth/profile resolution
    if (!user) return; // not signed in

    // If role is not present on the profile, do not redirect (profile access may be blocked by RLS).
    if (!('role' in user) || !user.role) {
      console.warn('useRequireRole: user.role missing - skipping redirect (RLS or profile load issue)');
      return;
    }

    if (!allowed.includes(user.role)) {
      window.location.href = '/';
    }
  }, [user, allowed, loading]);
}

export default useRequireRole;
