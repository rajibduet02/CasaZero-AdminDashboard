import React from 'react';
import { useLanguage } from '../../utils/LanguageContext';
import { CondominiumChatPage } from './CondominiumChatPage';
import { CHAT_PAGE_SHELL_CLASS } from './chatMockData';

/** Legacy entry (`condominium-chat`): same chat as residence 1 with page intro. */
export function CondominiumChat() {
  const { t } = useLanguage();

  return (
    <div className={CHAT_PAGE_SHELL_CLASS}>
      <div className="shrink-0 pb-3 sm:pb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-ink-900">
          {t('condominiumChat')}
        </h1>
        <p className="text-sm text-neutral-ink-500 mt-1">{t('condominiumChatDesc')}</p>
      </div>

      <div className={`${CHAT_PAGE_SHELL_CLASS} min-h-0 flex-1`}>
        <CondominiumChatPage residenceId={1} />
      </div>
    </div>
  );
}
