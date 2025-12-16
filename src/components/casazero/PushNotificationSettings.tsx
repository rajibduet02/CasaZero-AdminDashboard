import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Bell, BellOff, Smartphone, Check, AlertCircle } from 'lucide-react';

type NotificationStatus = 'enabled' | 'disabled' | 'permission-required' | 'unsupported';

interface PushNotificationSettingsProps {
  onEnableNotifications?: () => void;
}

export function PushNotificationSettings({ onEnableNotifications }: PushNotificationSettingsProps) {
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('permission-required');
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    
    // Simulate FCM registration
    setTimeout(() => {
      setNotificationStatus('enabled');
      setIsEnabling(false);
      onEnableNotifications?.();
    }, 1500);
  };

  const handleDisableNotifications = () => {
    setNotificationStatus('disabled');
  };

  if (notificationStatus === 'enabled') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-success" />
              <CardTitle className="text-base">Push Notifications</CardTitle>
            </div>
            <Badge className="bg-success text-white">
              <Check className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
          <CardDescription>
            You'll receive real-time updates about documents, maintenance, and messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert className="bg-success/10 border-success/20">
              <Check className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Push notifications are enabled on this device
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2 text-xs text-neutral-ink-500">
              <Smartphone className="w-4 h-4" />
              <span>Device registered via Firebase Cloud Messaging (FCM)</span>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleDisableNotifications}
            >
              <BellOff className="w-4 h-4 mr-2" />
              Disable Notifications
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notificationStatus === 'disabled') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOff className="w-5 h-5 text-neutral-ink-500" />
              <CardTitle className="text-base">Push Notifications</CardTitle>
            </div>
            <Badge variant="secondary">Disabled</Badge>
          </div>
          <CardDescription>
            Enable notifications to stay updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleEnableNotifications}
            disabled={isEnabling}
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isEnabling ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-warning" />
          <CardTitle className="text-base">Push Notifications</CardTitle>
        </div>
        <CardDescription>
          Stay updated with real-time alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Required</AlertTitle>
          <AlertDescription>
            CasaZero needs your permission to send push notifications about:
          </AlertDescription>
        </Alert>

        <ul className="space-y-2 text-sm text-neutral-ink-700">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            New documents uploaded
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Maintenance task reminders (N2 mandatory tasks)
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Support ticket updates
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Group chat messages
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Building announcements
          </li>
        </ul>

        <div className="bg-surface-warm-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-neutral-ink-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-neutral-ink-700 mb-1">
                <span className="font-medium">Firebase Cloud Messaging (FCM)</span>
              </p>
              <p className="text-xs text-neutral-ink-500">
                Secure, reliable push notifications delivered to your device even when the app is closed.
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleEnableNotifications}
          disabled={isEnabling}
          className="w-full"
        >
          <Bell className="w-4 h-4 mr-2" />
          {isEnabling ? 'Registering Device...' : 'Enable Push Notifications'}
        </Button>

        <p className="text-xs text-neutral-ink-500 text-center">
          You can manage notification preferences in your profile settings
        </p>
      </CardContent>
    </Card>
  );
}
