/**
 * Display names and role labels for condominium group chat.
 */

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailLike(value) {
  const s = String(value ?? '').trim();
  return s.length > 0 && EMAIL_LIKE.test(s);
}

function pickNameFromRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return '';
  const candidates = [
    record.user_name,
    record.username,
    record.name,
    record.full_name,
    record.display_name,
    record.userName,
    record.UserName,
  ];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s && !isEmailLike(s)) return s;
  }

  const first = String(record.first_name ?? record.firstname ?? record.nome ?? '').trim();
  const last = String(record.last_name ?? record.lastname ?? record.cognome ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined && !isEmailLike(combined)) return combined;

  return '';
}

/** Generic fallbacks stored when the real username was not resolved. */
export function isPlaceholderSenderName(name) {
  const s = String(name ?? '').trim().toLowerCase();
  if (!s || isEmailLike(name)) return true;
  return (
    s === 'admin' ||
    s === 'unknown' ||
    s === 'amministrazione' ||
    s === 'administration' ||
    s === 'amministrator'
  );
}

/**
 * Resolve the logged-in user's display name for chat (never prefer email).
 * @param {Record<string, unknown> | null | undefined} sessionUser
 * @param {Record<string, unknown> | null | undefined} [claims]
 * @returns {string}
 */
export function resolveChatSenderDisplayName(sessionUser, claims = null) {
  const fromSession = pickNameFromRecord(sessionUser);
  if (fromSession) return fromSession;

  const nested = sessionUser?.user;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const fromNested = pickNameFromRecord(nested);
    if (fromNested) return fromNested;
  }

  const data = sessionUser?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const fromData = pickNameFromRecord(data);
    if (fromData) return fromData;
    const dataUser = data.user;
    if (dataUser && typeof dataUser === 'object' && !Array.isArray(dataUser)) {
      const fromDataUser = pickNameFromRecord(dataUser);
      if (fromDataUser) return fromDataUser;
    }
  }

  if (claims && typeof claims === 'object') {
    const fromClaims = pickNameFromRecord(claims);
    if (fromClaims) return fromClaims;
  }

  return '';
}

/**
 * @param {'admin' | 'resident' | 'super_admin' | string} roleRaw
 * @param {(key: string) => string} t
 */
export function chatRoleLabel(roleRaw, t) {
  const role = String(roleRaw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (role === 'admin' || role === 'super_admin') {
    return t('chatSenderAdmin');
  }
  if (role === 'resident' || role === 'client') {
    return t('resident');
  }
  return role ? role.replace(/_/g, ' ') : t('resident');
}

/**
 * Replace email-like sender names for the current user's own messages.
 * @param {string} senderName
 * @param {'admin' | 'resident'} senderRole
 * @param {number | null | undefined} messageUserId
 * @param {number | null | undefined} sessionUserId
 * @param {string} sessionDisplayName
 * @param {string} [sessionEmail]
 */
export function enrichChatSenderName(
  senderName,
  senderRole,
  messageUserId,
  sessionUserId,
  sessionDisplayName,
  sessionEmail = '',
) {
  const display = String(sessionDisplayName ?? '').trim();
  if (!display || !isPlaceholderSenderName(senderName)) return senderName;

  const isOwnById =
    sessionUserId != null &&
    messageUserId != null &&
    Number(messageUserId) === Number(sessionUserId);

  const email = String(sessionEmail ?? '').trim().toLowerCase();
  const isOwnByEmail =
    email.length > 0 && String(senderName).trim().toLowerCase() === email;

  if (senderRole === 'admin' && (isOwnById || isOwnByEmail)) {
    return display;
  }

  return senderName;
}
