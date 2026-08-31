import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConversations } from '../../../hooks/useConversations';
import { useMessages } from '../../../hooks/useMessages';
import { useFirebaseAuth } from '../../../hooks/useFirebaseAuth.js';
import { ensureFirebaseSession } from '../../../services/firebase';
import { ensureConversation } from '../../../services/privateChatService';
import { setUserPresence } from '../../../services/presenceService';
import { sendChatNotification } from '../../../utils/api';
import { useLanguage } from '../../../utils/LanguageContext';
import { filterConversations } from './messengerUtils';
import { listItemToMessengerConversation } from './types';
import type { MessengerConversation, MessengerMessage, MessengerTab } from './types';

/**
 * Header messenger — Laravel resident list + Firestore private chat (single source of truth).
 */
export function useMessenger() {
  const { language, t } = useLanguage();
  const { ready: firebaseReady } = useFirebaseAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MessengerTab>('all');
  const [chatInput, setChatInput] = useState('');
  const [openingChat, setOpeningChat] = useState(false);
  const [sentListPreviews, setSentListPreviews] = useState<
    Record<string, { lastMessage: string; lastMessageAt: number }>
  >({});

  const {
    conversations: rawConversations,
    unreadTotal,
    loading,
    adminId,
    adminName,
  } = useConversations({
    listEnabled: isOpen,
    firebaseReady,
  });

  const conversations = useMemo(() => {
    return rawConversations.map((item) => {
      const conversation = listItemToMessengerConversation(item);
      const preview = sentListPreviews[conversation.conversationId];
      if (!preview) return conversation;

      return {
        ...conversation,
        lastMessage: preview.lastMessage,
        lastMessageAt: Math.max(preview.lastMessageAt, conversation.lastMessageAt ?? 0),
        hasConversation: true,
      };
    });
  }, [rawConversations, sentListPreviews]);

  useEffect(() => {
    setSentListPreviews((prev) => {
      if (Object.keys(prev).length === 0) return prev;

      const next: Record<string, { lastMessage: string; lastMessageAt: number }> = {};
      let changed = false;

      for (const [conversationId, preview] of Object.entries(prev)) {
        const synced = rawConversations.find((c) => c.conversationId === conversationId);
        const syncedTime = synced?.lastMessageAt ?? 0;
        const messageSynced = synced?.lastMessage?.trim() === preview.lastMessage.trim();
        const timeSynced = syncedTime > 0 && syncedTime >= preview.lastMessageAt - 5000;

        if (messageSynced && timeSynced) {
          changed = true;
          continue;
        }
        next[conversationId] = preview;
      }

      return changed ? next : prev;
    });
  }, [rawConversations]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((c) => c.conversationId === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const {
    messages: rawMessages,
    loading: messagesLoading,
    sending,
    send,
  } = useMessages({
    conversationId: selectedConversationId,
    adminId,
    enabled: isOpen && firebaseReady && selectedConversationId != null,
    language,
  });

  const activeMessages: MessengerMessage[] = useMemo(
    () =>
      rawMessages.map((m) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        createdAtLabel: m.createdAtLabel,
        senderName: m.isOutgoing ? 'You' : (selectedConversation?.name ?? 'Resident'),
        sender_role: m.senderType === 'admin' ? 'admin' : 'resident',
        user_id: m.senderId,
        isOutgoing: m.isOutgoing,
      })),
    [rawMessages, selectedConversation?.name],
  );

  useEffect(() => {
    ensureFirebaseSession().catch((err: unknown) => {
      console.warn('[Messenger] Firebase session restore failed:', err);
    });
  }, []);

  useEffect(() => {
    if (!isOpen || adminId == null || !firebaseReady) return;

    setUserPresence(adminId, true).catch((err: unknown) => {
      console.warn('[Messenger] Failed to set admin presence:', err);
    });

    return () => {
      setUserPresence(adminId, false).catch(() => undefined);
    };
  }, [isOpen, adminId, firebaseReady]);

  useEffect(() => {
    setChatInput('');
  }, [selectedConversationId]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        setSelectedConversationId(null);
      }
      return !prev;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedConversationId(null);
  }, []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.conversationId === conversationId);
      if (!conv || adminId == null) return;

      setOpeningChat(true);
      try {
        await ensureConversation({
          adminId,
          residentId: conv.userId,
          adminName,
          residentName: conv.name,
          residenceId: conv.residenceId,
          residenceName: conv.residenceName,
        });
        setSelectedConversationId(conversationId);
      } catch (err) {
        console.error('[Messenger] Failed to open conversation:', err);
      } finally {
        setOpeningChat(false);
      }
    },
    [conversations, adminId, adminName],
  );

  const filteredConversations = useMemo(
    () =>
      filterConversations(conversations, {
        search,
        tab: activeTab,
        pinnedConversationId: selectedConversationId,
      }),
    [conversations, search, activeTab, selectedConversationId],
  );

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || sending || !selectedConversationId) return;

    const now = Date.now();
    setChatInput('');
    setSentListPreviews((prev) => ({
      ...prev,
      [selectedConversationId]: { lastMessage: text, lastMessageAt: now },
    }));

    try {
      await send(text);
      if (adminId != null && selectedConversation) {
        void sendChatNotification({
          receiver_id: selectedConversation.userId,
          sender_id: adminId,
          title: 'Chat con amministratore',
          body: text,
        });
      }
    } catch {
      setChatInput(text);
      setSentListPreviews((prev) => {
        const next = { ...prev };
        delete next[selectedConversationId];
        return next;
      });
    }
  }, [chatInput, sending, selectedConversationId, selectedConversation, send, adminId]);

  return {
    isOpen,
    toggleOpen,
    close,
    selectedConversationId,
    selectedConversation,
    selectConversation,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    conversations: filteredConversations,
    unreadTotal,
    loading,
    messagesLoading,
    openingChat,
    activeMessages,
    chatInput,
    setChatInput,
    handleSend,
    sending,
    t,
  };
}

export type UseMessengerReturn = ReturnType<typeof useMessenger>;
