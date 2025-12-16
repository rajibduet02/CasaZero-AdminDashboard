import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Send, Paperclip, Image as ImageIcon, MoreVertical, Bell, BellOff, Megaphone, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { type Role, getPermissions } from '../../utils/permissions';
import { AnnouncementComposer } from '../casazero/AnnouncementComposer';
import { useLanguage } from '../../utils/LanguageContext';

interface ChatMessage {
  id: string;
  sender: string;
  senderRole: 'admin' | 'resident';
  content: string;
  timestamp: Date;
  type: 'message' | 'announcement';
  attachment?: {
    type: 'image' | 'document';
    name: string;
  };
}

interface ChatScreenProps {
  role: Role;
}

export function ChatScreen({ role }: ChatScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      sender: 'Building Administrator',
      senderRole: 'admin',
      content: 'Important: Elevator maintenance scheduled for November 8-9. Please use the stairs during this period.',
      timestamp: new Date('2025-11-01T10:30:00'),
      type: 'announcement',
    },
    {
      id: '2',
      sender: 'Marco R.',
      senderRole: 'resident',
      content: 'Will the water be shut off during the maintenance?',
      timestamp: new Date('2025-11-01T11:15:00'),
      type: 'message',
    },
    {
      id: '3',
      sender: 'Building Administrator',
      senderRole: 'admin',
      content: 'No, only elevator service will be affected. Water and all other utilities will operate normally.',
      timestamp: new Date('2025-11-01T11:20:00'),
      type: 'message',
    },
    {
      id: '4',
      sender: 'Sofia M.',
      senderRole: 'resident',
      content: 'Thank you for the update!',
      timestamp: new Date('2025-11-01T14:45:00'),
      type: 'message',
    },
    {
      id: '5',
      sender: 'Building Administrator',
      senderRole: 'admin',
      content: 'Reminder: Monthly condominium meeting this Friday at 6 PM in the community room.',
      timestamp: new Date('2025-11-02T09:00:00'),
      type: 'announcement',
    },
    {
      id: '6',
      sender: 'Luca P.',
      senderRole: 'resident',
      content: 'Can we join online?',
      timestamp: new Date('2025-11-02T09:30:00'),
      type: 'message',
    },
  ];

  const [messages, setMessages] = useState(mockMessages);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'You',
      senderRole: 'resident',
      content: message,
      timestamp: new Date(),
      type: 'message',
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] max-w-md mx-auto bg-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base mb-0.5">{t('groupChat')}</h3>
            <p className="text-xs text-neutral-ink-500">{t('onlineNow')}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    {t('unmute') || 'Unmute'}
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    {t('mute') || 'Mute'}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>{t('viewParticipants') || 'View Participants'}</DropdownMenuItem>
              {permissions.canModerateChat && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Megaphone className="w-4 h-4 mr-2" />
                    {t('sendAnnouncement') || 'Send Announcement'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-danger">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearChatHistory') || 'Clear Chat History'}
                  </DropdownMenuItem>
                </>
              )}
              {!permissions.canModerateChat && (
                <DropdownMenuItem className="text-danger">{t('reportMessage') || 'Report Message'}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-4">
          <div className="space-y-4 pb-4">
          {messages.map((msg, idx) => {
            const isOwnMessage = msg.sender === 'You';
            const showAvatar = idx === 0 || messages[idx - 1].sender !== msg.sender;

            return (
              <div key={msg.id}>
                {/* Announcement */}
                {msg.type === 'announcement' && (
                  <div className="mb-4">
                    <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                          <span className="text-sm">📢</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-warning">{t('communityAnnouncement')}</span>
                            <Badge variant="secondary" className="text-xs">
                              {msg.sender}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-ink-900">{msg.content}</p>
                          <p className="text-xs text-neutral-ink-400 mt-1">
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regular Message */}
                {msg.type === 'message' && (
                  <div
                    className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && showAvatar && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-brand-sage-300 text-brand-sage-600 text-xs">
                          {msg.sender.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isOwnMessage && !showAvatar && <div className="w-8 flex-shrink-0" />}

                    <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      {showAvatar && !isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-neutral-ink-700">{msg.sender}</span>
                          {msg.senderRole === 'admin' && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isOwnMessage
                            ? 'bg-brand-sage-600 text-white'
                            : 'bg-surface-white border border-neutral-line-200 text-neutral-ink-900'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        {msg.attachment && (
                          <div className="mt-2 p-2 rounded-lg bg-black/5 flex items-center gap-2">
                            {msg.attachment.type === 'image' ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <Paperclip className="w-4 h-4" />
                            )}
                            <span className="text-xs">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>

                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-neutral-ink-400' : 'text-neutral-ink-400'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-brand-sage-300 text-brand-sage-600 text-xs">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="bg-surface-white border border-neutral-line-200 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-neutral-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Invisible div for auto-scroll */}
          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-neutral-line-200 bg-surface-white px-4 py-3">
        {permissions.canCreateAnnouncements && (
          <div className="mb-3">
            <AnnouncementComposer 
              buildingName="Residenza Verde Building A"
              onSend={(announcement) => {
                const newMessage: ChatMessage = {
                  id: Date.now().toString(),
                  sender: 'Building Administrator',
                  senderRole: 'admin',
                  content: announcement.message,
                  timestamp: new Date(),
                  type: 'announcement',
                };
                setMessages([...messages, newMessage]);
              }}
            />
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('typeMessage')}
              className="pr-10"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-shrink-0"
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
