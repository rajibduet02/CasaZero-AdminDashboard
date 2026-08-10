export type SupportStatusKey = 'pending' | 'in_progress' | 'resolved';

/** Italian status values expected by the support ticket API. */
export const SUPPORT_STATUS_API_IT: Record<SupportStatusKey, string> = {
  pending: 'In Attesa',
  in_progress: 'In Corso',
  resolved: 'Risolti',
};

/** English UI/API labels mapped to internal form keys. */
const STATUS_KEY_ALIASES: Record<string, SupportStatusKey> = {
  // Internal keys
  pending: 'pending',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  resolved: 'resolved',
  // English labels
  open: 'pending',
  closed: 'resolved',
  // Italian labels
  'in attesa': 'pending',
  inattesa: 'pending',
  'in corso': 'in_progress',
  incorso: 'in_progress',
  risolto: 'resolved',
  risolti: 'resolved',
};

function normalizeStatusToken(status: string): string {
  return status.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normalize API/UI status strings (English or Italian) to a form key. */
export function toSupportStatusKey(status?: string | null): SupportStatusKey {
  if (!status) return 'pending';

  const spaced = normalizeStatusToken(status);
  const compact = spaced.replace(/\s/g, '');

  if (STATUS_KEY_ALIASES[spaced]) return STATUS_KEY_ALIASES[spaced];
  if (STATUS_KEY_ALIASES[compact]) return STATUS_KEY_ALIASES[compact];

  for (const [key, italianValue] of Object.entries(SUPPORT_STATUS_API_IT)) {
    if (normalizeStatusToken(italianValue) === spaced) {
      return key as SupportStatusKey;
    }
  }

  return 'pending';
}

/** Always send Italian status values to the support ticket API. */
export function toSupportStatusApiValue(status?: string | null): string {
  return SUPPORT_STATUS_API_IT[toSupportStatusKey(status)];
}
