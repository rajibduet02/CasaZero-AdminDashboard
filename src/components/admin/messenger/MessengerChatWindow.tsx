import React, { memo, useEffect, useRef } from 'react';
import { MoreVertical, Phone, Send, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MessengerMessageBubble } from './MessengerMessageBubble';
import { avatarColorClass, avatarGradientStyle, getInitials } from './messengerUtils';
import {
  MESSENGER_BADGE_GREEN,
  MESSENGER_CHAT_BG,
  MESSENGER_PRIMARY,
  MESSENGER_SAGE,
} from './messengerTheme';
import type { MessengerConversation, MessengerMessage } from './types';

interface MessengerChatWindowProps {
  conversation: MessengerConversation;
  messages: MessengerMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
}

export const MessengerChatWindow = memo(function MessengerChatWindow({
  conversation,
  messages,
  input,
  onInputChange,
  onSend,
  sending = false,
}: MessengerChatWindowProps) {
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const statusLabel = conversation.isOnline
    ? t('messengerActiveNow') || (language === 'it' ? 'Attivo ora' : 'Active now')
    : t('messengerOffline') || (language === 'it' ? 'Offline' : 'Offline');

  return (
    <motion.div
      key={conversation.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col flex-1 min-h-0 h-full w-full max-h-full"
    >
      <header className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-[#E8F2EC] bg-white shadow-sm">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-[#E8F2EC] shadow-md ${avatarColorClass(conversation.avatarColor)}`}
          style={avatarGradientStyle(conversation.avatarColor)}
          aria-hidden
        >
          <span className="select-none leading-none">{getInitials(conversation.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-neutral-ink-900 truncate">{conversation.name}</p>
          {conversation.residenceName ? (
            <p className="text-[11px] text-neutral-ink-500 truncate mt-0.5 font-medium">
              {conversation.residenceName}
            </p>
          ) : null}
          <p className="text-[11px] flex items-center gap-1.5 mt-0.5 font-medium">
            {conversation.isOnline && (
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
                  style={{ backgroundColor: MESSENGER_BADGE_GREEN }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: MESSENGER_BADGE_GREEN }}
                />
              </span>
            )}
            <span style={{ color: conversation.isOnline ? '#2FB476' : '#9CA3AF' }}>
              {statusLabel}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {/* <button
            type="button"
            className="p-2.5 rounded-xl border-0 text-neutral-ink-500 hover:bg-[#F3F5F4] hover:text-[#2D5A43] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35"
            aria-label={t('messengerCall') || 'Call'}
            disabled
          >
            <Phone className="w-4 h-4" />
          </button> */}
          <button
            type="button"
            className="p-2.5 rounded-xl border-0 text-neutral-ink-500 hover:bg-[#F3F5F4] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35"
            aria-label={t('more') || 'More'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-5 pt-8 pb-5 space-y-4"
        style={{
          backgroundColor: MESSENGER_CHAT_BG,
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(106, 143, 123, 0.06) 0%, transparent 45%), radial-gradient(circle at 80% 90%, rgba(45, 90, 67, 0.05) 0%, transparent 40%)',
        }}
      >
        {messages.length === 0 ? (
          <p className="text-xs text-neutral-ink-500 text-center py-12">
            {t('messengerEmptyChat') || (language === 'it' ? 'Nessun messaggio' : 'No messages yet')}
          </p>
        ) : (
          messages.map((m) => <MessengerMessageBubble key={m.id} message={m} />)
        )}
      </div>

      <footer className="shrink-0 border-t border-[#E8F2EC] bg-white px-5 py-4 shadow-[0_-4px_16px_rgba(45,90,67,0.06)]">
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-line-200/80 bg-[#FAFBFC] px-3 py-1.5 shadow-inner focus-within:border-[#6A8F7B]/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#6A8F7B]/20 transition-all">
          <button
            type="button"
            className="p-1.5 text-neutral-ink-400 hover:text-[#6A8F7B] shrink-0 transition-colors"
            aria-label={t('messengerEmoji') || 'Emoji'}
            disabled
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={t('messengerTypePlaceholder') || 'Type a message...'}
            className="flex-1 min-w-0 h-9 bg-transparent text-sm text-neutral-ink-900 placeholder:text-neutral-ink-400 outline-none border-0"
            aria-label={t('typeMessage') || 'Message'}
            disabled={sending}
          />
          <motion.button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || sending}
            whileHover={{ scale: input.trim() ? 1.05 : 1 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-35 shadow-md transition-shadow hover:shadow-lg"
            style={{
              background: input.trim()
                ? `linear-gradient(135deg, ${MESSENGER_SAGE} 0%, ${MESSENGER_PRIMARY} 100%)`
                : '#9CA3AF',
            }}
            aria-label={t('sendMessage') || 'Send'}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </footer>
    </motion.div>
  );
});
