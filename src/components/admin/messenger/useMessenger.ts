import { useCallback, useEffect, useMemo, useState } from 'react';
import { filterConversations, totalUnreadCount } from './messengerUtils';
import {
  createInitialConversations,
  createInitialMessagesMap,
} from './messengerMockData';
import type { MessengerMessage, MessengerTab } from './types';

/**
 * Header messenger state — mock threads with dynamic send + list preview updates.
 */
export function useMessenger() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MessengerTab>('all');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  const [conversations, setConversations] = useState(createInitialConversations);
  const [messagesByChatId, setMessagesByChatId] = useState(createInitialMessagesMap);

  useEffect(() => {
    setChatInput('');
  }, [selectedConversationId]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectConversation = useCallback((id: number) => {
    setSelectedConversationId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  const filteredConversations = useMemo(
    () => filterConversations(conversations, { search, tab: activeTab }),
    [conversations, search, activeTab],
  );

  const unreadTotal = useMemo(() => totalUnreadCount(conversations), [conversations]);

  const selectedConversation = useMemo(() => {
    if (selectedConversationId == null) return null;
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const activeMessages = useMemo(() => {
    if (selectedConversationId == null) return [];
    return messagesByChatId[selectedConversationId] ?? [];
  }, [messagesByChatId, selectedConversationId]);

  const handleSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || sending || selectedConversationId == null) return;

    setSending(true);
    const now = Date.now();
    const timeLabel = new Date(now).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    const outgoing: MessengerMessage = {
      id: `local-${now}`,
      text,
      createdAt: now,
      createdAtLabel: timeLabel,
      senderName: 'You',
      sender_role: 'admin',
      isOutgoing: true,
    };

    const chatId = selectedConversationId;

    setMessagesByChatId((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), outgoing],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: text,
              lastMessageAt: now,
              unreadCount: 0,
            }
          : c,
      ),
    );

    setChatInput('');
    setSending(false);
  }, [chatInput, sending, selectedConversationId]);

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
    loading: false,
    activeMessages,
    chatInput,
    setChatInput,
    handleSend,
    sending,
  };
}

export type UseMessengerReturn = ReturnType<typeof useMessenger>;
