import type { ChatResidenceItem } from '../../../hooks/useChatResidences';
import type { PrivateChatResident } from '../../../utils/api';

export type MessengerTab = 'all' | 'unread';

import type { AvatarColorKey } from './messengerTheme';

const AVATAR_COLOR_KEYS: AvatarColorKey[] = ['green', 'purple', 'orange', 'blue', 'teal'];

/** Stable list row id — user id alone is not unique across residences. */
export function messengerConversationId(userId: number, residenceId: number): number {
  return residenceId * 1_000_000 + userId;
}

/** Conversation row (private chat resident or legacy group). */
export type MessengerConversation = {
  id: number;
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
  };
}

export function residentToConversation(
  row: PrivateChatResident,
  index: number,
): MessengerConversation {
  return {
    id: messengerConversationId(row.id, row.residence_id),
    name: row.user_name,
    residenceName: row.residence_name,
    userId: row.id,
    residenceId: row.residence_id,
    profileImage: row.profile_image,
    residence_admin: null,
    unreadCount: 0,
    isOnline: false,
    avatarColor: AVATAR_COLOR_KEYS[index % AVATAR_COLOR_KEYS.length],
  };
}
