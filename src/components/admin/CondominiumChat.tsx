import React, { useCallback, useState } from 'react';
import { useLanguage } from '../../utils/LanguageContext';
import { ChatWindow } from './ChatWindow';
import type { GroupChatMessage } from './ChatMessage';

/** Single residence context (replace with API). */
const RESIDENCE_NAME = 'Police Park';
const MEMBER_COUNT = 12;

const INITIAL_MESSAGES: GroupChatMessage[] = [
  {
    id: 1,
    sender_name: 'Marco Rossi',
    sender_role: 'resident',
    text: 'Water leakage issue',
    time: '10:10',
  },
  {
    id: 2,
    sender_name: 'Admin',
    sender_role: 'admin',
    text: 'We will fix it',
    time: '10:12',
  },
];

export function CondominiumChat() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<GroupChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender_name: 'Admin',
        sender_role: 'admin',
        text,
        time,
      },
    ]);
    setInput('');
  }, [input]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-ink-900">
          {t('condominiumChat')}
        </h1>
        <p className="text-sm text-neutral-ink-500 mt-1">{t('condominiumChatDesc')}</p>
      </div>

      <ChatWindow
        residenceName={RESIDENCE_NAME}
        memberCount={MEMBER_COUNT}
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
