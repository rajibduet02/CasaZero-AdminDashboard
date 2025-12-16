import React from 'react';
import { motion } from 'motion/react';
import { Bell, Search, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';

interface AppBarProps {
  title?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  canGoForward?: boolean;
  onForward?: () => void;
  showResidenceSwitcher?: boolean;
  currentResidence?: string;
  onResidenceSwitch?: () => void;
  showSearch?: boolean;
  onSearch?: () => void;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotifications?: () => void;
  variant?: 'default' | 'branded' | 'minimal';
}

export function AppBar({
  title,
  canGoBack = false,
  onBack,
  canGoForward = false,
  onForward,
  showResidenceSwitcher,
  currentResidence,
  onResidenceSwitch,
  showSearch,
  onSearch,
  showNotifications = true,
  notificationCount = 0,
  onNotifications,
  variant = 'default',
}: AppBarProps) {
  const showNavigationControls = canGoBack || canGoForward;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-neutral-line-100/50 z-40 safe-area-top shadow-lg shadow-black/5"
      >
        <div className="flex items-center justify-between h-16 px-6 max-w-md mx-auto">
          {/* Left section */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Navigation Controls (Back/Forward) */}
            {showNavigationControls && (
              <div className="flex items-center gap-1.5 mr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: canGoBack ? 1.05 : 1 }}
                      whileTap={{ scale: canGoBack ? 0.95 : 1 }}
                      onClick={onBack}
                      disabled={!canGoBack}
                      className={`p-2.5 rounded-xl transition-all duration-300 shadow-sm ${
                        canGoBack
                          ? 'text-brand-sage-600 bg-brand-sage-50 hover:bg-brand-sage-100 hover:shadow-md'
                          : 'text-neutral-ink-300 cursor-not-allowed bg-neutral-line-100'
                      }`}
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                  </TooltipTrigger>
                  {canGoBack && (
                    <TooltipContent side="bottom" className="text-xs">
                      <p>Go back (Alt+←)</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: canGoForward ? 1.05 : 1 }}
                      whileTap={{ scale: canGoForward ? 0.95 : 1 }}
                      onClick={onForward}
                      disabled={!canGoForward}
                      className={`p-2.5 rounded-xl transition-all duration-300 shadow-sm ${
                        canGoForward
                          ? 'text-brand-sage-600 bg-brand-sage-50 hover:bg-brand-sage-100 hover:shadow-md'
                          : 'text-neutral-ink-300 cursor-not-allowed bg-neutral-line-100'
                      }`}
                      aria-label="Go forward"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </TooltipTrigger>
                  {canGoForward && (
                    <TooltipContent side="bottom" className="text-xs">
                      <p>Go forward (Alt+→)</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}

          {/* Logo/Title Section */}
          {!showNavigationControls && variant === 'branded' && (
            <motion.img 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              src={casazeroLogo} 
              alt="CasaZero" 
              className="h-6 object-contain" 
            />
          )}
          
          {showResidenceSwitcher ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onResidenceSwitch}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-sage-50/80 hover:bg-brand-sage-100 transition-all duration-300 min-w-0 shadow-sm hover:shadow-md"
            >
              <span className="truncate text-neutral-ink-900 font-medium">{currentResidence}</span>
              <motion.div
                animate={{ rotate: [0, 180, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              >
                <ChevronDown className="w-4 h-4 text-neutral-ink-500 flex-shrink-0" />
              </motion.div>
            </motion.button>
          ) : title ? (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-neutral-ink-900 truncate font-medium tracking-tight"
            >
              {title}
            </motion.h1>
          ) : null}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSearch}
              className="p-2.5 text-brand-sage-600 rounded-xl bg-brand-sage-50 hover:bg-brand-sage-100 transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          )}
          
          {showNotifications && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNotifications}
              className="p-2.5 text-brand-sage-600 rounded-xl bg-brand-sage-50 hover:bg-brand-sage-100 transition-all duration-300 relative shadow-sm hover:shadow-md"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 bg-gradient-to-r from-danger to-danger/90 text-white border-2 border-white shadow-lg">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                </motion.div>
              )}
              {notificationCount > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
    </TooltipProvider>
  );
}
