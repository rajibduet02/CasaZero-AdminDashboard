/**
 * Consistent user-facing error notifications + diagnostic logging.
 */

import { toast } from 'sonner';
import { parseApiError, type ParsedApiError } from './apiError';
import { reportError, type ErrorReportContext } from './reportError';

export type NotifyErrorOptions = {
  /** Short label for logs / toast title context, e.g. "Loading documents" */
  context?: string;
  /** Safe fallback when the error cannot be mapped */
  fallbackMessage?: string;
  /** Toast title (defaults to "Error") */
  title?: string;
  /** Extra description under the message */
  description?: string;
  /** Skip toast (caller shows inline UI instead) */
  silent?: boolean;
  /** Skip reportError (when already reported) */
  skipReport?: boolean;
  /** Merge into reportError context */
  reportContext?: ErrorReportContext;
  /** Toast duration ms */
  duration?: number;
};

const DEDUPE_MS = 2500;
const recentKeys = new Map<string, number>();

function dedupeKey(message: string, context?: string): string {
  return `${context ?? ''}::${message}`;
}

function shouldSkipDuplicate(key: string): boolean {
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) {
    return true;
  }
  recentKeys.set(key, now);
  // Opportunistic cleanup
  if (recentKeys.size > 40) {
    for (const [k, ts] of recentKeys) {
      if (now - ts > DEDUPE_MS) recentKeys.delete(k);
    }
  }
  return false;
}

export type NotifyErrorResult = ParsedApiError & { notified: boolean };

/**
 * Report + (optionally) toast a safe user-facing error.
 * Returns the parsed error for inline UI use.
 */
export function notifyError(
  error: unknown,
  options: NotifyErrorOptions = {},
): NotifyErrorResult {
  const parsed = parseApiError(error, {
    fallbackMessage: options.fallbackMessage,
  });

  if (!options.skipReport) {
    reportError(error, {
      source: 'notifyError',
      context: options.context,
      code: parsed.code,
      status: parsed.status,
      ...options.reportContext,
    });
  }

  if (options.silent) {
    return { ...parsed, notified: false };
  }

  const message = parsed.message;
  const key = dedupeKey(message, options.context);
  if (shouldSkipDuplicate(key)) {
    return { ...parsed, notified: false };
  }

  const title = options.title || (options.context ? options.context : 'Error');
  const description = options.description || message;

  toast.error(title, {
    description: options.context && !options.description ? message : description,
    duration: options.duration,
  });

  return { ...parsed, notified: true };
}

/**
 * Non-blocking warning (partial success / incomplete data).
 */
export function notifyWarning(
  message: string,
  options?: { title?: string; description?: string; context?: string },
): void {
  const key = dedupeKey(message, options?.context ?? 'warning');
  if (shouldSkipDuplicate(key)) return;
  toast.warning(options?.title || 'Warning', {
    description: options?.description || message,
  });
}

/** Session-storage key used when auth failure redirects to login. */
export const SESSION_EXPIRED_NOTICE_KEY = 'casazero_session_expired_notice';

export function setSessionExpiredNotice(reason?: string): void {
  try {
    sessionStorage.setItem(
      SESSION_EXPIRED_NOTICE_KEY,
      reason === 'missing_session' ? 'missing' : 'expired',
    );
  } catch {
    /* ignore */
  }
}

export function consumeSessionExpiredNotice(): string | null {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
    if (value) sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    return value;
  } catch {
    return null;
  }
}
