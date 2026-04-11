import React, { useEffect, useRef } from 'react';
import { Building2, Send } from 'lucide-react';
import { ChatMessage, type GroupChatMessage } from './ChatMessage';
import { cn } from '../ui/utils';
import { useLanguage } from '../../utils/LanguageContext';

interface ChatWindowProps {
  residenceName: string;
  memberCount: number;
  messages: GroupChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  typeMessagePlaceholder: string;
  sendLabel: string;
}

export function ChatWindow({
  residenceName,
  memberCount,
  messages,
  input,
  onInputChange,
  onSend,
  typeMessagePlaceholder,
  sendLabel,
}: ChatWindowProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const subtitle = `${t('groupChat')} • ${memberCount} ${t('members')}`;

  return (
    <div className="flex h-[min(560px,calc(100dvh-12rem))] min-h-[400px] flex-col overflow-hidden rounded-2xl border border-neutral-line-200 bg-white shadow-sm">
      <div className="p-4 border-b border-neutral-line-200 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#6A8F7B]/15 text-[#6A8F7B] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-neutral-ink-900 truncate">{residenceName}</h2>
            <p className="text-xs text-neutral-ink-500 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-6 py-4 space-y-3 overscroll-contain"
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      <div className="p-4 border-t border-neutral-line-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
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
            placeholder={typeMessagePlaceholder}
            className={cn(
              'flex-1 min-w-0 rounded-full px-4 py-2 h-10 text-sm',
              'border border-neutral-line-200 bg-white text-neutral-ink-900 placeholder:text-neutral-ink-400',
              'outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35 focus-visible:border-[#6A8F7B]',
            )}
            aria-label={typeMessagePlaceholder}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim()}
            className={cn(
              'w-10 h-10 rounded-full bg-[#6A8F7B] text-white flex items-center justify-center shrink-0',
              'transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            aria-label={sendLabel}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
