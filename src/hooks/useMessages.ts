import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function isPendingFullySynced(pending: ChatMessage, serverMessages: ChatMessage[]): boolean {
  return serverMessages.some(
    (m) =>
      m.senderType === 'admin' &&
      m.text === pending.text &&
      m.createdAt > 0 &&
      m.createdAt >= pending.createdAt - 5000,
  );
}

function mergeWithPending(
  serverMessages: ChatMessage[],
  pending: ChatMessage[],
  stableIds: Map<string, string>,
): ChatMessage[] {
  const consumedPending = new Set<string>();
  const result: ChatMessage[] = [];

  for (const m of serverMessages) {
    const matchingPending = pending.find(
      (p) =>
        !consumedPending.has(p.id) &&
        p.senderType === 'admin' &&
        m.senderType === 'admin' &&
        p.text === m.text,
    );

    if (matchingPending) {
      consumedPending.add(matchingPending.id);
      if (!stableIds.has(m.id)) {
        stableIds.set(m.id, matchingPending.id);
      }
      const stableId = stableIds.get(m.id)!;
      const stableTime = Math.max(
        matchingPending.createdAt,
        m.createdAt > 0 ? m.createdAt : 0,
      );
      result.push({ ...m, id: stableId, createdAt: stableTime });
      continue;
    }

    const stableId = stableIds.get(m.id);
    result.push(stableId ? { ...m, id: stableId } : m);
  }

  for (const p of pending) {
    if (!consumedPending.has(p.id)) {
      result.push(p);
    }
  }

  return result.sort((a, b) => {
    const diff = a.createdAt - b.createdAt;
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

export function useMessages({
  conversationId,
  adminId,
  enabled,
  language,
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const stableIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !conversationId) {
      setMessages([]);
      setPendingMessages([]);
      stableIdsRef.current.clear();
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

    return () => {
      unsubscribe();
      stableIdsRef.current.clear();
    };
  }, [enabled, conversationId]);

  useEffect(() => {
    setPendingMessages((prev) => {
      const next = prev.filter((p) => !isPendingFullySynced(p, messages));
      return next.length === prev.length ? prev : next;
    });
  }, [messages]);

  const unreadFromResident = useMemo(
    () => messages.filter((m) => m.senderType === 'resident' && !m.read).length,
    [messages],
  );

  useEffect(() => {
    if (!enabled || !conversationId || unreadFromResident === 0) return;

    markConversationReadForAdmin(conversationId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to mark messages read';
      console.warn('[PrivateChat] mark read:', message);
    });
  }, [enabled, conversationId, unreadFromResident]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId || adminId == null || sendingRef.current) return;

      const optimisticId = `pending-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        senderId: adminId,
        senderType: 'admin',
        text: trimmed,
        createdAt: Date.now(),
        read: false,
      };

      sendingRef.current = true;
      setSending(true);
      setError(null);
      setPendingMessages((prev) => [...prev, optimisticMessage]);

      try {
        await sendChatMessage({
          conversationId,
          adminId,
          text: trimmed,
        });
      } catch (err) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        throw err;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [conversationId, adminId],
  );

  const mergedMessages = useMemo(
    () => mergeWithPending(messages, pendingMessages, stableIdsRef.current),
    [messages, pendingMessages],
  );

  const formattedMessages = mergedMessages.map((message) => ({
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
