import React, { memo } from 'react';
import { useLanguage } from '../../../utils/LanguageContext';
import {
  avatarColorClass,
  avatarGradientStyle,
  formatRelativeTime,
  getInitials,
} from './messengerUtils';
import { MESSENGER_BADGE_GREEN, MESSENGER_PRIMARY } from './messengerTheme';
import type { MessengerConversation } from './types';

interface MessengerConversationItemProps {
  conversation: MessengerConversation;
  isSelected: boolean;
  onSelect: (conversationId: string) => void;
}

function conversationItemPropsAreEqual(
  prev: MessengerConversationItemProps,
  next: MessengerConversationItemProps,
): boolean {
  return (
    prev.isSelected === next.isSelected &&
    prev.conversation.id === next.conversation.id &&
    prev.conversation.name === next.conversation.name &&
    prev.conversation.residenceName === next.conversation.residenceName &&
    prev.conversation.lastMessage === next.conversation.lastMessage &&
    prev.conversation.lastMessageAt === next.conversation.lastMessageAt &&
    prev.conversation.unreadCount === next.conversation.unreadCount &&
    prev.conversation.isOnline === next.conversation.isOnline &&
    prev.conversation.hasConversation === next.conversation.hasConversation &&
    prev.conversation.profileImage === next.conversation.profileImage
  );
}

export const MessengerConversationItem = memo(function MessengerConversationItem({
  conversation,
  isSelected,
  onSelect,
}: MessengerConversationItemProps) {
  const { language, t } = useLanguage();
  const timeLabel = formatRelativeTime(conversation.lastMessageAt, language);
  const startLabel = t('messengerStartConversation');
  const lastMessagePreview = conversation.lastMessage?.trim()
    ? conversation.lastMessage
    : startLabel;
  const hasUnread = conversation.unreadCount > 0;
  const initials = getInitials(conversation.name);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.conversationId)}
      className={[
        'w-full flex items-start gap-3.5 py-4 px-3.5 min-h-[5.25rem] text-left rounded-xl border-0 transition-colors duration-150',
        'outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        isSelected
          ? 'bg-[#E8F2EC] shadow-sm border-l-[3px] border-l-[#2D5A43] pl-[calc(0.75rem-3px)]'
          : 'bg-transparent hover:bg-[#F3F5F4] border-l-[3px] border-l-transparent',
      ].join(' ')}
      aria-current={isSelected ? 'true' : undefined}
    >
      <div className="relative shrink-0 mt-0.5">
        {conversation.profileImage ? (
          <img
            src={conversation.profileImage}
            alt=""
            className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-[#E8F2EC]"
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${avatarColorClass(conversation.avatarColor)}`}
            style={avatarGradientStyle(conversation.avatarColor)}
            aria-hidden
          >
            <span className="select-none leading-none">{initials}</span>
          </div>
        )}
        {conversation.isOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: MESSENGER_BADGE_GREEN }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm leading-tight truncate ${hasUnread && !isSelected ? 'font-bold text-neutral-ink-900' : 'font-semibold text-neutral-ink-900'}`}
          >
            {conversation.name}
          </span>
          {timeLabel ? (
            <span
              className={`text-[10px] shrink-0 tabular-nums ${hasUnread && !isSelected ? 'font-semibold text-[#2D5A43]' : 'text-neutral-ink-400'}`}
            >
              {timeLabel}
            </span>
          ) : null}
        </div>
        <p className="text-[10px] leading-snug truncate font-medium text-[#6A8F7B]/50">
          {conversation.residenceName}
        </p>
        <p
          className={`text-xs leading-snug truncate ${hasUnread && !isSelected ? 'text-neutral-ink-700 font-medium' : 'text-neutral-ink-500'} ${!conversation.lastMessage?.trim() ? 'italic' : ''}`}
        >
          {lastMessagePreview}
        </p>
      </div>

      {hasUnread && (
        <span
          className="self-center shrink-0 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold tabular-nums shadow-sm"
          style={{ backgroundColor: MESSENGER_PRIMARY }}
        >
          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
        </span>
      )}
    </button>
  );
}, conversationItemPropsAreEqual);
