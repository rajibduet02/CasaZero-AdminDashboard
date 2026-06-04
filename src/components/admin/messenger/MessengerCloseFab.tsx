import React, { memo } from 'react';
import { X } from 'lucide-react';
import { MESSENGER_PRIMARY } from './messengerTheme';

interface MessengerCloseFabProps {
  onClose: () => void;
}

export const MessengerCloseFab = memo(function MessengerCloseFab({ onClose }: MessengerCloseFabProps) {
  return (
    <button
      id="casazero-messenger-close-fab"
      type="button"
      onClick={onClose}
      aria-label="Close messenger"
      className="fixed z-[101] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        backgroundColor: MESSENGER_PRIMARY,
        bottom: '1.25rem',
        right: '1.25rem',
      }}
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
});
