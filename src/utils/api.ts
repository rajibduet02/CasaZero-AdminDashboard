/**
 * Shared API configuration and helpers for consistent fetch/JSON handling.
 * Use these across admin and list components to avoid duplication and ensure
 * proper error handling for HTML/empty responses.
 */

export const API_BASE = 'https://smarthome.attoexasolutions.com/api';

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
