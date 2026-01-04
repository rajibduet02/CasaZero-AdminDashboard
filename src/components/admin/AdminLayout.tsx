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
}

export function AdminLayout({ children, currentPage, onNavigate, onLogout }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <AdminSidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar currentPage={currentPage} onNavigate={(page) => {
            onNavigate(page);
            setSidebarOpen(false);
          }} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full lg:ml-64">
        {/* Header */}
        <AdminHeader onLogout={onLogout} onMenuClick={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-full"
        >
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </motion.main>

        {/* Footer */}
        <AdminFooter />
      </div>
    </div>
  );
}
