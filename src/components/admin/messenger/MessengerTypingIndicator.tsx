import React, { memo } from 'react';
import { motion } from 'motion/react';
import { MESSENGER_INCOMING_BG } from './messengerTheme';

export const MessengerTypingIndicator = memo(function MessengerTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-black/[0.03]"
        style={{ backgroundColor: MESSENGER_INCOMING_BG }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[#6A8F7B]/60"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
});
