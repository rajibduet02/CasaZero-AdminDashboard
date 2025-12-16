import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../casazero/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Wrench, MessageSquare, Ticket, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';

interface Notification {
  id: string;
  type: 'document' | 'maintenance' | 'chat' | 'ticket';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
}

interface NotificationsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'document' | 'maintenance' | 'chat' | 'ticket'>('all');

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'maintenance',
      title: 'HVAC Maintenance Overdue',
      description: 'Your annual HVAC inspection is now overdue. Please schedule service.',
      timestamp: '2 hours ago',
      read: false,
      actionLabel: 'View Task',
    },
    {
      id: '2',
      type: 'document',
      title: 'New Document Available',
      description: 'Energy Performance Certificate 2025 has been uploaded',
      timestamp: '5 hours ago',
      read: false,
      actionLabel: 'View Document',
    },
    {
      id: '3',
      type: 'chat',
      title: 'New Message in Group Chat',
      description: 'Building Administrator: Elevator maintenance scheduled...',
      timestamp: '1 day ago',
      read: true,
      actionLabel: 'Open Chat',
    },
    {
      id: '4',
      type: 'ticket',
      title: 'Support Ticket Update',
      description: 'Your ticket #1234 status changed to "In Progress"',
      timestamp: '2 days ago',
      read: true,
      actionLabel: 'View Ticket',
    },
    {
      id: '5',
      type: 'maintenance',
      title: 'Maintenance Task Completed',
      description: 'Fire extinguisher inspection has been completed',
      timestamp: '3 days ago',
      read: true,
    },
    {
      id: '6',
      type: 'document',
      title: 'Document Update',
      description: 'Building technical specifications have been updated',
      timestamp: '5 days ago',
      read: true,
      actionLabel: 'View Document',
    },
  ];

  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'all') return true;
    return notif.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted');
  };

  const handleAction = (notif: Notification) => {
    // Mark as read first
    markAsRead(notif.id);
    
    // Navigate to the appropriate screen based on notification type
    if (onNavigate) {
      switch (notif.type) {
        case 'document':
          toast.success('Opening documents...');
          onNavigate('documents');
          break;
        case 'maintenance':
          toast.success('Opening maintenance...');
          onNavigate('maintenance');
          break;
        case 'chat':
          toast.success('Opening chat...');
          onNavigate('chat');
          break;
        case 'ticket':
          toast.success('Opening support tickets...');
          onNavigate('tickets');
          break;
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-brand-sage-600" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-warning" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-info" />;
      case 'ticket':
        return <Ticket className="w-5 h-5 text-success" />;
      default:
        return <FileText className="w-5 h-5 text-neutral-ink-500" />;
    }
  };

  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* Header Actions */}
      <div className="sticky top-14 bg-white/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'document', 'maintenance', 'chat', 'ticket'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all capitalize ${
                  filter === f
                    ? 'bg-brand-sage-600 text-white border-brand-sage-600'
                    : 'bg-surface-white text-neutral-ink-700 border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                {f === 'all' ? t('tutte') : f === 'document' ? t('documents') : f === 'maintenance' ? t('maintenance') : f === 'chat' ? t('chat') : t('supportTickets')}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={markAllAsRead}
              className="flex-shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t('markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, height: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Card
                  className={`overflow-hidden transition-all hover:shadow-lg ${
                    !notif.read ? 'border-brand-sage-300 bg-brand-sage-300/5' : ''
                  }`}
                >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-warm-50 flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm">{notif.title}</h4>
                      {!notif.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-sage-600" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-ink-500 mb-2">
                      {notif.description}
                    </p>
                    <p className="text-xs text-neutral-ink-400 mb-3">
                      {notif.timestamp}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {notif.actionLabel && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(notif)}
                          className="hover:bg-brand-sage-50 hover:border-brand-sage-400"
                        >
                          {notif.actionLabel}
                        </Button>
                      )}
                      {!notif.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notif.id)}
                        >
                          {t('markAsRead') || 'Mark as read'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notif.id)}
                        className="text-danger hover:text-danger ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState
                type="empty"
                title={t('noNotifications')}
                description={t('noNotificationsDesc')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
