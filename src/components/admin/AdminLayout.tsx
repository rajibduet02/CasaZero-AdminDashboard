import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminFooter } from './AdminFooter';
import { useIsMobile } from '../ui/use-mobile';
import { Sheet, SheetContent } from '../ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  /** Logged-in user (or rehydrated from storage) for RBAC sidebar — omit for legacy full menu. */
  sessionUser?: { role?: unknown; residences?: unknown } | null;
}

export function AdminLayout({ children, currentPage, onNavigate, onLogout, sessionUser }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-white">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block h-full min-h-0 shrink-0">
        <AdminSidebar currentPage={currentPage} onNavigate={onNavigate} sessionUser={sessionUser} />
      </div>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar
            currentPage={currentPage}
            onNavigate={(page) => {
              onNavigate(page);
              setSidebarOpen(false);
            }}
            sessionUser={sessionUser}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full lg:ml-64">
        {/* Header */}
        <AdminHeader
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
          sessionUser={sessionUser}
        />

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-4 sm:py-6 lg:py-8 w-full"
        >
          <div className="flex min-h-0 w-full max-w-[1600px] flex-1 flex-col mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 overflow-x-hidden">
            {children}
          </div>
        </motion.main>

        {/* Footer */}
        <AdminFooter />
      </div>
    </div>
  );
}
