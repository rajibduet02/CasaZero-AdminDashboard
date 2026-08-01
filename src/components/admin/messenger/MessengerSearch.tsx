import React, { memo } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '../../../utils/LanguageContext';

interface MessengerSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const MessengerSearch = memo(function MessengerSearch({
  value,
  onChange,
}: MessengerSearchProps) {
  const { t } = useLanguage();
  const placeholder = t('messengerSearchPlaceholder');

  return (
    <div className="px-5 py-3 shrink-0">
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-ink-400 group-focus-within:text-[#6A8F7B] transition-colors pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E8F2EC] text-sm text-neutral-ink-900 placeholder:text-neutral-ink-400 outline-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#6A8F7B]/35 focus-visible:border-[#6A8F7B]/30 transition-all"
          aria-label={placeholder}
        />
      </div>
    </div>
  );
});
