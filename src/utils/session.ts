export type CanonicalRole = 'client' | 'admin' | 'super_admin';

export const SESSION_KEYS = ['casazero_token', 'casazero_user', 'casazero_role'] as const;

export function normalizeRole(raw: unknown): CanonicalRole {
  const role = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'superadministrator' ||
    role === 'super_administrator'
  ) {
    return 'super_admin';
  }

  if (role === 'admin' || role === 'administrator') {
    return 'admin';
  }

  return 'client';
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('casazero_token');
}

export function getSessionUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('casazero_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getSessionRole(): CanonicalRole {
  const user = getSessionUser<{ role?: unknown }>();
  const rawRole = user?.role ?? (typeof window !== 'undefined' ? localStorage.getItem('casazero_role') : null);
  return normalizeRole(rawRole);
}

export function setSession(input: { token: string; user: Record<string, unknown> }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('casazero_token', input.token);
  localStorage.setItem('casazero_user', JSON.stringify(input.user));
  localStorage.setItem('casazero_role', normalizeRole((input.user as { role?: unknown }).role));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }
}

export function clearFirstLoginFlags(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('casazero_setup_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Local persistence check only — does **not** prove the API token is still valid.
 * Use `validateStoredSession()` / `apiFetch` 401 handling for real session validity.
 */
export function isAuthenticated(): boolean {
  return !!(getSessionToken() && getSessionUser());
}
