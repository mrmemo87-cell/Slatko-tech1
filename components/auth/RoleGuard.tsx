import React from 'react';
import { useAuth } from './AuthProvider';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard Component
 * Restricts component rendering based on user role
 * For workers: Only allows access to production-related features
 * For non-workers: Allows access to all features except those restricted to admins
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles,
  fallback 
}) => {
  const { user } = useAuth();
  
  if (!user) {
    return fallback || null;
  }

  const userRole = (user.role ?? '').toString().toLowerCase();
  const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole) || 
                   (allowedRoles.includes('*') && userRole);

  if (!isAllowed) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your role ({userRole}) does not have access to this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Hook to check if user has specific role
 */
export function useRoleCheck(allowedRoles: string[]): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const userRole = (user.role ?? '').toString().toLowerCase();
  return allowedRoles.some(role => role.toLowerCase() === userRole) || 
         allowedRoles.includes('*');
}

/**
 * Hook to check if current user is a worker
 */
export function useIsWorker(): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const role = (user.role ?? '').toString().toLowerCase();
  return ['worker', 'production', 'production_worker', 'production_staff', 'production-role'].includes(role);
}
