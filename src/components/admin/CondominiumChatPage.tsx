import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../utils/LanguageContext';
import { ChatWindow } from './ChatWindow';
import type { GroupChatMessage } from './ChatMessage';
import {
  CHAT_MOCK_RESIDENCES,
  CHAT_MOCK_MEMBER_COUNT,
  getMockChatLines,
} from './chatMockData';

interface CondominiumChatPageProps {
  residenceId: number;
}

export function CondominiumChatPage({ residenceId }: CondominiumChatPageProps) {
  const { t, language } = useLanguage();
  const safeId = CHAT_MOCK_RESIDENCES.some((r) => r.id === residenceId)
    ? residenceId
    : CHAT_MOCK_RESIDENCES[0].id;
  const residenceMeta = CHAT_MOCK_RESIDENCES.find((r) => r.id === safeId)!;
  const residenceName = t(residenceMeta.labelKey);

  const mockLines = useMemo(() => getMockChatLines(safeId), [safeId]);
  const [extraMessages, setExtraMessages] = useState<GroupChatMessage[]>([]);

  useEffect(() => {
    setExtraMessages([]);
  }, [safeId, language]);

  const messages = useMemo(() => {
    const base: GroupChatMessage[] = mockLines.map((line) => ({
      id: line.id,
      sender_name: t(line.senderNameKey),
      sender_role: line.senderRole,
      text: t(line.bodyKey),
      time: line.time,
    }));
    return [...base, ...extraMessages];
  }, [mockLines, t, language, extraMessages]);

  const [input, setInput] = useState('');

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    setExtraMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender_name: t('chatSenderAdmin'),
        sender_role: 'admin',
        text,
        time,
      },
    ]);
    setInput('');
  }, [input, t]);

  return (
    <div className="h-[calc(100vh-140px)] flex min-h-0 flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-neutral-line-200">
      <ChatWindow
        rootClassName="!min-h-0 flex-1 h-full min-h-0 w-full rounded-none border-0 shadow-none !h-full max-h-full"
        residenceName={residenceName}
        memberCount={CHAT_MOCK_MEMBER_COUNT}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        typeMessagePlaceholder={t('typeMessage')}
        sendLabel={t('sendMessage')}
      />
    </div>
  );
}
