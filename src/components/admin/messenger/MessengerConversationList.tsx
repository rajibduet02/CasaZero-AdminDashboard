import React, { memo } from 'react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MessengerConversationItem } from './MessengerConversationItem';
import { MessengerConversationSkeleton } from './MessengerConversationSkeleton';
import type { MessengerConversation } from './types';

interface MessengerConversationListProps {
  conversations: MessengerConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
}

export const MessengerConversationList = memo(function MessengerConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: MessengerConversationListProps) {
  const { t } = useLanguage();
  const sectionLabel = t('messengerRecent');
  const showSkeleton = loading && conversations.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-0 overflow-hidden bg-[#F8FAF9]">
      <div className="shrink-0 bg-[#F8FAF9] px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#E8F2EC]/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-ink-500">
          {sectionLabel}
        </span>
        <span className="text-[10px] font-semibold text-[#6A8F7B] tabular-nums bg-white px-2 py-0.5 rounded-full ring-1 ring-[#6A8F7B]/15">
          {showSkeleton ? '…' : conversations.length}
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-5 pt-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: '#6A8F7B40 transparent',
        }}
      >
        {showSkeleton ? (
          <MessengerConversationSkeleton />
        ) : conversations.length === 0 ? (
          <p className="text-center text-xs text-neutral-ink-500 py-10 px-4 rounded-xl bg-white/60 mx-1">
            {t('messengerNoConversations')}
          </p>
        ) : (
          <ul className="space-y-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <MessengerConversationItem
                  conversation={c}
                  isSelected={selectedId === c.conversationId}
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

