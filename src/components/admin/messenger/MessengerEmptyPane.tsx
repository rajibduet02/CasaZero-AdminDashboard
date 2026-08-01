import React, { memo } from 'react';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MESSENGER_PRIMARY, MESSENGER_SAGE } from './messengerTheme';

export const MessengerEmptyPane = memo(function MessengerEmptyPane() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 text-center min-h-0 relative overflow-hidden bg-[#F8FAF9]">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(106, 143, 123, 0.12) 0%, transparent 55%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative flex items-center gap-2 text-[#6A8F7B] mb-6 text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('pickFromList')}</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
        style={{
          background: `linear-gradient(145deg, ${MESSENGER_SAGE} 0%, ${MESSENGER_PRIMARY} 100%)`,
        }}
      >
        <MessageCircle className="w-10 h-10 text-white" strokeWidth={1.75} />
        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#2FB476]" />
      </motion.div>

      <p className="relative text-base font-bold text-neutral-ink-900">{t('messengerSelectChat')}</p>
      <p className="relative text-sm text-neutral-ink-500 mt-2 max-w-[260px] leading-relaxed">
        {t('messengerSelectChatHint')}
      </p>
    </div>
  );
});
