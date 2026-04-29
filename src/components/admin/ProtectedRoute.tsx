import React, { useLayoutEffect } from 'react';
import {
  getSessionRoleRaw,
  isAdmin,
  normalizeRbacRole,
  type DashboardRbacRole,
} from '../../utils/rbac';

export interface ProtectedRouteProps {
  roles: DashboardRbacRole[];
  sessionUser: { role?: unknown } | null | undefined;
  fallbackPage: string;
  onRedirect: (page: string) => void;
  children: React.ReactNode;
}

/**
 * Allows children when role matches `roles`, or when the route is superadmin-only and the user
 * is not explicitly a condominium `admin` (unknown / superadmin / legacy payloads keep full access).
 */
export function ProtectedRoute({
  roles,
  sessionUser,
  fallbackPage,
  onRedirect,
  children,
}: ProtectedRouteProps) {
  const norm = normalizeRbacRole(getSessionRoleRaw(sessionUser));
  const explicitlyCondoAdmin = isAdmin(sessionUser);
  const allowed =
    (norm != null && roles.includes(norm)) ||
    (!explicitlyCondoAdmin && roles.includes('superadmin'));

  useLayoutEffect(() => {
    if (!allowed) {
      onRedirect(fallbackPage);
    }
  }, [allowed, fallbackPage, onRedirect]);

  if (!allowed) return null;
  return <>{children}</>;
}
