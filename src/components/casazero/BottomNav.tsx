import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, FileText, MessageCircle, Home as SmartHome, User, Wrench } from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { useLanguage } from '../../utils/LanguageContext';
import aiChatIcon from 'figma:asset/88b68ee504f343bdee6862cbaaa850243d8833f6.png';

interface BottomNavProps {
  activeTab: string;
  role: Role;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, role, onTabChange }: BottomNavProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  
  // Hub screens that should highlight the hub icon
  const hubScreens = ['hub', 'aichat', 'chat', 'smarthome'];
  const isHubActive = hubScreens.includes(activeTab);
  
  const tabs = [
    { id: 'home', icon: Home, label: t('home'), show: true },
    { id: 'documents', icon: FileText, label: t('documents'), show: permissions.canAccessDocuments },
    { id: 'hub', icon: null, label: t('ai'), show: permissions.canAccessAI, isImage: true },
    { id: 'maintenance', icon: Wrench, label: t('maintenance'), show: permissions.canAccessMaintenance },
    { id: 'profile', icon: User, label: t('profile'), show: permissions.canAccessProfile },
  ].filter(tab => tab.show);

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-line-200 safe-area-bottom z-50"
    >
      <nav className="flex items-center justify-around h-16 max-w-md mx-auto px-2 relative">

        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'hub' ? isHubActive : activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full group relative z-10"
              aria-label={tab.label}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <motion.div 
                className="relative"
                animate={{
                  scale: isActive ? 1.08 : 1,
                  y: isActive ? -2 : 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }}
              >
                <motion.div
                  animate={{
                    rotate: isActive ? [0, -8, 8, 0] : 0
                  }}
                  transition={{
                    duration: 0.4
                  }}
                >
                  {tab.isImage ? (
                    <img 
                      src={aiChatIcon} 
                      alt="Ecosystem Hub"
                      className="w-7 h-7 transition-all duration-200 relative z-10"
                      style={{
                        opacity: isActive ? 1 : 0.5,
                        filter: isActive ? 'none' : 'grayscale(0.3) brightness(0.6)'
                      }}
                    />
                  ) : Icon ? (
                    <Icon
                      className="w-6 h-6 transition-all duration-200 relative z-10"
                      style={{
                        color: isActive ? '#4CAF47' : '#333333',
                        strokeWidth: isActive ? 2.5 : 2
                      }}
                    />
                  ) : null}
                </motion.div>
              </motion.div>
              
              {/* Active Indicator Dot */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 20
                    }}
                    className="absolute bottom-1.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#4CAF47' }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
}
