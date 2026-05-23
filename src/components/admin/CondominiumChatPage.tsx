import React, { useMemo } from 'react';
import { AdminChat } from '../../pages/AdminChat.jsx';
import { useChatResidences } from '../../hooks/useChatResidences';
import { resolveSessionUser } from '../../utils/rbac';

interface CondominiumChatPageProps {
  residenceId: number;
  sessionUser?: Record<string, unknown> | null;
}

/**
 * Bridges sidebar residence selection → AdminChat (Firestore realtime + RBAC).
 */
export function CondominiumChatPage({ residenceId, sessionUser: sessionUserProp }: CondominiumChatPageProps) {
  const sessionUser = useMemo(() => resolveSessionUser(sessionUserProp), [sessionUserProp]);
  const { items: chatResidences } = useChatResidences(sessionUser);

  const selectedResidence = useMemo(() => {
    const match = chatResidences.find((r) => r.id === residenceId);
    return {
      id: residenceId,
      name: match?.name ?? `Residence ${residenceId}`,
    };
  }, [chatResidences, residenceId]);

  return <AdminChat selectedResidence={selectedResidence} sessionUser={sessionUser} />;
}
