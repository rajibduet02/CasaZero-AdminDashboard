import React, { memo } from 'react';
import { Filter, MessageCircle, SquarePen, X } from 'lucide-react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MESSENGER_PRIMARY, MESSENGER_SAGE } from './messengerTheme';

interface MessengerHeaderProps {
  onFilterClick?: () => void;
  onNewMessageClick?: () => void;
  onClose?: () => void;
}

export const MessengerHeader = memo(function MessengerHeader({
  onFilterClick,
  onNewMessageClick,
  onClose,
}: MessengerHeaderProps) {
  const { t } = useLanguage();
  const title = t('messengerTitle');
  const subtitle = t('messengerSubtitle');

  return (
    <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[#E8F2EC] bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${MESSENGER_SAGE} 0%, ${MESSENGER_PRIMARY} 100%)`,
            }}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 id="casazero-messenger-title" className="text-base font-bold text-neutral-ink-900 leading-tight">
              {title}
            </h2>
            <p className="text-[11px] text-neutral-ink-500 mt-0.5 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onFilterClick}
            className="p-2 rounded-xl border-0 text-neutral-ink-500 hover:bg-[#F3F5F4] hover:text-[#2D5A43] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/40"
            aria-label={t('messengerFilter')}
          >
            <Filter className="w-[17px] h-[17px]" />
          </button>
          <button
            type="button"
            onClick={onNewMessageClick}
            className="p-2 rounded-xl border-0 text-[#2D5A43] bg-[#E8F2EC] hover:bg-[#dce9e2] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/40"
            aria-label={t('messengerNewMessage')}
          >
            <SquarePen className="w-[17px] h-[17px]" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border-0 text-neutral-ink-500 hover:bg-[#F3F5F4] hover:text-red-600 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label={t('close')}
            >
              <X className="w-[17px] h-[17px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
