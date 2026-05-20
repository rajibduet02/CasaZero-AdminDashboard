import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Firestore group document id for a Laravel residence id.
 * @example residenceId 117 → "group_117"
 */
export function firestoreGroupId(residenceId) {
  return `group_${residenceId}`;
}

function toMillis(value) {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCreatedAt(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Map Flutter / mobile Firestore document → admin UI row.
 */
function mapMessageDocument(docId, data) {
  const text = String(data.text ?? data.message ?? data.body ?? '').trim();
  if (!text) return null;

  const createdAtMs = toMillis(data.createdAt ?? data.created_at ?? data.timestamp);
  const roleRaw = String(
    data.sender_role ?? data.senderRole ?? data.role ?? 'resident',
  )
    .toLowerCase()
    .trim();

  const senderName = String(
    data.senderName ??
      data.sender_name ??
      data.user_name ??
      data.userName ??
      'Unknown',
  ).trim();

  return {
    id: docId,
    senderName,
    text,
    createdAt: createdAtMs,
    createdAtLabel: formatCreatedAt(createdAtMs),
    sender_role: roleRaw === 'admin' || roleRaw === 'super_admin' ? 'admin' : 'resident',
  };
}

/**
 * Realtime listener for groups/group_{residenceId}/messages (createdAt asc).
 * @param {number} residenceId
 * @param {(messages: object[]) => void} onMessages
 * @param {(error: import('firebase/app').FirebaseError) => void} [onError]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeToResidenceMessages(residenceId, onMessages, onError) {
  const groupId = firestoreGroupId(residenceId);
  const path = `groups/${groupId}/messages`;

  console.log('🔥 [FIRESTORE] Connecting to', groupId);
  console.log('🔥 [FIRESTORE] Path:', path);

  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('✅ [FIRESTORE] Snapshot received');

      const messages = [];
      snapshot.forEach((docSnap) => {
        const row = mapMessageDocument(docSnap.id, docSnap.data());
        if (row) messages.push(row);
      });

      messages.sort((a, b) => a.createdAt - b.createdAt);

      console.log('📨 [FIRESTORE] Messages count:', messages.length);
      onMessages(messages);
    },
    (err) => {
      console.error('❌ [FIRESTORE] Listener error:', err?.code, err?.message);
      onError?.(err);
    },
  );
}
