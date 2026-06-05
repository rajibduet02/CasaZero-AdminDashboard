import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConversations } from '../../../hooks/useConversations';
import { useMessages } from '../../../hooks/useMessages';
import { useFirebaseAuth } from '../../../hooks/useFirebaseAuth.js';
import { ensureFirebaseSession } from '../../../services/firebase';
import { ensureConversation } from '../../../services/privateChatService';
import { setUserPresence } from '../../../services/presenceService';
import { useLanguage } from '../../../utils/LanguageContext';
import { filterConversations, totalUnreadCount } from './messengerUtils';
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

  const {
    conversations: rawConversations,
    loading,
    adminId,
    adminName,
  } = useConversations({
    enabled: isOpen,
    firebaseReady,
  });

  const conversations = useMemo(
    () => rawConversations.map((item, index) => listItemToMessengerConversation(item, index)),
    [rawConversations],
  );

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
    if (!isOpen) return;
    ensureFirebaseSession().catch((err: unknown) => {
      console.warn('[Messenger] Firebase session restore failed:', err);
    });
  }, [isOpen]);

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
    setIsOpen((prev) => !prev);
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
    () => filterConversations(conversations, { search, tab: activeTab }),
    [conversations, search, activeTab],
  );

  const unreadTotal = useMemo(() => totalUnreadCount(conversations), [conversations]);

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || sending || !selectedConversationId) return;

    try {
      await send(text);
      setChatInput('');
    } catch {
      // useMessages stores error state
    }
  }, [chatInput, sending, selectedConversationId, send]);

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
