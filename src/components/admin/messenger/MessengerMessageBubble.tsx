import React, { memo } from 'react';
import { CheckCheck } from 'lucide-react';
import { MESSENGER_INCOMING_BG, MESSENGER_PRIMARY, MESSENGER_SAGE } from './messengerTheme';
import type { MessengerMessage } from './types';

interface MessengerMessageBubbleProps {
  message: MessengerMessage;
}

export const MessengerMessageBubble = memo(function MessengerMessageBubble({
  message,
}: MessengerMessageBubbleProps) {
  if (message.isOutgoing) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%]">
          <div
            className="text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed break-words whitespace-pre-wrap shadow-md"
            style={{
              background: `linear-gradient(135deg, ${MESSENGER_SAGE} 0%, ${MESSENGER_PRIMARY} 100%)`,
            }}
          >
            {message.text}
          </div>
          <div className="flex items-center justify-end gap-1 mt-1.5 pr-0.5">
            <span className="text-[10px] text-neutral-ink-400 tabular-nums font-medium">
              {message.createdAtLabel}
            </span>
            <CheckCheck className="w-3.5 h-3.5 text-[#6A8F7B]" aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%]">
        <div
          className="text-neutral-ink-900 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm border border-[#E8F2EC]"
          style={{ backgroundColor: MESSENGER_INCOMING_BG }}
        >
          {message.text}
        </div>
        <p className="text-[10px] text-neutral-ink-400 mt-1.5 pl-1 tabular-nums font-medium">
          {message.createdAtLabel}
        </p>
      </div>
    </div>
  );
});
