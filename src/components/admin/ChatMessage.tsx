import React from 'react';

export interface GroupChatMessage {
  id: string | number;
  sender_name: string;
  sender_role: 'resident' | 'admin';
  /** Localized role label shown beside the sender name */
  sender_role_label?: string;
  text: string;
  time: string;
}

interface ChatMessageProps {
  message: GroupChatMessage;
}

function SenderMeta({
  name,
  roleLabel,
  align,
}: {
  name: string;
  roleLabel?: string;
  align: 'left' | 'right';
}) {
  return (
    <p
      className={`text-xs text-neutral-500 mb-1 flex flex-wrap items-center gap-1.5 ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      <span className="font-medium text-neutral-ink-700">{name}</span>
      {roleLabel ? (
        <span className="text-[10px] uppercase tracking-wide text-neutral-ink-400 bg-neutral-line-100 px-1.5 py-0.5 rounded">
          {roleLabel}
        </span>
      ) : null}
    </p>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAdmin = message.sender_role === 'admin';
  const roleLabel = message.sender_role_label;

  if (isAdmin) {
    return (
      <div className="flex w-full">
        <div className="flex w-full justify-end">
          <div className="max-w-[65%] w-fit">
            <SenderMeta name={message.sender_name} roleLabel={roleLabel} align="right" />
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
          <SenderMeta name={message.sender_name} roleLabel={roleLabel} align="left" />
          <div className="bg-neutral-100 text-neutral-ink-900 px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed">
            {message.text}
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 tabular-nums">{message.time}</p>
        </div>
      </div>
    </div>
  );
}
