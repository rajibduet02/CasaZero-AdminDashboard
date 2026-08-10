import React, { useLayoutEffect } from 'react';
import { getSafeRole, type DashboardRbacRole } from '../../utils/rbac';

export interface ProtectedRouteProps {
  roles: DashboardRbacRole[];
  sessionUser: { role?: unknown } | null | undefined;
  fallbackPage: string;
  onRedirect: (page: string) => void;
  children: React.ReactNode;
}

/**
 * RBAC gate for superadmin-only pages — not session authentication.
 * Session validity is enforced in `App.tsx` (`authStatus`) and via `apiFetch` 401 handling.
 */
export function ProtectedRoute({
  roles,
  sessionUser,
  fallbackPage,
  onRedirect,
  children,
}: ProtectedRouteProps) {
  const allowed = getSafeRole(sessionUser) === 'superadmin' && roles.includes('superadmin');

  useLayoutEffect(() => {
    if (!allowed) {
      onRedirect(fallbackPage);
    }
  }, [allowed, fallbackPage, onRedirect]);

  if (!allowed) return null;
  return <>{children}</>;
}
