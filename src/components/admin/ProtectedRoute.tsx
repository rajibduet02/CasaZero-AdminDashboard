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
 * Superadmin-only wrappers: strictly allows children only when resolved tier is explicitly superadmin.
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
