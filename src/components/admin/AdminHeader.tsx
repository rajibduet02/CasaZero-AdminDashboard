import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';

interface AdminHeaderProps {
  onLogout: () => void;
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white border-b border-neutral-line-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40"
    >
      {/* Page Title - Will be dynamic */}
      <div>
        <h1 className="text-neutral-ink-900">{t('adminPanel')}</h1>
      </div>

      {/* Right Side - Language Switcher & User Menu */}
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-neutral-line-100 rounded-xl px-3 py-2">
          <Languages className="w-4 h-4 text-neutral-ink-500" />
          <button
            onClick={() => setLanguage('it')}
            className={`px-3 py-1 rounded-lg text-xs transition-all duration-300 ${
              language === 'it'
                ? 'bg-[#6A8F7B] text-white'
                : 'text-neutral-ink-600 hover:bg-white'
            }`}
          >
            IT
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-lg text-xs transition-all duration-300 ${
              language === 'en'
                ? 'bg-[#6A8F7B] text-white'
                : 'text-neutral-ink-600 hover:bg-white'
            }`}
          >
            EN
          </button>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-neutral-line-100 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm text-neutral-ink-900">Admin User</p>
              <p className="text-xs text-neutral-ink-500">{t('administrator')}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-ink-500 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-neutral-line-200 shadow-xl overflow-hidden"
              >
                <div className="p-4 border-b border-neutral-line-200">
                  <p className="text-sm text-neutral-ink-900">admin@casazero.com</p>
                  <p className="text-xs text-neutral-ink-500 mt-1">{t('administrator')}</p>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // Navigate to settings
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-neutral-ink-700 hover:bg-neutral-line-100 transition-all duration-200"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">{t('settings')}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-danger hover:bg-red-50 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{t('logout')}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
