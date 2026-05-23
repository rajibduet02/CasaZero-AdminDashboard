import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { getFirebaseClaims } from './firebaseAuth.js';
import { fetchSessionUserDisplayName } from '../utils/api';
import { resolveChatSenderDisplayName } from '../utils/chatDisplay.js';

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
    data.user_name ??
      data.senderName ??
      data.sender_name ??
      data.userName ??
      'Unknown',
  ).trim();

  const userIdRaw = data.user_id ?? data.userId ?? data.sender_id ?? data.senderId;
  const userId =
    userIdRaw != null && userIdRaw !== '' && !Number.isNaN(Number(userIdRaw))
      ? Number(userIdRaw)
      : undefined;

  return {
    id: docId,
    senderName,
    text,
    createdAt: createdAtMs,
    createdAtLabel: formatCreatedAt(createdAtMs),
    sender_role: roleRaw === 'admin' || roleRaw === 'super_admin' ? 'admin' : 'resident',
    user_id: userId,
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

/**
 * Post an admin message to groups/group_{residenceId}/messages.
 * Requires Firebase Auth with admin claims (not super_admin write rules).
 *
 * @param {number} residenceId
 * @param {{ text: string, sessionUser?: Record<string, unknown> | null, displayName?: string }} payload
 */
export async function sendResidenceMessage(residenceId, { text, sessionUser = null, displayName }) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('Message text is required');
  }

  const claims = await getFirebaseClaims();
  if (!claims) {
    throw new Error('Firebase authentication required to send messages');
  }

  const roleRaw = String(claims.role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (roleRaw === 'superadmin' || roleRaw === 'super_admin') {
    throw new Error('Super admin cannot send chat messages from this dashboard');
  }

  const groupId = firestoreGroupId(residenceId);
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  let senderName =
    String(displayName ?? '').trim() || resolveChatSenderDisplayName(sessionUser, claims);
  if (!senderName) {
    senderName = await fetchSessionUserDisplayName(sessionUser);
  }
  if (!senderName) {
    throw new Error(
      'Could not resolve your username. Please sign out and sign in again, or update your profile name.',
    );
  }
  const userIdRaw = claims.user_id ?? sessionUser?.id ?? sessionUser?.user_id;
  const userId =
    userIdRaw != null && userIdRaw !== '' && !Number.isNaN(Number(userIdRaw))
      ? Number(userIdRaw)
      : undefined;

  const doc = {
    text: trimmed,
    sender_role: 'admin',
    senderName,
    sender_name: senderName,
    user_name: senderName,
    createdAt: serverTimestamp(),
  };
  if (userId != null) {
    doc.user_id = userId;
  }

  console.log('📤 [FIRESTORE] Sending message to', groupId);
  await addDoc(messagesRef, doc);
}
