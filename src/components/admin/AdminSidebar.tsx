import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  Settings,
  Home,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Building,
  Wrench,
  Ticket,
  Briefcase,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';
import { chatPageIdForResidence } from './chatMockData';
import { adminPanelTitleKey, isSuperAdmin } from '../../utils/rbac';
import { useChatResidences } from '../../hooks/useChatResidences';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  sessionUser?: { role?: unknown; residences?: unknown } | null;
}

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
}

export function AdminSidebar({ currentPage, onNavigate, sessionUser }: AdminSidebarProps) {
  const { t } = useLanguage();
  const panelTitle = t(adminPanelTitleKey(sessionUser));
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { items: chatResidences } = useChatResidences(sessionUser);

  const chatSubmenu = useMemo(
    () =>
      chatResidences.map((r) => ({
        id: chatPageIdForResidence(r.id),
        label: r.name,
      })),
    [chatResidences],
  );

  // Keep Condominium Chat submenu open when a residence chat (or legacy chat) is active
  useEffect(() => {
    if (currentPage === 'condominium-chat' || /^condominium-chat-\d+$/.test(currentPage)) {
      setExpandedMenus((prev) =>
        prev.includes('condominium-chat-menu') ? prev : [...prev, 'condominium-chat-menu'],
      );
    }
  }, [currentPage]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!sessionUser) {
      return [];
    }

    const restricted: MenuItem[] = [
      { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
      {
        id: 'residences-menu',
        icon: Building,
        label: t('residences'),
        submenu: [
          { id: 'residence-list', label: t('residences') },
          { id: 'units', label: t('units') },
        ],
      },
      {
        id: 'maintenance-management',
        icon: Wrench,
        label: t('maintenances'),
        submenu: [{ id: 'residence-wise-maintenances', label: t('maintenances') }],
      },
      {
        id: 'condominium-chat-menu',
        icon: MessageCircle,
        label: t('condominiumChat'),
        submenu: chatSubmenu,
      },
    ];

    const full: MenuItem[] = [
      { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
      {
        id: 'residences-menu',
        icon: Building,
        label: t('residences'),
        submenu: [
          { id: 'residence-list', label: t('residences') },
          { id: 'units', label: t('units') },
          { id: 'construction-phases', label: t('constructionPhases') },
        ],
      },
      {
        id: 'document-management',
        icon: FileText,
        label: t('documents'),
        submenu: [{ id: 'document-list', label: t('documents') }],
      },
      {
        id: 'maintenance-management',
        icon: Wrench,
        label: t('maintenances'),
        submenu: [{ id: 'maintenance-list', label: t('maintenances') }],
      },
      {
        id: 'support-management',
        icon: Ticket,
        label: t('supportTicketsMenu'),
        submenu: [{ id: 'support-list', label: t('supportTicketsMenu') }],
      },
      {
        id: 'condominium-chat-menu',
        icon: MessageCircle,
        label: t('condominiumChat'),
        submenu: chatSubmenu,
      },
      {
        id: 'company-management',
        icon: Briefcase,
        label: t('companyManagement'),
        submenu: [{ id: 'company-list', label: t('companyManagement') }],
      },
      { id: 'users', icon: Users, label: t('userManagement') },
    ];

    if (isSuperAdmin(sessionUser)) {
      return full;
    }

    return restricted;
  }, [sessionUser, t, chatSubmenu]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.submenu) {
      toggleMenu(item.id);
    } else {
      onNavigate(item.id);
    }
  };

  const handleSubMenuClick = (subItemId: string) => {
    onNavigate(subItemId);
  };

  const isMenuActive = (item: MenuItem) => {
    if (item.submenu) {
      if (item.id === 'condominium-chat-menu') {
        return (
          item.submenu.some((subItem) => subItem.id === currentPage) ||
          currentPage === 'condominium-chat'
        );
      }
      return item.submenu.some((subItem) => subItem.id === currentPage);
    }
    return currentPage === item.id;
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full w-64 bg-white border-r border-neutral-line-200 flex flex-col"
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-neutral-line-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col items-start gap-1.5"
        >
          <img
            src={casazeroLogo}
            alt="CasaZero"
            className="block h-7 w-auto object-contain"
            style={{
              filter:
                'brightness(0) saturate(100%) invert(48%) sepia(14%) saturate(1436%) hue-rotate(83deg) brightness(92%) contrast(88%)',
              transform: 'scaleX(0.90) translateX(-3px)',
              transformOrigin: 'left center',
            }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-neutral-ink-500"
          >
            {panelTitle}
          </motion.p>
        </motion.div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isMenuActive(item);
            const isExpanded = expandedMenus.includes(item.id);

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
              >
                {/* Main Menu Item */}
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive && !item.submenu
                      ? 'bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white shadow-lg'
                      : isActive
                      ? 'bg-neutral-line-100 text-[#6A8F7B]'
                      : 'text-neutral-ink-700 hover:bg-neutral-line-100 hover:text-[#6A8F7B]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive && !item.submenu ? 'text-white' : ''}`} />
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  
                  {item.submenu ? (
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className={`w-4 h-4 ${isActive ? 'text-[#6A8F7B]' : ''}`} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-2 h-2 rounded-full bg-white"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  ) : null}
                </button>

                {/* Submenu Items */}
                <AnimatePresence>
                  {item.submenu && isExpanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-4 mt-1 space-y-1"
                    >
                      {item.submenu.map((subItem) => {
                        const isSubActive =
                          currentPage === subItem.id ||
                          (currentPage === 'condominium-chat' &&
                            item.id === 'condominium-chat-menu' &&
                            subItem.id === 'condominium-chat-1');
                        
                        return (
                          <motion.li
                            key={subItem.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <button
                              onClick={() => handleSubMenuClick(subItem.id)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 text-left ${
                                isSubActive
                                  ? 'bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white shadow-md'
                                  : 'text-neutral-ink-600 hover:bg-neutral-line-100 hover:text-[#6A8F7B]'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isSubActive ? 'bg-white' : 'bg-neutral-ink-400'
                              }`} />
                              <span className="text-sm font-medium flex-1 text-left min-w-0">
                                {subItem.label}
                              </span>
                              
                              {isSubActive && (
                                <motion.div
                                  layoutId="activeSubIndicator"
                                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0"
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                              )}
                            </button>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Version Info */}
      <div className="p-4 border-t border-neutral-line-200">
        <p className="text-xs text-neutral-ink-400 text-center">
          {t('adminVersionLabel')}
        </p>
      </div>
    </motion.aside>
  );
}