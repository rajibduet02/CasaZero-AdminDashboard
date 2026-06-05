import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatMessageTime,
  markConversationReadForAdmin,
  sendMessage as sendChatMessage,
  subscribeToMessages,
} from '../services/privateChatService';
import type { ChatMessage } from '../types/chat';

interface UseMessagesOptions {
  conversationId: string | null;
  adminId: number | null;
  enabled: boolean;
  language: 'it' | 'en';
}

export function useMessages({
  conversationId,
  adminId,
  enabled,
  language,
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !conversationId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToMessages(
      conversationId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [enabled, conversationId]);

  const unreadFromResident = useMemo(
    () => messages.filter((m) => m.senderType === 'resident' && !m.read).length,
    [messages],
  );

  useEffect(() => {
    if (!enabled || !conversationId) return;

    markConversationReadForAdmin(conversationId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to mark messages read';
      console.warn('[PrivateChat] mark read:', message);
    });
  }, [enabled, conversationId, unreadFromResident]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId || adminId == null || sending) return;

      setSending(true);
      setError(null);

      try {
        await sendChatMessage({
          conversationId,
          adminId,
          text: trimmed,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, adminId, sending],
  );

  const formattedMessages = messages.map((message) => ({
    ...message,
    createdAtLabel: formatMessageTime(message.createdAt, language),
    isOutgoing: message.senderType === 'admin',
  }));

  return {
    messages: formattedMessages,
    loading,
    sending,
    error,
    send,
  };
}
