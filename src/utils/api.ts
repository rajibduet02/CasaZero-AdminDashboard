/**
 * Shared API configuration and helpers for consistent fetch/JSON handling.
 * Use these across admin and list components to avoid duplication and ensure
 * proper error handling for HTML/empty responses.
 *
 * **Hosts:** `API_BASE` / `API_ORIGIN` are the single backend for every dashboard
 * role — condominium `admin` and global `superadmin` both use the same URLs;
 * RBAC only controls which screens render, not which host is called.
 */

import { resolveSessionUser } from './rbac';

export const API_BASE = 'https://backend.casazero.site/api';

/** Origin of the Laravel API (`API_BASE` without `/api` path) — for absolute file/storage URLs. */
export const API_ORIGIN = new URL(API_BASE).origin;

/** API `status` field often boolean or 1/0. */
export function isApiTruthyStatus(status: unknown): boolean {
  return status === true || status === 1 || status === '1';
}

/**
 * Normalize POST /residences (and similar) JSON payloads to a residence row array.
 */
export function residencesArrayFromApiResult(
  result: Record<string, unknown> | null | undefined,
): unknown[] {
  if (!result) return [];
  const d = result.data as unknown;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    const nested = (d as Record<string, unknown>).data;
    if (Array.isArray(nested)) return nested;
    const res = (d as Record<string, unknown>).residences;
    if (Array.isArray(res)) return res;
  }
  const top = (result as Record<string, unknown>).residences;
  if (Array.isArray(top)) return top;
  return [];
}

export type FetchResidencesCatalogOptions = {
  /** Merged session (e.g. `resolveSessionUser(userData)` from AdminApp). */
  sessionUser?: Record<string, unknown> | null;
  /** POST `/residences` body: filter flag (e.g. unassigned vs full catalog). Omit for legacy behavior without the field. */
  is_null?: boolean;
};

/**
 * Logged-in user id from `web_login` `data.user` (stored in `casazero_user`) — same value the API expects as `residence_admin`.
 */
export function getSessionResidenceAdminId(
  sessionUser?: Record<string, unknown> | null,
): number | null {
  const session = sessionUser ?? resolveSessionUser();
  if (!session || typeof session !== 'object') return null;

  const toPositiveInt = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' && Number.isFinite(v) ? v : parseInt(String(v).trim(), 10);
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
  };

  const fromRecord = (r: Record<string, unknown>): number | null =>
    toPositiveInt(r.id) ??
    toPositiveInt(r.user_id) ??
    toPositiveInt(r.userId) ??
    toPositiveInt(r.entry_user_id) ??
    toPositiveInt(r.admin_id);

  const direct = fromRecord(session);
  if (direct != null) return direct;

  const nested = session.user;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return fromRecord(nested as Record<string, unknown>);
  }

  return null;
}

/**
 * JSON body for POST `/residences`: `{ residence_admin, is_null? }` from session (see {@link getSessionResidenceAdminId}).
 * Falls back to `{}` only when no user id can be resolved (unless `is_null` is still passed).
 */
export function buildResidencesCatalogRequestBody(
  sessionUser?: Record<string, unknown> | null,
  options?: { is_null?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const adminId = getSessionResidenceAdminId(sessionUser);
  if (adminId != null) {
    body.residence_admin = adminId;
  }
  if (options?.is_null !== undefined) {
    body.is_null = options.is_null;
  }
  return body;
}

/**
 * Role-based residence list: POST `API_BASE/residences` with JSON body from {@link buildResidencesCatalogRequestBody}.
 */
export async function fetchResidencesCatalog(
  options?: FetchResidencesCatalogOptions,
): Promise<Response> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('casazero_token') : null;
  const session =
    options?.sessionUser !== undefined ? options.sessionUser : resolveSessionUser();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = buildResidencesCatalogRequestBody(session ?? null, {
    is_null: options?.is_null,
  });

  return fetch(`${API_BASE}/residences`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Units list for admin dashboard: POST `API_BASE/unit_list` with the same role-scoped body as residences.
 */
export async function fetchUnitListCatalog(
  options?: FetchResidencesCatalogOptions,
): Promise<Response> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('casazero_token') : null;
  const session =
    options?.sessionUser !== undefined ? options.sessionUser : resolveSessionUser();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = buildResidencesCatalogRequestBody(session ?? null);

  return fetch(`${API_BASE}/unit_list`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Safely parse a Response as JSON. Detects HTML error pages and empty body,
 * and throws with clear messages. Use for all API responses that should be JSON.
 */
export async function safeJsonParse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const text = await response.text();

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
  }

  if (!text || text.trim() === '') {
    throw new Error('Server returned empty response');
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Format a date string for display. Returns "—" for null/undefined/invalid.
 * Uses locale for month names when language is provided.
 */
export function formatDate(
  dateString: string | null | undefined,
  options?: { locale?: string; language?: 'it' | 'en' }
): string {
  if (dateString == null || String(dateString).trim() === '') return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  const language = options?.language ?? (options?.locale?.startsWith('it') ? 'it' : 'en');
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames =
    language === 'it'
      ? ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date in short locale form (e.g. for document lists).
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (dateString == null || String(dateString).trim() === '') return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
