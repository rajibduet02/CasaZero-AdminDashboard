/**
 * Production-safe error reporting foundation.
 * Sanitizes sensitive fields before any console output. No external APM.
 */

const SENSITIVE_KEY =
  /^(api_token|authorization|password|secret|cookie|credentials|firebase_token|bearer|private_key|access_token|refresh_token)$/i;

const SENSITIVE_FRAGMENT =
  /(api_token|authorization|bearer\s+[a-z0-9._-]+|password|secret|cookie|credentials|firebase_token|private_key)/i;

export type ErrorReportContext = Record<string, unknown>;

/** Deep-clone context while redacting sensitive keys and string fragments. */
export function sanitizeErrorContext(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Truncated]';
  if (value == null) return value;

  if (typeof value === 'string') {
    if (SENSITIVE_FRAGMENT.test(value) && value.length > 24) {
      return '[REDACTED]';
    }
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeErrorContext(value.message, depth + 1),
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeErrorContext(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = '[REDACTED]';
        continue;
      }
      out[key] = sanitizeErrorContext(nested, depth + 1);
    }
    return out;
  }

  return String(value);
}

/**
 * Log an unexpected error without leaking tokens, passwords, or auth headers.
 * Safe in development and production.
 */
export function reportError(error: unknown, context?: ErrorReportContext): void {
  const safeError = sanitizeErrorContext(error);
  const safeContext = context ? (sanitizeErrorContext(context) as ErrorReportContext) : undefined;

  if (safeContext && Object.keys(safeContext).length > 0) {
    console.error('[CasaZero]', safeError, safeContext);
  } else {
    console.error('[CasaZero]', safeError);
  }
}
