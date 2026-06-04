import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, User, LogOut, Settings, ChevronDown, Menu } from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { adminPanelTitleKey, getSessionUserEmail, isAdmin, isSuperAdmin, resolveSessionUser } from '../../utils/rbac';
import { Button } from '../ui/button';
import { MessengerButton } from './messenger';

interface AdminHeaderProps {
  onLogout: () => void;
  onMenuClick?: () => void;
  sessionUser?: { role?: unknown; email?: unknown } | null;
}

export function AdminHeader({ onLogout, onMenuClick, sessionUser }: AdminHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const resolvedUser = useMemo(() => resolveSessionUser(sessionUser), [sessionUser]);
  const userEmail = useMemo(() => getSessionUserEmail(resolvedUser), [resolvedUser]);
  const panelTitle = t(adminPanelTitleKey(resolvedUser));
  const showMessenger = isAdmin(resolvedUser) && !isSuperAdmin(resolvedUser);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="shrink-0 bg-white border-b border-neutral-line-200 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-40 w-full"
    >
      {/* Mobile Menu Button */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-2"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Page Title - Will be dynamic */}
      <div className="flex-1 min-w-0">
        <h1 className="text-neutral-ink-900 text-lg sm:text-xl truncate">{panelTitle}</h1>
      </div>

      {/* Right Side - Messenger, Language Switcher & User Menu */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {showMessenger && <MessengerButton />}

        {/* Language Switcher - Hide text on very small screens */}
        <div className="flex items-center gap-1 bg-neutral-line-100 rounded-xl px-2 sm:px-3 py-2">
          <Languages className="w-4 h-4 text-neutral-ink-500 flex-shrink-0" />
          <button
            onClick={() => setLanguage('it')}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs transition-all duration-300 ${
              language === 'it'
                ? 'bg-[#6A8F7B] text-white'
                : 'text-neutral-ink-600 hover:bg-white'
            }`}
          >
            IT
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs transition-all duration-300 ${
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
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-xl hover:bg-neutral-line-100 transition-all duration-300"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left hidden sm:block min-w-0 max-w-[10rem] md:max-w-[14rem]">
              <p className="text-sm text-neutral-ink-900 truncate" title={userEmail || undefined}>
                {userEmail || panelTitle}
              </p>
              <p className="text-xs text-neutral-ink-500 truncate">{panelTitle}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-ink-500 transition-transform duration-300 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-neutral-line-200 shadow-xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-neutral-line-200 min-w-0">
                  <p className="text-sm text-neutral-ink-900 break-all" title={userEmail || undefined}>
                    {userEmail || '—'}
                  </p>
                  <p className="text-xs text-neutral-ink-500 mt-1">{panelTitle}</p>
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
