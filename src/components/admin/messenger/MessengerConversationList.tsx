import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MessengerConversationItem } from './MessengerConversationItem';
import type { MessengerConversation } from './types';

interface MessengerConversationListProps {
  conversations: MessengerConversation[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export const MessengerConversationList = memo(function MessengerConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: MessengerConversationListProps) {
  const { t, language } = useLanguage();
  const sectionLabel =
    t('messengerRecent') || (language === 'it' ? 'Recenti' : 'Recent');

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F8FAF9]">
      <div className="sticky top-0 z-10 shrink-0 bg-[#F8FAF9] px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-[#E8F2EC]/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-ink-500">
          {sectionLabel}
        </span>
        <span className="text-[10px] font-semibold text-[#6A8F7B] tabular-nums bg-white px-2 py-0.5 rounded-full ring-1 ring-[#6A8F7B]/15">
          {conversations.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 scrollbar-thin">
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-ink-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#6A8F7B]" />
            <p className="text-xs">{t('loading') || 'Loading…'}</p>
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-center text-xs text-neutral-ink-500 py-10 px-4 rounded-xl bg-white/60 mx-1">
            {t('messengerNoConversations') ||
              (language === 'it' ? 'Nessuna conversazione' : 'No conversations')}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <MessengerConversationItem
                  conversation={c}
                  isSelected={selectedId === c.id}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
