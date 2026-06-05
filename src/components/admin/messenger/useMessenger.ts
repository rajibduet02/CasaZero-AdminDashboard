import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchPrivateChatResidents,
  getSessionResidenceAdminId,
  isApiTruthyStatus,
  safeJsonParse,
  type PrivateChatResident,
} from '../../../utils/api';
import { filterConversations, totalUnreadCount } from './messengerUtils';
import { residentToConversation } from './types';
import type { MessengerConversation, MessengerMessage, MessengerTab } from './types';

/**
 * Header messenger state — loads private-chat residents when the panel opens.
 */
export function useMessenger() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MessengerTab>('all');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [messagesByChatId, setMessagesByChatId] = useState<Record<number, MessengerMessage[]>>({});

  useEffect(() => {
    setChatInput('');
  }, [selectedConversationId]);

  useEffect(() => {
    if (!isOpen) return;

    const adminId = getSessionResidenceAdminId();
    if (adminId == null) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetchPrivateChatResidents(adminId);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await safeJsonParse<{
          status?: unknown;
          data?: PrivateChatResident[];
        }>(response);

        if (cancelled) return;

        if (!isApiTruthyStatus(result.status) || !Array.isArray(result.data)) {
          setConversations([]);
          return;
        }

        setConversations(
          result.data.map((row, index) => residentToConversation(row, index)),
        );
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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
    loading,
    activeMessages,
    chatInput,
    setChatInput,
    handleSend,
    sending,
  };
}

export type UseMessengerReturn = ReturnType<typeof useMessenger>;
