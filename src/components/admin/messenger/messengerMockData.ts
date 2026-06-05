import type { MessengerConversation, MessengerMessage } from './types';

/** Mock contacts — matches demo messenger UI (admin-only header popup). */
export const MESSENGER_MOCK_CONVERSATIONS: MessengerConversation[] = [
  {
    id: 1,
    conversationId: 'admin_17_user_1',
    name: 'John Doe',
    residenceName: 'Police Park',
    userId: 1,
    residenceId: 1,
    hasConversation: true,
    residence_admin: 17,
    lastMessage: 'Hello, I have a question about the Police Park project.',
    lastMessageAt: Date.now() - 2 * 60 * 1000,
    unreadCount: 1,
    isOnline: true,
    avatarColor: 'green',
    isGroup: false,
  },
  {
    id: 2,
    conversationId: 'admin_17_user_2',
    name: 'Sara Miller',
    residenceName: 'Police Park',
    userId: 2,
    residenceId: 2,
    hasConversation: true,
    residence_admin: 17,
    lastMessage: 'The documents have been uploaded successfully.',
    lastMessageAt: Date.now() - 15 * 60 * 1000,
    unreadCount: 0,
    isOnline: true,
    avatarColor: 'purple',
    isGroup: false,
  },
  {
    id: 3,
    conversationId: 'admin_17_user_3',
    name: 'Alex Turner',
    residenceName: 'Navana',
    userId: 3,
    residenceId: 3,
    hasConversation: true,
    residence_admin: 17,
    lastMessage: 'Can we schedule a meeting for next week?',
    lastMessageAt: Date.now() - 45 * 60 * 1000,
    unreadCount: 1,
    isOnline: false,
    avatarColor: 'orange',
    isGroup: false,
  },
  {
    id: 4,
    conversationId: 'admin_17_user_4',
    name: 'Maria Lopez',
    residenceName: 'Army Society',
    userId: 4,
    residenceId: 4,
    hasConversation: true,
    residence_admin: 17,
    lastMessage: 'Thank you for the quick response!',
    lastMessageAt: Date.now() - 60 * 60 * 1000,
    unreadCount: 1,
    isOnline: false,
    avatarColor: 'blue',
    isGroup: false,
  },
  {
    id: 5,
    conversationId: 'admin_17_user_5',
    name: 'Support Team',
    residenceName: 'Baridhara',
    userId: 5,
    residenceId: 5,
    hasConversation: true,
    residence_admin: 17,
    lastMessage: 'Your ticket has been resolved.',
    lastMessageAt: Date.now() - 2 * 60 * 60 * 1000,
    unreadCount: 0,
    isOnline: true,
    avatarColor: 'teal',
    isGroup: true,
  },
];

export const MESSENGER_DEFAULT_CONVERSATION_ID = 1;

const MOCK_MESSAGES: Record<number, MessengerMessage[]> = {
  1: [
    {
      id: '1-in',
      text: 'Hello, I have a question about the Police Park project.',
      createdAt: Date.now() - 30 * 60 * 1000,
      createdAtLabel: '10:30 AM',
      senderName: 'John Doe',
      sender_role: 'resident',
      isOutgoing: false,
    },
    {
      id: '1-out',
      text: 'Sure! How can I help you?',
      createdAt: Date.now() - 28 * 60 * 1000,
      createdAtLabel: '10:32 AM',
      senderName: 'You',
      sender_role: 'admin',
      isOutgoing: true,
    },
  ],
  2: [
    {
      id: '2-in',
      text: 'I uploaded the warranty PDF to the documents section.',
      createdAt: Date.now() - 3 * 60 * 60 * 1000,
      createdAtLabel: '09:15 AM',
      senderName: 'Sara Miller',
      sender_role: 'resident',
      isOutgoing: false,
    },
    {
      id: '2-out',
      text: 'The documents have been uploaded successfully.',
      createdAt: Date.now() - 2.5 * 60 * 60 * 1000,
      createdAtLabel: '09:18 AM',
      senderName: 'You',
      sender_role: 'admin',
      isOutgoing: true,
    },
  ],
  3: [
    {
      id: '3-in',
      text: 'Can we schedule a meeting for next week?',
      createdAt: Date.now() - 50 * 60 * 1000,
      createdAtLabel: '11:00 AM',
      senderName: 'Alex Turner',
      sender_role: 'resident',
      isOutgoing: false,
    },
  ],
  4: [
    {
      id: '4-in',
      text: 'Thank you for the quick response!',
      createdAt: Date.now() - 65 * 60 * 1000,
      createdAtLabel: '10:45 AM',
      senderName: 'Maria Lopez',
      sender_role: 'resident',
      isOutgoing: false,
    },
  ],
  5: [
    {
      id: '5-in',
      text: 'Your ticket #1042 has been assigned to our team.',
      createdAt: Date.now() - 4 * 60 * 60 * 1000,
      createdAtLabel: '08:00 AM',
      senderName: 'Support Team',
      sender_role: 'resident',
      isOutgoing: false,
    },
    {
      id: '5-out',
      text: 'Your ticket has been resolved.',
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      createdAtLabel: '10:00 AM',
      senderName: 'You',
      sender_role: 'admin',
      isOutgoing: true,
    },
  ],
};

export function getMockMessagesForResidence(residenceId: number): MessengerMessage[] {
  return (MOCK_MESSAGES[residenceId] ?? MOCK_MESSAGES[1]).map((m) => ({ ...m }));
}

/** Deep copy of all mock threads for per-session messenger state. */
export function createInitialMessagesMap(): Record<number, MessengerMessage[]> {
  const out: Record<number, MessengerMessage[]> = {};
  for (const c of MESSENGER_MOCK_CONVERSATIONS) {
    out[c.id] = getMockMessagesForResidence(c.id);
  }
  return out;
}

export function createInitialConversations(): MessengerConversation[] {
  return MESSENGER_MOCK_CONVERSATIONS.map((c) => ({ ...c }));
}

export function getMockTotalUnread(): number {
  return MESSENGER_MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.unreadCount, 0);
}
