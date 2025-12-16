import React from 'react';
import { motion } from 'motion/react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminFooter } from './AdminFooter';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function AdminLayout({ children, currentPage, onNavigate, onLogout }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <AdminSidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen ml-64">
        {/* Header */}
        <AdminHeader onLogout={onLogout} />

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 p-8 overflow-y-auto"
        >
          {children}
        </motion.main>

        {/* Footer */}
        <AdminFooter />
      </div>
    </div>
  );
}
