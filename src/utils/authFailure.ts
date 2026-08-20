/**
 * Centralized authentication-failure handling for the admin dashboard.
 * Single-flight: concurrent 401s trigger at most one logout/redirect.
 */

import { toast } from 'sonner';
import { clearSession } from './session';
import { reportError } from './reportError';

export type AuthFailureReason =
  | 'api_401'
  | 'session_validation_failed'
  | 'missing_session'
  | 'manual';

export type AuthFailureMeta = {
  reason?: AuthFailureReason;
  status?: number;
  url?: string;
};

type AuthFailureListener = (meta: AuthFailureMeta) => void;

let isHandlingAuthFailure = false;
let listener: AuthFailureListener | null = null;

/** True while a session-invalidating logout/redirect is in progress. */
export function isHandlingAuthenticationFailure(): boolean {
  return isHandlingAuthFailure;
}

/**
 * Register the app-level handler (typically App.tsx logout).
 * Returns an unsubscribe function.
 */
export function onAuthenticationFailure(cb: AuthFailureListener): () => void {
  listener = cb;
  return () => {
    if (listener === cb) listener = null;
  };
}

/** Call after a successful login so a future expiry can invalidate the session again. */
export function resetAuthenticationFailureGate(): void {
  isHandlingAuthFailure = false;
}

/**
 * Invalidate the current session and notify the app to show Login.
 * Safe to call many times; only the first call runs the full flow.
 */
export function handleAuthenticationFailure(meta: AuthFailureMeta = {}): void {
  if (isHandlingAuthFailure) {
    return;
  }
  isHandlingAuthFailure = true;

  if (import.meta.env.DEV) {
    console.info('[AUTH] Authentication failure detected', {
      reason: meta.reason ?? 'unknown',
      status: meta.status,
      url: meta.url ? sanitizeUrlForLog(meta.url) : undefined,
    });
    console.info('[AUTH] Clearing session');
    console.info('[AUTH] Redirecting to login');
  }

  try {
    toast.dismiss();
  } catch {
    /* ignore */
  }

  clearSession();

  try {
    listener?.(meta);
  } catch (err) {
    reportError(err, { source: 'authFailure.listener' });
  }
}

/** Never log tokens or query secrets. */
function sanitizeUrlForLog(url: string): string {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/** HTTP statuses that mean the Laravel API session/token is invalid. */
export function isAuthenticationFailureStatus(status: number): boolean {
  return status === 401;
}

/**
 * Backend often returns JSON like `{ status: false, message: "Invalid token" }`
 * (sometimes without relying on Bearer). Detect those auth-failure payloads.
 */
export function isInvalidTokenPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  const candidates: unknown[] = [record.message, record.error];
  if (record.error && typeof record.error === 'object') {
    candidates.push(JSON.stringify(record.error));
  }
  const text = candidates
    .filter((v) => v != null && typeof v !== 'object')
    .map((v) => String(v).toLowerCase())
    .join(' ');
  if (!text) return false;
  return (
    text.includes('invalid token') ||
    text.includes('invalid api token') ||
    text.includes('unauthenticated') ||
    text.includes('token expired') ||
    text.includes('token has expired') ||
    text.includes('revoked token')
  );
}
