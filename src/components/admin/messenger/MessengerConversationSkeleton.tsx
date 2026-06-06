import React, { memo } from 'react';

const SKELETON_ROW_COUNT = 8;

export const MessengerConversationSkeleton = memo(function MessengerConversationSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <li key={index}>
          <div className="flex items-start gap-3.5 py-4 px-3.5 min-h-[5.25rem] rounded-xl bg-white/40">
            <div className="w-11 h-11 rounded-full bg-[#E8F2EC] shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0 space-y-2 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div
                  className="h-3.5 rounded-md bg-[#E8F2EC] animate-pulse"
                  style={{ width: `${55 + (index % 3) * 12}%` }}
                />
                <div className="h-2.5 w-10 rounded-md bg-[#F3F5F4] animate-pulse shrink-0" />
              </div>
              <div
                className="h-2.5 rounded-md bg-[#F3F5F4] animate-pulse"
                style={{ width: `${35 + (index % 4) * 8}%` }}
              />
              <div
                className="h-3 rounded-md bg-[#F3F5F4] animate-pulse"
                style={{ width: `${70 + (index % 2) * 15}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
});
