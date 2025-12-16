import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Megaphone, Send, Bell } from 'lucide-react';

interface AnnouncementComposerProps {
  buildingName?: string;
  onSend?: (announcement: {
    title: string;
    message: string;
    priority: 'normal' | 'urgent';
    sendPushNotification: boolean;
    targetAudience: string;
  }) => void;
}

export function AnnouncementComposer({ buildingName = 'Building A', onSend }: AnnouncementComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [sendPushNotification, setSendPushNotification] = useState(true);
  const [targetAudience, setTargetAudience] = useState('all-residents');

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;

    onSend?.({
      title,
      message,
      priority,
      sendPushNotification,
      targetAudience,
    });

    // Reset form
    setTitle('');
    setMessage('');
    setPriority('normal');
    setSendPushNotification(true);
    setTargetAudience('all-residents');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-sage-500 hover:bg-brand-sage-600">
          <Megaphone className="w-4 h-4 mr-2" />
          Send Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>
            Send a message to residents in {buildingName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              placeholder="e.g., Elevator Maintenance Schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-message">Message</Label>
            <Textarea
              id="announcement-message"
              placeholder="Type your announcement here..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-neutral-ink-500">
              {message.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-audience">Audience</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience}>
              <SelectTrigger id="target-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-residents">All Residents</SelectItem>
                <SelectItem value="specific-floors">Specific Floors</SelectItem>
                <SelectItem value="specific-units">Specific Units</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as 'normal' | 'urgent')}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-info text-white">Normal</Badge>
                    <span className="text-xs">Standard announcement</span>
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-danger text-white">Urgent</Badge>
                    <span className="text-xs">Requires immediate attention</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-line-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-neutral-ink-500" />
              <Label htmlFor="push-notification" className="cursor-pointer">
                Send Push Notification
              </Label>
            </div>
            <Switch
              id="push-notification"
              checked={sendPushNotification}
              onCheckedChange={setSendPushNotification}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!title.trim() || !message.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Send Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
