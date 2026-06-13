import { normalizeRole } from './session';

/**
 * Dashboard RBAC: API returns condominium `admin` vs full `superadmin` (and legacy spellings).
 * Used for sidebar, page guards, and safe checks — backend remains authoritative for data.
 */

export type DashboardRbacRole = 'superadmin' | 'admin';

/** Result of resolving the session role string — unknown users are fail-closed to restricted-tier behavior elsewhere. */
export type ResolvedRbacRole = DashboardRbacRole | 'unknown';

/** Flatten role from API (string, slug object, nested user). */
export function getSessionRoleRaw(user: { role?: unknown } | Record<string, unknown> | null | undefined): unknown {
  if (user == null || typeof user !== 'object') return undefined;
  const u = user as Record<string, unknown>;
  const nested = u.user;
  const nestedObj =
    nested && typeof nested === 'object' && !Array.isArray(nested) ? (nested as Record<string, unknown>) : null;
  return (
    u.role ??
    u.user_role ??
    u.role_name ??
    u.role_slug ??
    nestedObj?.role ??
    u.type
  );
}

function coerceRoleToComparableString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return coerceRoleToComparableString(o.slug ?? o.name ?? o.value ?? o.role ?? o.title);
  }
  return String(raw).trim();
}

export function normalizeRbacRole(raw: unknown): ResolvedRbacRole {
  const s = coerceRoleToComparableString(raw);
  if (s === '') return 'unknown';
  const canonical = normalizeRole(s);
  if (canonical === 'super_admin') return 'superadmin';
  if (canonical === 'admin') return 'admin';
  return 'unknown';
}

/**
 * Collapsed tier for guards: explicit superadmin, otherwise restricted (admin / condominium) tier —
 * treats unknown roles as restricted, never as superadmin.
 */
export function getSafeRole(user: { role?: unknown } | null | undefined): DashboardRbacRole {
  const r = normalizeRbacRole(getSessionRoleRaw(user));
  return r === 'superadmin' ? 'superadmin' : 'admin';
}

export function readSessionUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('casazero_user');
    if (!s) return null;
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Prefer in-memory `userData` merged with `casazero_user` so role survives partial props / refresh.
 */
function hasUsableUserId(r: Record<string, unknown>): boolean {
  const v = r.id ?? r.user_id ?? r.userId ?? r.entry_user_id;
  if (v == null || v === '') return false;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return !Number.isNaN(n) && n > 0;
}

export function resolveSessionUser(userData?: { role?: unknown } | null): Record<string, unknown> | null {
  const stored = readSessionUser();
  if (userData && typeof userData === 'object') {
    const u = userData as Record<string, unknown>;
    if (Object.keys(u).length === 0) return stored;
    const merged: Record<string, unknown> = { ...(stored ?? {}), ...u };
    // Partial React state can omit `id`; web_login stores it on `casazero_user` — keep it for residence_admin APIs.
    if (stored && !hasUsableUserId(merged)) {
      if (stored.id != null && stored.id !== '') merged.id = stored.id;
      if (stored.user_id != null && stored.user_id !== '') merged.user_id = stored.user_id;
    }
    return merged;
  }
  return stored;
}

export function isSuperAdmin(user: { role?: unknown } | null | undefined): boolean {
  return normalizeRbacRole(getSessionRoleRaw(user)) === 'superadmin';
}

/** Condominium administrator (not superadmin). */
export function isAdmin(user: { role?: unknown } | null | undefined): boolean {
  return normalizeRbacRole(getSessionRoleRaw(user)) === 'admin';
}

/** i18n key for dashboard header / sidebar panel title. */
export function adminPanelTitleKey(
  user: { role?: unknown } | null | undefined,
): 'superAdminPanel' | 'adminPanel' {
  return isSuperAdmin(user) ? 'superAdminPanel' : 'adminPanel';
}

/** Email from web_login user object (stored in `casazero_user`). */
export function getSessionUserEmail(
  user?: Record<string, unknown> | null,
): string {
  const session = user ?? readSessionUser();
  if (!session || typeof session !== 'object') return '';

  const pick = (r: Record<string, unknown>): string => String(r.email ?? '').trim();

  const direct = pick(session);
  if (direct) return direct;

  const nested = session.user;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return pick(nested as Record<string, unknown>);
  }

  return '';
}

/** Pages condominium admins must not open (direct URL or stale state). */
export const SUPERADMIN_ONLY_ADMIN_PAGES = new Set<string>([
  'construction-phases',
  'assign-residences',
  'document-list',
  'documents',
  'support-list',
  'company-list',
  'users',
  'analytics',
  'notifications',
  'settings',
  'buildings',
]);

export function canCondominiumAdminAccessPage(page: string): boolean {
  if (SUPERADMIN_ONLY_ADMIN_PAGES.has(page)) return false;
  if (
    page === 'dashboard' ||
    page === 'residences' ||
    page === 'residence-list' ||
    page === 'units' ||
    page === 'maintenance-list'
  )
    return true;
  if (page === 'condominium-chat' || /^condominium-chat-\d+$/.test(page)) return true;
  return false;
}

export function canAccessChatResidence(
  user: { residences?: unknown } | null | undefined,
  residenceId: number,
  allowedResidenceIds?: number[],
): boolean {
  if (user == null) return false;
  if (isSuperAdmin(user)) return true;
  if (allowedResidenceIds?.length) {
    return allowedResidenceIds.includes(residenceId);
  }
  const list = user.residences;
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.some((r: { residence_id?: unknown; id?: unknown }) => {
    const id = Number((r as { residence_id?: unknown }).residence_id ?? (r as { id?: unknown }).id);
    return !Number.isNaN(id) && id === residenceId;
  });
}
