import type { ChatResidenceItem } from '../../../hooks/useChatResidences';
import { buildConversationId, buildListRowId } from '../../../services/privateChatService';
import type { ConversationListItem } from '../../../types/chat';
import type { PrivateChatResident } from '../../../utils/api';
import type { AvatarColorKey } from './messengerTheme';

export type MessengerTab = 'all' | 'unread';

const AVATAR_COLOR_KEYS: AvatarColorKey[] = ['green', 'purple', 'orange', 'blue', 'teal'];

export function avatarColorForUserId(userId: number): AvatarColorKey {
  return AVATAR_COLOR_KEYS[Math.abs(userId) % AVATAR_COLOR_KEYS.length];
}

/** Stable list row id — user id alone is not unique across residences. */
export function messengerConversationId(userId: number, residenceId: number): number {
  return residenceId * 1_000_000 + userId;
}

/** Conversation row — Laravel resident merged with Firestore metadata. */
export type MessengerConversation = {
  /** Unique list row key (user + residence). */
  id: number;
  /** Firestore document id: admin_{adminId}_user_{residentId} */
  conversationId: string;
  name: string;
  residenceName: string;
  userId: number;
  residenceId: number;
  profileImage?: string | null;
  residence_admin: number | null;
  lastMessage?: string;
  lastMessageAt?: number;
  lastSenderName?: string;
  unreadCount: number;
  isOnline: boolean;
  hasConversation: boolean;
  avatarColor?: AvatarColorKey;
  /** Groups tab filter */
  isGroup?: boolean;
};

export type MessengerMessage = {
  id: string;
  text: string;
  createdAt: number;
  createdAtLabel: string;
  senderName: string;
  sender_role: 'admin' | 'resident';
  sender_role_label?: string;
  user_id?: number;
  isOutgoing: boolean;
};

export type MessengerSessionUser = {
  role?: unknown;
  residences?: unknown;
  email?: unknown;
  id?: unknown;
  user_id?: unknown;
};

export function residenceToConversation(
  item: ChatResidenceItem,
  preview?: Partial<Pick<MessengerConversation, 'lastMessage' | 'lastMessageAt' | 'lastSenderName' | 'unreadCount' | 'isOnline'>>,
): MessengerConversation {
  return {
    id: item.id,
    conversationId: `group_${item.id}`,
    name: item.name,
    residenceName: item.name,
    userId: item.id,
    residenceId: item.id,
    residence_admin: item.residence_admin,
    lastMessage: preview?.lastMessage,
    lastMessageAt: preview?.lastMessageAt,
    lastSenderName: preview?.lastSenderName,
    unreadCount: preview?.unreadCount ?? 0,
    isOnline: preview?.isOnline ?? false,
    hasConversation: true,
  };
}

export function listItemToMessengerConversation(item: ConversationListItem): MessengerConversation {
  return {
    id: item.listRowId,
    conversationId: item.conversationId,
    name: item.userName,
    residenceName: item.residenceName,
    userId: item.userId,
    residenceId: item.residenceId,
    profileImage: item.profileImage,
    residence_admin: null,
    lastMessage: item.lastMessage,
    lastMessageAt: item.lastMessageAt,
    unreadCount: item.unreadCount,
    isOnline: item.isOnline,
    hasConversation: item.hasConversation,
    avatarColor: avatarColorForUserId(item.userId),
  };
}

export function residentToConversation(
  row: PrivateChatResident,
  adminId: number,
): MessengerConversation {
  return {
    id: buildListRowId(row.id, row.residence_id),
    conversationId: buildConversationId(adminId, row.id),
    name: row.user_name,
    residenceName: row.residence_name,
    userId: row.id,
    residenceId: row.residence_id,
    profileImage: row.profile_image,
    residence_admin: null,
    unreadCount: 0,
    isOnline: false,
    hasConversation: false,
    avatarColor: avatarColorForUserId(row.id),
  };
}
