/**
 * Normalize API / network / runtime errors into a safe, user-facing shape.
 * Never return tokens, stack traces, or raw sensitive payloads.
 */

export type ParsedApiError = {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
};

const SENSITIVE =
  /(api_token|authorization|bearer\s+|password|secret|cookie|credentials|firebase_token|private_key)/i;

function sanitizeUserMessage(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (SENSITIVE.test(trimmed)) return fallback;
  // Avoid dumping HTML / huge blobs
  if (trimmed.startsWith('<') || trimmed.length > 280) return fallback;
  return trimmed;
}

function messageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request could not be processed. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 422:
      return 'Some fields are invalid. Please review and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again later.';
    default:
      if (status >= 500) {
        return 'The server is temporarily unavailable. Please try again later.';
      }
      if (status >= 400) {
        return 'The request could not be completed. Please try again.';
      }
      return 'Something went wrong. Please try again.';
  }
}

function extractFieldErrors(data: Record<string, unknown>): Record<string, string[]> | undefined {
  const errors = data.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.map((v) => String(v)).filter(Boolean);
    } else if (typeof value === 'string' && value.trim()) {
      out[key] = [value];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function messageFromPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  const candidates = [record.message, record.error, record.msg];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      return sanitizeUserMessage(c, fallback);
    }
  }
  return fallback;
}

/**
 * Parse an HTTP Response (and optional already-read JSON body) into a safe error.
 */
export async function parseApiResponseError(
  response: Response,
  body?: unknown,
): Promise<ParsedApiError> {
  const status = response.status;
  const fallback = messageFromStatus(status);
  let data = body;

  if (data === undefined) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.clone().json();
      } catch {
        data = null;
      }
    }
  }

  const fieldErrors =
    data && typeof data === 'object'
      ? extractFieldErrors(data as Record<string, unknown>)
      : undefined;

  return {
    message: messageFromPayload(data, fallback),
    code: status ? `HTTP_${status}` : undefined,
    status,
    fieldErrors,
  };
}

/**
 * Normalize any thrown value / failed response into a safe ParsedApiError.
 */
export function parseApiError(
  error: unknown,
  options?: { fallbackMessage?: string },
): ParsedApiError {
  const fallback = options?.fallbackMessage || 'Something went wrong. Please try again.';

  if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
    const maybe = error as ParsedApiError;
    if (typeof maybe.message === 'string') {
      return {
        message: sanitizeUserMessage(maybe.message, fallback),
        code: maybe.code,
        status: maybe.status,
        fieldErrors: maybe.fieldErrors,
      };
    }
  }

  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK',
    };
  }

  if (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && (error.name === 'AbortError' || /aborted|AbortError/i.test(error.message)))
  ) {
    return { message: '', code: 'ABORT' };
  }

  if (error instanceof Error) {
    const msg = error.message || '';
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK',
      };
    }
    if (/^HTTP error! status:\s*(\d+)/i.test(msg)) {
      const status = Number(RegExp.$1);
      return {
        message: messageFromStatus(status),
        code: `HTTP_${status}`,
        status,
      };
    }
    return {
      message: sanitizeUserMessage(msg, fallback),
      code: error.name || 'Error',
    };
  }

  if (typeof error === 'string') {
    return { message: sanitizeUserMessage(error, fallback) };
  }

  return { message: fallback, code: 'UNKNOWN' };
}
