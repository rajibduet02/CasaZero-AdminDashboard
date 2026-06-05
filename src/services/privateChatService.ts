import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ChatMessage,
  ConversationDocument,
  EnsureConversationParams,
  SendMessageParams,
  SenderType,
} from '../types/chat';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

/** Client-side conversation id — never from Laravel. */
export function buildConversationId(adminId: number, residentId: number): string {
  return `admin_${adminId}_user_${residentId}`;
}

export function buildListRowId(userId: number, residenceId: number): number {
  return residenceId * 1_000_000 + userId;
}

export function timestampToMillis(value: Timestamp | null | undefined): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

function mapConversationDocument(data: DocumentData): ConversationDocument {
  return {
    adminId: Number(data.adminId ?? 0),
    residentId: Number(data.residentId ?? 0),
    adminName: String(data.adminName ?? ''),
    residentName: String(data.residentName ?? ''),
    residenceId: Number(data.residenceId ?? 0),
    residenceName: String(data.residenceName ?? ''),
    participants: Array.isArray(data.participants)
      ? data.participants.map((p: unknown) => Number(p)).filter((n: number) => !Number.isNaN(n))
      : [],
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    lastMessage: String(data.lastMessage ?? ''),
    lastMessageAt: (data.lastMessageAt as Timestamp | null) ?? null,
    unreadAdmin: Number(data.unreadAdmin ?? 0),
    unreadResident: Number(data.unreadResident ?? 0),
  };
}

function mapMessageDocument(docId: string, data: DocumentData): ChatMessage | null {
  const text = String(data.text ?? '').trim();
  if (!text) return null;

  const senderTypeRaw = String(data.senderType ?? data.sender_type ?? 'resident').toLowerCase();
  const senderType: SenderType = senderTypeRaw === 'admin' ? 'admin' : 'resident';

  return {
    id: docId,
    senderId: Number(data.senderId ?? data.sender_id ?? 0),
    senderType,
    text,
    createdAt: timestampToMillis((data.createdAt as Timestamp | null) ?? null),
    read: Boolean(data.read),
  };
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationDocument | null> {
  const snap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
  if (!snap.exists()) return null;
  return mapConversationDocument(snap.data());
}

/**
 * Open chat: create conversation document only when missing (no duplicates).
 */
export async function ensureConversation(params: EnsureConversationParams): Promise<string> {
  const conversationId = buildConversationId(params.adminId, params.residentId);
  const ref = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return conversationId;
  }

  await setDoc(ref, {
    adminId: params.adminId,
    residentId: params.residentId,
    adminName: params.adminName,
    residentName: params.residentName,
    residenceId: params.residenceId,
    residenceName: params.residenceName,
    participants: [params.adminId, params.residentId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    unreadAdmin: 0,
    unreadResident: 0,
  });

  return conversationId;
}

/** Realtime listener for all conversations owned by an admin. */
export function subscribeToAdminConversations(
  adminId: number,
  onUpdate: (conversations: Map<string, ConversationDocument>) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('adminId', '==', adminId),
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const map = new Map<string, ConversationDocument>();
      snapshot.forEach((entry) => {
        map.set(entry.id, mapConversationDocument(entry.data()));
      });
      onUpdate(map);
    },
    (err) => onError?.(err),
  );
}

/** Realtime messages — ordered by createdAt ascending. */
export function subscribeToMessages(
  conversationId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const messagesRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    MESSAGES_SUBCOLLECTION,
  );
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((entry) => {
        const mapped = mapMessageDocument(entry.id, entry.data());
        if (mapped) messages.push(mapped);
      });
      onMessages(messages);
    },
    (err) => onError?.(err),
  );
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  const { conversationId, adminId, text } = params;
  const trimmed = text.trim();
  if (!trimmed) return;

  const messagesRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    MESSAGES_SUBCOLLECTION,
  );

  await addDoc(messagesRef, {
    senderId: adminId,
    senderType: 'admin',
    text: trimmed,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unreadResident: increment(1),
  });
}

/** Mark resident messages read and reset admin unread counter. */
export async function markConversationReadForAdmin(conversationId: string): Promise<void> {
  const messagesRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    MESSAGES_SUBCOLLECTION,
  );
  const unreadQuery = query(
    messagesRef,
    where('senderType', '==', 'resident'),
    where('read', '==', false),
  );

  const snapshot = await getDocs(unreadQuery);
  const batch = writeBatch(db);

  snapshot.docs.forEach((entry) => {
    batch.update(entry.ref, { read: true });
  });

  batch.update(doc(db, CONVERSATIONS_COLLECTION, conversationId), { unreadAdmin: 0 });
  await batch.commit();
}

export function formatMessageTime(ms: number, locale: 'it' | 'en' = 'en'): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
