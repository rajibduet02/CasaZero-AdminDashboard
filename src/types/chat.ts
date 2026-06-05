import type { Timestamp } from 'firebase/firestore';

export type SenderType = 'admin' | 'resident';

export interface ChatMessage {
  id: string;
  senderId: number;
  senderType: SenderType;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface ConversationDocument {
  adminId: number;
  residentId: number;
  adminName: string;
  residentName: string;
  residenceId: number;
  residenceName: string;
  participants: number[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadAdmin: number;
  unreadResident: number;
}

export interface EnsureConversationParams {
  adminId: number;
  residentId: number;
  adminName: string;
  residentName: string;
  residenceId: number;
  residenceName: string;
}

export interface PrivateChatResidentRow {
  id: number;
  user_name: string;
  profile_image: string | null;
  residence_id: number;
  residence_name: string;
  email?: string;
  phone?: string;
}

export interface ConversationListItem {
  listRowId: number;
  conversationId: string;
  userId: number;
  userName: string;
  profileImage: string | null;
  residenceId: number;
  residenceName: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount: number;
  hasConversation: boolean;
  isOnline: boolean;
}

export interface PresenceDocument {
  online: boolean;
  lastSeen: Timestamp | null;
}

export interface SendMessageParams {
  conversationId: string;
  adminId: number;
  text: string;
}
