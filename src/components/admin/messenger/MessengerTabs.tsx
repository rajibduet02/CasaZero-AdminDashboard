import React, { memo } from 'react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MESSENGER_PRIMARY } from './messengerTheme';
import type { MessengerTab } from './types';

interface MessengerTabsProps {
  activeTab: MessengerTab;
  onTabChange: (tab: MessengerTab) => void;
  unreadCount: number;
}

const TABS: MessengerTab[] = ['all', 'unread'];

export const MessengerTabs = memo(function MessengerTabs({
  activeTab,
  onTabChange,
  unreadCount,
}: MessengerTabsProps) {
  const { t, language } = useLanguage();

  const tabLabel = (tab: MessengerTab) => {
    if (tab === 'unread') {
      return t('messengerTabUnread') || (language === 'it' ? 'Non letti' : 'Unread');
    }
    return t('messengerTabAll') || (language === 'it' ? 'Tutti' : 'All');
  };

  return (
    <div className="px-5 pb-3 shrink-0">
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#F3F5F4] border border-[#E8F2EC]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold border-0 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35 ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-neutral-ink-600 hover:text-[#2D5A43] hover:bg-white/90'
              }`}
              style={
                isActive
                  ? { background: `linear-gradient(135deg, #6A8F7B 0%, ${MESSENGER_PRIMARY} 100%)` }
                  : undefined
              }
            >
              <span>{tabLabel(tab)}</span>
              {tab === 'unread' && unreadCount > 0 && !isActive && (
                <span
                  className="min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: MESSENGER_PRIMARY }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
