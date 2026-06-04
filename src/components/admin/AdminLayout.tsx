import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminFooter } from './AdminFooter';
import { useIsMobile } from '../ui/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { cn } from '../ui/utils';
import { isCondominiumChatPage } from './chatMockData';

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
  const isChatPage = isCondominiumChatPage(currentPage);

  useEffect(() => {
    if (!isChatPage) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [isChatPage]);

  return (
    <div className="flex h-full min-h-0 max-h-screen overflow-hidden bg-white">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block h-full min-h-0 shrink-0">
        <AdminSidebar currentPage={currentPage} onNavigate={onNavigate} sessionUser={sessionUser} />
      </div>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Admin dashboard menu</SheetDescription>
          </SheetHeader>
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
          className={cn(
            'relative flex min-h-0 flex-1 flex-col overflow-x-hidden w-full',
            isChatPage ? 'overflow-hidden' : 'overflow-y-auto py-4 sm:py-6 lg:py-8',
          )}
        >
          {isChatPage ? (
            <div className="admin-chat-main absolute inset-0 flex flex-col overflow-hidden px-4 py-2 sm:px-6 sm:py-3 lg:px-8 xl:px-10">
              <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col overflow-hidden">
                {children}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-x-hidden px-4 sm:px-6 lg:px-8 xl:px-10">
              {children}
            </div>
          )}
        </motion.main>

        {/* Footer */}
        <AdminFooter />
      </div>
    </div>
  );
}
