import React, { memo, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useMessenger } from './useMessenger';
import { MessengerPopup } from './MessengerPopup';
import { MESSENGER_PRIMARY, MESSENGER_SAGE } from './messengerTheme';

export const MessengerButton = memo(function MessengerButton() {
  const messenger = useMessenger();
  const { isOpen, toggleOpen, unreadTotal } = messenger;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleOpen();
    },
    [toggleOpen],
  );

  return (
    <>
      <motion.button
        id="casazero-messenger-trigger"
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadTotal > 0 ? `Messenger, ${unreadTotal} unread` : 'Open messenger'
        }
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/50 focus-visible:ring-offset-2 ${
          isOpen
            ? 'border-[#6A8F7B] text-white shadow-lg shadow-[#6A8F7B]/30'
            : 'border-neutral-line-200 bg-white text-[#6A8F7B] hover:border-[#6A8F7B]/50 hover:shadow-md hover:shadow-[#6A8F7B]/15'
        }`}
        style={
          isOpen
            ? {
                background: `linear-gradient(135deg, ${MESSENGER_SAGE} 0%, ${MESSENGER_PRIMARY} 100%)`,
              }
            : undefined
        }
      >
        <MessageCircle className="w-5 h-5" aria-hidden strokeWidth={2} />
        {unreadTotal > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[1.25rem] h-[1.25rem] px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none tabular-nums ring-2 ring-white shadow-sm animate-pulse"
            style={{ backgroundColor: MESSENGER_PRIMARY }}
            aria-hidden
          >
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </motion.button>

      {isOpen && <MessengerPopup messenger={messenger} />}
    </>
  );
});
