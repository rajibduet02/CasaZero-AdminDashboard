import React from 'react';

export interface GroupChatMessage {
  id: number;
  sender_name: string;
  sender_role: 'resident' | 'admin';
  text: string;
  time: string;
}

interface ChatMessageProps {
  message: GroupChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAdmin = message.sender_role === 'admin';

  if (isAdmin) {
    return (
      <div className="flex w-full">
        <div className="flex w-full justify-end">
          <div className="max-w-[65%] w-fit">
            <p className="text-xs text-right text-neutral-500 mb-1">{message.sender_name}</p>
            <div className="bg-[#6A8F7B] text-white px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </div>
            <p className="text-[10px] text-right text-neutral-400 mt-1 tabular-nums">{message.time}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full">
      <div className="flex w-full justify-start">
        <div className="max-w-[65%] w-fit">
          <p className="text-xs text-neutral-500 mb-1">{message.sender_name}</p>
          <div className="bg-neutral-100 text-neutral-ink-900 px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed">
            {message.text}
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 tabular-nums">{message.time}</p>
        </div>
      </div>
    </div>
  );
}
