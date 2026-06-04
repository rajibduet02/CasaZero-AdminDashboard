import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendResidenceMessage } from '../../../firebase/firestoreChat.js';
import { useChatResidences } from '../../../hooks/useChatResidences';
import { useChatSenderDisplayName } from '../../../hooks/useChatSenderDisplayName.js';
import { useFirestoreResidenceChat } from '../../../hooks/useFirestoreResidenceChat.js';
import { getSessionResidenceAdminId } from '../../../utils/api';
import { chatRoleLabel, enrichChatSenderName } from '../../../utils/chatDisplay.js';
import { isSuperAdmin } from '../../../utils/rbac';
import { markConversationRead } from './messengerUtils';
import type { MessengerMessage, MessengerSessionUser } from './types';

export function useMessengerChat(
  residenceId: number | null,
  sessionUser: MessengerSessionUser | null,
  language: 'it' | 'en',
  t: (key: string) => string,
) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { items: allowedResidences, loading: residencesLoading } = useChatResidences(sessionUser);
  const sessionDisplayName = useChatSenderDisplayName(sessionUser);
  const sessionUserId = useMemo(() => getSessionResidenceAdminId(sessionUser), [sessionUser]);
  const isSuperAdminRole = isSuperAdmin(sessionUser);

  useEffect(() => {
    setInput('');
    setSendError(null);
  }, [residenceId]);

  const {
    messages,
    loading,
    error,
    accessDenied,
    authRequired,
    isPermissionDenied,
  } = useFirestoreResidenceChat(residenceId, {
    allowedResidences,
    sessionUser,
    catalogLoading: residencesLoading,
  });

  const chatMessages: MessengerMessage[] = useMemo(
    () =>
      messages.map((m) => {
        const senderName = enrichChatSenderName(
          m.senderName,
          m.sender_role,
          m.user_id,
          sessionUserId,
          sessionDisplayName,
          String(sessionUser?.email ?? ''),
        );
        const isOutgoing =
          m.sender_role === 'admin' ||
          (m.user_id != null && sessionUserId != null && m.user_id === sessionUserId);
        return {
          id: m.id,
          text: m.text,
          createdAt: m.createdAt,
          createdAtLabel: m.createdAtLabel,
          senderName,
          sender_role: m.sender_role === 'admin' ? 'admin' : 'resident',
          sender_role_label: chatRoleLabel(m.sender_role, t),
          user_id: m.user_id,
          isOutgoing,
        };
      }),
    [messages, sessionDisplayName, sessionUserId, sessionUser, t],
  );

  useEffect(() => {
    if (residenceId == null || chatMessages.length === 0) return;
    const last = chatMessages[chatMessages.length - 1];
    if (last?.createdAt) {
      markConversationRead(residenceId, last.createdAt);
    }
  }, [residenceId, chatMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSuperAdminRole || residenceId == null || sending) return;

    const nameForSend = String(sessionDisplayName ?? '').trim();
    if (!nameForSend) {
      setSendError(
        language === 'it'
          ? 'Impossibile caricare il nome utente. Riprova tra poco.'
          : 'Could not load your username. Please wait and try again.',
      );
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await sendResidenceMessage(residenceId, {
        text,
        sessionUser,
        displayName: nameForSend,
      });
      setInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(message);
    } finally {
      setSending(false);
    }
  }, [input, isSuperAdminRole, residenceId, sending, sessionUser, sessionDisplayName, language]);

  const readOnly = isSuperAdminRole;

  const memberCount = useMemo(() => {
    const names = new Set(messages.map((m) => m.senderName).filter(Boolean));
    return Math.max(names.size, messages.length > 0 ? 1 : 0);
  }, [messages]);

  return {
    chatMessages,
    input,
    setInput,
    handleSend,
    sending,
    sendError,
    loading: residencesLoading || loading,
    error,
    accessDenied,
    authRequired,
    isPermissionDenied,
    readOnly,
    isSuperAdminRole,
    memberCount,
  };
}
