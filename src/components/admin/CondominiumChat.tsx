import React from 'react';
import { useLanguage } from '../../utils/LanguageContext';
import { CondominiumChatPage } from './CondominiumChatPage';

/** Legacy entry (`condominium-chat`): same chat as residence 1 with page intro. */
export function CondominiumChat() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-ink-900">
          {t('condominiumChat')}
        </h1>
        <p className="text-sm text-neutral-ink-500 mt-1">{t('condominiumChatDesc')}</p>
      </div>

      <CondominiumChatPage residenceId={1} />
    </div>
  );
}
