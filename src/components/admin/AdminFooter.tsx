import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../utils/LanguageContext';

export function AdminFooter() {
  const { t } = useLanguage();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="shrink-0 bg-white border-t border-neutral-line-200 px-8 py-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-ink-500">
          {t('copyright')}
        </p>
        
        <div className="flex items-center gap-6">
          <a 
            href="#" 
            className="text-xs text-neutral-ink-500 hover:text-[#6A8F7B] transition-colors duration-200"
          >
            {t('privacy')}
          </a>
          <a 
            href="#" 
            className="text-xs text-neutral-ink-500 hover:text-[#6A8F7B] transition-colors duration-200"
          >
            {t('terms')}
          </a>
          <a 
            href="#" 
            className="text-xs text-neutral-ink-500 hover:text-[#6A8F7B] transition-colors duration-200"
          >
            {t('support')}
          </a>
        </div>
      </div>
    </motion.footer>
  );
}
