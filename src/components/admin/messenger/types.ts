import type { ChatResidenceItem } from '../../../hooks/useChatResidences';

export type MessengerTab = 'all' | 'unread';

import type { AvatarColorKey } from './messengerTheme';

/** Conversation row (mock / future Firestore group). */
export type MessengerConversation = {
  id: number;
  name: string;
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
    residence_admin: item.residence_admin,
    lastMessage: preview?.lastMessage,
    lastMessageAt: preview?.lastMessageAt,
    lastSenderName: preview?.lastSenderName,
    unreadCount: preview?.unreadCount ?? 0,
    isOnline: preview?.isOnline ?? false,
  };
}
