import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.js';
import { firestoreGroupId } from '../../../firebase/firestoreChat.js';
import { AVATAR_COLORS, AVATAR_GRADIENTS, type AvatarColorKey } from './messengerTheme';
import type { MessengerConversation, MessengerTab } from './types';

const READ_STATE_KEY = 'casazero_messenger_read_v1';

type ReadStateMap = Record<string, number>;

function readStateStorage(): ReadStateMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(READ_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ReadStateMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getLastReadAt(residenceId: number): number {
  return readStateStorage()[String(residenceId)] ?? 0;
}

export function markConversationRead(residenceId: number, atMs: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  const map = readStateStorage();
  map[String(residenceId)] = Math.max(map[String(residenceId)] ?? 0, atMs);
  localStorage.setItem(READ_STATE_KEY, JSON.stringify(map));
}

function toMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'object' && typeof (value as { seconds?: number }).seconds === 'number') {
    return (value as { seconds: number }).seconds * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export type ResidenceMessagePreview = {
  text: string;
  createdAt: number;
  senderName: string;
};

function mapPreviewDocument(data: Record<string, unknown>): ResidenceMessagePreview | null {
  const text = String(data.text ?? data.message ?? data.body ?? '').trim();
  if (!text) return null;
  const createdAtMs = toMillis(data.createdAt ?? data.created_at ?? data.timestamp);
  const senderName = String(
    data.user_name ?? data.senderName ?? data.sender_name ?? data.userName ?? 'Unknown',
  ).trim();
  return { text, createdAt: createdAtMs, senderName };
}

/**
 * Lightweight adapter: last message only (does not modify firestoreChat.js).
 */
export function subscribeToResidenceMessagePreview(
  residenceId: number,
  onPreview: (preview: ResidenceMessagePreview | null) => void,
  onError?: (err: { code?: string; message?: string }) => void,
): () => void {
  const groupId = firestoreGroupId(residenceId);
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onPreview(null);
        return;
      }
      const doc = snapshot.docs[0];
      const row = mapPreviewDocument(doc.data() as Record<string, unknown>);
      onPreview(row);
    },
    (err) => onError?.({ code: err.code, message: err.message }),
  );
}

export function computeUnreadCount(lastMessageAt: number | undefined, residenceId: number): number {
  if (!lastMessageAt) return 0;
  const lastRead = getLastReadAt(residenceId);
  return lastMessageAt > lastRead ? 1 : 0;
}

export function isRecentlyActive(lastMessageAt: number | undefined, windowMs = 5 * 60 * 1000): boolean {
  if (!lastMessageAt) return false;
  return Date.now() - lastMessageAt < windowMs;
}

/** Relative label for list rows — e.g. "2m ago", "1h ago". */
export function formatRelativeTime(ms: number | undefined, language: 'it' | 'en'): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 0) return language === 'it' ? 'ora' : 'now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return language === 'it' ? 'ora' : 'now';
  if (minutes < 60) return language === 'it' ? `${minutes}m fa` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'it' ? `${hours}h fa` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === 'it' ? `${days}g fa` : `${days}d ago`;
}

export function formatConversationTime(ms: number | undefined, language: 'it' | 'en'): string {
  if (!ms) return '';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(language === 'it' ? 'it-IT' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function filterConversations(
  items: MessengerConversation[],
  options: { search: string; tab: MessengerTab },
): MessengerConversation[] {
  const q = options.search.trim().toLowerCase();
  let list = items;

  if (options.tab === 'unread') {
    list = list.filter((c) => c.unreadCount > 0);
  }

  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q) ||
        (c.lastSenderName ?? '').toLowerCase().includes(q),
    );
  }

  return [...list].sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
}

export function totalUnreadCount(conversations: MessengerConversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function avatarColorClass(colorKey?: string): string {
  const key = (colorKey ?? 'green') as AvatarColorKey;
  return AVATAR_COLORS[key] ?? AVATAR_COLORS.green;
}

export function avatarGradientStyle(colorKey?: string): { background: string } {
  const key = (colorKey ?? 'green') as AvatarColorKey;
  return { background: AVATAR_GRADIENTS[key] ?? AVATAR_GRADIENTS.green };
}
