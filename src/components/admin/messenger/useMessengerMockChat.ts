import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMockMessagesForResidence } from './messengerMockData';
import type { MessengerMessage } from './types';

export function useMessengerMockChat(residenceId: number) {
  const [messages, setMessages] = useState<MessengerMessage[]>(() =>
    getMockMessagesForResidence(residenceId),
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessages(getMockMessagesForResidence(residenceId));
    setInput('');
  }, [residenceId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    const outgoing: MessengerMessage = {
      id: `local-${Date.now()}`,
      text,
      createdAt: now.getTime(),
      createdAtLabel: timeLabel,
      senderName: 'You',
      sender_role: 'admin',
      isOutgoing: true,
    };

    setMessages((prev) => [...prev, outgoing]);
    setInput('');
    setSending(false);
  }, [input, sending]);

  const memberCount = useMemo(() => {
    const names = new Set(messages.map((m) => m.senderName));
    return Math.max(names.size, 1);
  }, [messages]);

  return {
    chatMessages: messages,
    input,
    setInput,
    handleSend,
    sending,
    sendError: null as string | null,
    loading: false,
    memberCount,
  };
}
