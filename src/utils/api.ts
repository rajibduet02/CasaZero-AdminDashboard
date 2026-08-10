/**
 * Shared API configuration and helpers for consistent fetch/JSON handling.
 * Use these across admin and list components to avoid duplication and ensure
 * proper error handling for HTML/empty responses.
 *
 * **Hosts:** `API_BASE` / `API_ORIGIN` are the single backend for every dashboard
 * role — condominium `admin` and global `superadmin` both use the same URLs;
 * RBAC only controls which screens render, not which host is called.
 *
 * **Auth:** Prefer {@link apiFetch} for all authenticated Laravel API calls.
 * A 401 response triggers centralized session invalidation (see `authFailure.ts`).
 */

import { resolveChatSenderDisplayName } from './chatDisplay';
import {
  handleAuthenticationFailure,
  isAuthenticationFailureStatus,
  isInvalidTokenPayload,
} from './authFailure';
import { resolveSessionUser } from './rbac';
import { getSessionToken, getSessionUser } from './session';

/** Real Laravel host (always absolute — used for storage URLs and the Vite dev proxy target). */
export const API_HOST = 'https://backend.casazero.site';

/**
 * API prefix for fetch calls.
 * In local Vite dev, use same-origin `/api` (proxied) so browser CORS to localhost is not required.
 * Production keeps the absolute backend URL (CORS allows `https://casazero.site`).
 */
export const API_BASE = import.meta.env.DEV ? '/api' : `${API_HOST}/api`;

/** Origin of the Laravel API — for absolute file/storage URLs. */
export const API_ORIGIN = API_HOST;

export type ApiFetchOptions = RequestInit & {
  /** Do not attach `Authorization: Bearer` from the stored session. */
  skipAuth?: boolean;
  /** Do not invalidate the session on HTTP 401 (e.g. login credential failures). */
  skipAuthFailureHandling?: boolean;
};

/**
 * Centralized fetch for Laravel API calls.
 * - Attaches Bearer token from session when available (unless `skipAuth`).
 * - On HTTP 401, runs {@link handleAuthenticationFailure} once (single-flight).
 * - Does **not** treat 403 as logout (permission ≠ invalid session).
 */
export async function apiFetch(input: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth = false, skipAuthFailureHandling = false, headers, ...rest } = options;

  const merged = new Headers(headers);
  if (!merged.has('Accept')) {
    merged.set('Accept', 'application/json');
  }

  if (!skipAuth) {
    const token = getSessionToken();
    if (token && !merged.has('Authorization')) {
      merged.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(input, { ...rest, headers: merged });

  if (!skipAuthFailureHandling) {
    const url = typeof input === 'string' ? input : undefined;

    if (isAuthenticationFailureStatus(response.status)) {
      handleAuthenticationFailure({
        reason: 'api_401',
        status: response.status,
        url,
      });
    } else {
      // Many CasaZero routes authenticate via body `api_token` and may return
      // JSON "Invalid token" without a reliable Bearer check. Peek without
      // consuming the caller's response body.
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const peek = await response.clone().json();
          if (isInvalidTokenPayload(peek)) {
            handleAuthenticationFailure({
              reason: 'api_401',
              status: response.status,
              url,
            });
          }
        } catch {
          /* ignore non-JSON / empty */
        }
      }
    }
  }

  return response;
}

export type SessionValidationResult =
  | { ok: true }
  | { ok: false; reason: 'missing_session' | 'unauthorized' | 'invalid_response' };

/**
 * Server-side check that the stored API token is still accepted.
 *
 * Important: many routes ignore Bearer and/or do not auth at all
 * (e.g. GET `/single/user/:id` returns 200 with a garbage token).
 * Validation must call an endpoint that verifies body `api_token`.
 *
 * Network/5xx (non-auth) failures are inconclusive (`ok: true`) so transient
 * outages do not force logout.
 */
export async function validateStoredSession(): Promise<SessionValidationResult> {
  const token = getSessionToken();
  const user = getSessionUser<Record<string, unknown>>();
  if (!token || !user) {
    return { ok: false, reason: 'missing_session' };
  }

  try {
    // Confirmed backend contract: invalid api_token → HTTP 401 + "Invalid token".
    const response = await apiFetch(`${API_BASE}/admin-dashboard/overview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_token: token }),
    });

    if (isAuthenticationFailureStatus(response.status)) {
      return { ok: false, reason: 'unauthorized' };
    }

    const data = await response.clone().json().catch(() => null);
    if (isInvalidTokenPayload(data)) {
      handleAuthenticationFailure({
        reason: 'api_401',
        status: response.status,
        url: `${API_BASE}/admin-dashboard/overview`,
      });
      return { ok: false, reason: 'unauthorized' };
    }

    // Non-auth failures (403/404/5xx): do not treat as expired session.
    return { ok: true };
  } catch {
    // Network errors must not force logout.
    return { ok: true };
  }
}

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
 * Resolve the logged-in user's display name for chat — session first, then GET /single/user/:id.
 */
export async function fetchSessionUserDisplayName(
  sessionUser?: Record<string, unknown> | null,
): Promise<string> {
  const session = sessionUser ?? resolveSessionUser();
  const fromSession = resolveChatSenderDisplayName(session);
  if (fromSession) return fromSession;

  const userId = getSessionResidenceAdminId(session);
  if (userId == null) return '';

  try {
    const response = await apiFetch(`${API_BASE}/single/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return '';
    const data = (await response.json()) as {
      status?: unknown;
      user?: Record<string, unknown>;
    };
    if (!isApiTruthyStatus(data.status) || !data.user) return '';
    return resolveChatSenderDisplayName(data.user);
  } catch {
    return '';
  }
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
  const session =
    options?.sessionUser !== undefined ? options.sessionUser : resolveSessionUser();

  const body = buildResidencesCatalogRequestBody(session ?? null, {
    is_null: options?.is_null,
  });

  return apiFetch(`${API_BASE}/residences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Units list for admin dashboard: POST `API_BASE/unit_list` with the same role-scoped body as residences.
 */
export async function fetchUnitListCatalog(
  options?: FetchResidencesCatalogOptions,
): Promise<Response> {
  const session =
    options?.sessionUser !== undefined ? options.sessionUser : resolveSessionUser();

  const body = buildResidencesCatalogRequestBody(session ?? null);

  return apiFetch(`${API_BASE}/unit_list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Residence ids from `web_login` session payload when catalog is unavailable. */
export function residenceIdsFromSessionUser(
  sessionUser?: Record<string, unknown> | null,
): number[] {
  const res = sessionUser?.residences;
  if (!Array.isArray(res)) return [];
  return res
    .map((row) => {
      const r = row as { residence_id?: unknown; id?: unknown };
      return Number(r.residence_id ?? r.id);
    })
    .filter((id) => !Number.isNaN(id) && id > 0);
}

export function residenceIdsFromCatalogResult(
  result: Record<string, unknown> | null | undefined,
): number[] {
  return residencesArrayFromApiResult(result)
    .map((row) => Number((row as { id?: unknown }).id))
    .filter((id) => !Number.isNaN(id) && id > 0);
}

/** Assigned residences for a condominium admin (catalog first, then session fallback). */
export async function resolveAssignedResidenceIds(
  sessionUser?: Record<string, unknown> | null,
): Promise<number[]> {
  try {
    const response = await fetchResidencesCatalog({ sessionUser });
    const result = await safeJsonParse<Record<string, unknown>>(response);
    if (isApiTruthyStatus(result.status)) {
      const ids = residenceIdsFromCatalogResult(result);
      if (ids.length > 0) return ids;
    }
  } catch {
    /* fall through to session residences */
  }
  return residenceIdsFromSessionUser(sessionUser ?? resolveSessionUser());
}

export async function fetchResidenceWiseMaintenances(
  residenceId: number,
  apiToken: string,
): Promise<unknown[]> {
  const response = await apiFetch(`${API_BASE}/residence_wise/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ residence_id: residenceId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await safeJsonParse<{ status?: unknown; data?: unknown[] }>(response);
  if (isApiTruthyStatus(data.status) && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export type ResidenceWiseMaintenanceRow = {
  raw: unknown;
  residenceId: number;
};

/**
 * Condominium admins are scoped to assigned residences via POST `/residence_wise/maintenance`.
 * Superadmin uses GET `/all_maintenance/admin` for the full catalog.
 */
export async function fetchCondominiumAdminMaintenances(
  sessionUser?: Record<string, unknown> | null,
  options?: { residenceId?: number | null },
): Promise<ResidenceWiseMaintenanceRow[]> {
  const apiToken =
    getSessionToken() ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('casazero_token') : null) ||
    '';
  if (!apiToken) return [];

  const targetResidenceId = options?.residenceId;
  if (targetResidenceId != null && !Number.isNaN(targetResidenceId)) {
    const rows = await fetchResidenceWiseMaintenances(targetResidenceId, apiToken);
    return rows.map((raw) => ({ raw, residenceId: targetResidenceId }));
  }

  const residenceIds = await resolveAssignedResidenceIds(sessionUser);
  if (residenceIds.length === 0) return [];

  if (residenceIds.length === 1) {
    const residenceId = residenceIds[0];
    const rows = await fetchResidenceWiseMaintenances(residenceId, apiToken);
    return rows.map((raw) => ({ raw, residenceId }));
  }

  const merged: ResidenceWiseMaintenanceRow[] = [];
  const seen = new Set<string>();
  for (const residenceId of residenceIds) {
    try {
      const rows = await fetchResidenceWiseMaintenances(residenceId, apiToken);
      rows.forEach((raw, index) => {
        const recordId = Number(
          (raw as { id?: unknown; maintenance_id?: unknown }).id ??
            (raw as { maintenance_id?: unknown }).maintenance_id,
        );
        const dedupeKey =
          !Number.isNaN(recordId) && recordId > 0
            ? `${residenceId}:${recordId}`
            : `${residenceId}:row:${index}:${merged.length}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        merged.push({ raw, residenceId });
      });
    } catch {
      /* skip failed residence */
    }
  }
  return merged;
}

/** Resident row from POST `/private-chat/residents`. */
export type PrivateChatResident = {
  id: number;
  user_name: string;
  email: string;
  phone: string;
  profile_image: string | null;
  residence_id: number;
  residence_name: string;
};

/**
 * Private messenger contact list for a condominium admin.
 * POST `API_BASE/private-chat/residents` with `{ admin_id }`.
 */
export async function fetchPrivateChatResidents(adminId: number): Promise<Response> {
  return apiFetch(`${API_BASE}/private-chat/residents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ admin_id: adminId }),
  });
}

export type SendChatNotificationParams = {
  receiver_id: number;
  sender_id: number;
  title: string;
  body: string;
};

/** Fire-and-forget push for one chat recipient — does not throw. */
export async function sendChatNotification(
  params: SendChatNotificationParams,
): Promise<void> {
  try {
    const response = await apiFetch(`${API_BASE}/send-chat-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.warn('[Chat] Push notification HTTP error:', response.status);
      return;
    }

    const result = await safeJsonParse<{ status?: unknown; message?: string }>(response);
    if (!isApiTruthyStatus(result.status)) {
      console.warn('[Chat] Push notification failed:', result.message);
    }
  } catch (err) {
    console.warn('[Chat] Push notification error:', err);
  }
}

/** Notify residents in a residence group chat (excluding sender). Fire-and-forget. */
export async function sendResidenceGroupChatNotifications(
  residenceId: number,
  senderId: number,
  body: string,
): Promise<void> {
  try {
    const response = await fetchPrivateChatResidents(senderId);
    if (!response.ok) return;

    const result = await safeJsonParse<{ status?: unknown; data?: PrivateChatResident[] }>(
      response,
    );
    if (!isApiTruthyStatus(result.status) || !Array.isArray(result.data)) return;

    const receivers = result.data.filter(
      (resident) => resident.residence_id === residenceId && resident.id !== senderId,
    );

    await Promise.all(
      receivers.map((resident) =>
        sendChatNotification({
          receiver_id: resident.id,
          sender_id: senderId,
          title: 'New Message',
          body,
        }),
      ),
    );
  } catch (err) {
    console.warn('[Chat] Group push notification error:', err);
  }
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
