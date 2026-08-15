/**
 * Admin dashboard URL map.
 * Browser URL is the source of truth for admin page navigation.
 * Existing callers keep using page ids (e.g. handleNavigate('users')).
 */

export const PATH_LOGIN = '/login';
export const PATH_SETUP = '/account-setup';
export const PATH_DASHBOARD = '/dashboard';
export const PATH_HOME = '/';

const ADMIN_RETURN_TO_KEY = 'casazero_admin_return_to';

export type AdminNavFilters = {
  residenceId?: number | null;
  unitId?: number | null;
};

/** Canonical page id → public path (chat residence pages are handled separately). */
const PAGE_TO_PATH: Record<string, string> = {
  dashboard: PATH_DASHBOARD,
  users: `${PATH_DASHBOARD}/users`,
  'residence-list': `${PATH_DASHBOARD}/residences`,
  residences: `${PATH_DASHBOARD}/residences`,
  units: `${PATH_DASHBOARD}/units`,
  'construction-phases': `${PATH_DASHBOARD}/construction-phases`,
  'document-list': `${PATH_DASHBOARD}/documents`,
  documents: `${PATH_DASHBOARD}/documents-library`,
  'maintenance-list': `${PATH_DASHBOARD}/maintenances`,
  maintenance: `${PATH_DASHBOARD}/maintenance-requests`,
  'residence-wise-maintenances': `${PATH_DASHBOARD}/residence-maintenances`,
  'support-list': `${PATH_DASHBOARD}/support`,
  'company-list': `${PATH_DASHBOARD}/companies`,
  'condominium-chat': `${PATH_DASHBOARD}/chat`,
  'assign-residences': `${PATH_DASHBOARD}/assign-residences`,
  settings: `${PATH_DASHBOARD}/settings`,
  buildings: `${PATH_DASHBOARD}/buildings`,
  analytics: `${PATH_DASHBOARD}/analytics`,
  notifications: `${PATH_DASHBOARD}/notifications`,
};

const PATH_TO_PAGE: Record<string, string> = {
  [PATH_DASHBOARD]: 'dashboard',
  [`${PATH_DASHBOARD}/users`]: 'users',
  [`${PATH_DASHBOARD}/residences`]: 'residence-list',
  [`${PATH_DASHBOARD}/units`]: 'units',
  [`${PATH_DASHBOARD}/construction-phases`]: 'construction-phases',
  [`${PATH_DASHBOARD}/documents`]: 'document-list',
  [`${PATH_DASHBOARD}/documents-library`]: 'documents',
  [`${PATH_DASHBOARD}/maintenances`]: 'maintenance-list',
  [`${PATH_DASHBOARD}/maintenance-requests`]: 'maintenance',
  [`${PATH_DASHBOARD}/residence-maintenances`]: 'residence-wise-maintenances',
  [`${PATH_DASHBOARD}/support`]: 'support-list',
  [`${PATH_DASHBOARD}/companies`]: 'company-list',
  [`${PATH_DASHBOARD}/chat`]: 'condominium-chat',
  [`${PATH_DASHBOARD}/assign-residences`]: 'assign-residences',
  [`${PATH_DASHBOARD}/settings`]: 'settings',
  [`${PATH_DASHBOARD}/buildings`]: 'buildings',
  [`${PATH_DASHBOARD}/analytics`]: 'analytics',
  [`${PATH_DASHBOARD}/notifications`]: 'notifications',
};

const CHAT_PAGE_RE = /^condominium-chat-(\d+)$/;
const CHAT_PATH_RE = /^\/dashboard\/chat\/(\d+)$/;

export function isAdminPath(pathname: string): boolean {
  return pathname === PATH_DASHBOARD || pathname.startsWith(`${PATH_DASHBOARD}/`);
}

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return pathname || '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function parseAdminPage(pathname: string): string {
  const path = normalizePathname(pathname);
  if (path === PATH_DASHBOARD) return 'dashboard';

  const exact = PATH_TO_PAGE[path];
  if (exact) return exact;

  const chatMatch = CHAT_PATH_RE.exec(path);
  if (chatMatch) return `condominium-chat-${chatMatch[1]}`;

  const last = path.slice(path.lastIndexOf('/') + 1);
  return last || 'dashboard';
}

export function parseAdminFilters(search: string): AdminNavFilters {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    residenceId: positiveIntParam(params.get('residenceId')),
    unitId: positiveIntParam(params.get('unitId')),
  };
}

function positiveIntParam(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return !Number.isNaN(n) && n > 0 ? n : undefined;
}

export function buildAdminHref(page: string, filters?: AdminNavFilters): string {
  const chatMatch = CHAT_PAGE_RE.exec(page);
  const path = chatMatch
    ? `${PATH_DASHBOARD}/chat/${chatMatch[1]}`
    : PAGE_TO_PATH[page] ?? `${PATH_DASHBOARD}/${page}`;

  const params = new URLSearchParams();
  if (filters?.unitId != null && filters.unitId > 0) {
    params.set('unitId', String(filters.unitId));
  }
  if (filters?.residenceId != null && filters.residenceId > 0) {
    params.set('residenceId', String(filters.residenceId));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseAdminLocation(pathname: string, search = ''): {
  page: string;
  filters: AdminNavFilters;
} {
  return {
    page: parseAdminPage(pathname),
    filters: parseAdminFilters(search),
  };
}

export function saveAdminReturnTo(pathname: string, search = ''): void {
  if (typeof window === 'undefined') return;
  if (!isAdminPath(pathname)) return;
  sessionStorage.setItem(ADMIN_RETURN_TO_KEY, `${pathname}${search || ''}`);
}

export function consumeAdminReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  const href = sessionStorage.getItem(ADMIN_RETURN_TO_KEY);
  sessionStorage.removeItem(ADMIN_RETURN_TO_KEY);
  if (!href) return null;
  const path = href.split('?')[0];
  return isAdminPath(path) ? href : null;
}

export function clearAdminReturnTo(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_RETURN_TO_KEY);
}

export function locationHref(pathname: string, search = ''): string {
  return `${pathname}${search || ''}`;
}
