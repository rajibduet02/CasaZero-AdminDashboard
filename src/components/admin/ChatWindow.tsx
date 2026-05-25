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
  /** When true, message list is visible but composer is hidden (super admin view-only). */
  readOnly?: boolean;
  /** Disables send while a message is posting (condominium admin). */
  sendDisabled?: boolean;
  /** Optional classes merged onto the root container (e.g. full-height chat page). */
  rootClassName?: string;
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
  readOnly = false,
  sendDisabled = false,
  rootClassName,
}: ChatWindowProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const subtitle = `${t('groupChat')} • ${memberCount} ${t('members')}`;

  return (
    <div
      className={cn(
        'admin-chat-window h-full min-h-0 w-full overflow-hidden rounded-2xl border border-neutral-line-200 bg-white shadow-sm',
        readOnly && 'admin-chat-window--readonly',
        rootClassName,
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-line-200 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6A8F7B]/15 text-[#6A8F7B]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-neutral-ink-900">{residenceName}</h2>
            <p className="mt-0.5 truncate text-xs text-neutral-ink-500">{subtitle}</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="admin-chat-messages px-6 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
        </div>
      </div>

      {!readOnly && (
        <footer className="shrink-0 border-t border-neutral-line-200 bg-white p-4">
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
                'h-10 min-w-0 flex-1 rounded-full px-4 py-2 text-sm',
                'border border-neutral-line-200 bg-white text-neutral-ink-900 placeholder:text-neutral-ink-400',
                'outline-none focus-visible:border-[#6A8F7B] focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35',
              )}
              aria-label={typeMessagePlaceholder}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || sendDisabled}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6A8F7B] text-white',
                'transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40',
              )}
              aria-label={sendLabel}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
