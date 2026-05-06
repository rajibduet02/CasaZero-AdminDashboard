import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { User, Mail, Phone, MapPin, Edit, Shield, Bell, Globe, Lock, Smartphone, LogOut, ChevronRight, Building, Users, Settings, Languages } from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { PushNotificationSettings } from '../casazero/PushNotificationSettings';
import { useLanguage } from '../../utils/LanguageContext';
import { clearFirstLoginFlags, clearSession } from '../../utils/session';

interface ProfileScreenProps {
  role: Role;
  onLogout: () => void;
  onNavigate?: (screen: string) => void;
}

export function ProfileScreen({ role, onLogout, onNavigate }: ProfileScreenProps) {
  const permissions = getPermissions(role);
  const { language, setLanguage, t } = useLanguage();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    documents: true,
    maintenance: true,
    chat: true,
    tickets: true,
  });

  const userProfile = {
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco.rossi@example.com',
    phone: '+39 345 123 4567',
    residence: 'Building A, Unit 4B',
    address: 'Via Giuseppe Verdi 42, 20121 Milano MI',
    memberSince: 'March 2024',
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: t('administrator'), color: 'bg-brand-sage-600' };
      case 'super-admin':
        return { label: t('superAdmin'), color: 'bg-neutral-ink-900' };
      default:
        return { label: t('resident'), color: 'bg-info' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="pb-20 bg-white min-h-screen">
      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-brand-sage-500 text-white text-xl">
                  {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl mb-1">
                  {userProfile.firstName} {userProfile.lastName}
                </h2>
                <Badge className={`${roleBadge.color} text-white mb-2`}>
                  {roleBadge.label}
                </Badge>
                <p className="text-sm text-neutral-ink-500">
                  {t('memberSince')} {userProfile.memberSince}
                </p>
              </div>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-8 px-3 hover:bg-accent hover:text-accent-foreground">
                    <Edit className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('editProfile')}</DialogTitle>
                    <DialogDescription>{t('updatePersonalInfo')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('firstName')}</Label>
                      <Input id="firstName" defaultValue={userProfile.firstName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('lastName')}</Label>
                      <Input id="lastName" defaultValue={userProfile.lastName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phoneNumber')}</Label>
                      <Input id="phone" defaultValue={userProfile.phone} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={() => setIsEditOpen(false)}>{t('saveChanges')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-4 border-t border-neutral-line-200">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-neutral-ink-700">{userProfile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-neutral-ink-700">{userProfile.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Residence Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('residence')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-neutral-ink-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-ink-900 mb-0.5">{userProfile.residence}</p>
                <p className="text-sm text-neutral-ink-500">{userProfile.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('security')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              onClick={() => onNavigate('change-password')}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-sm text-neutral-ink-900">{t('changePassword')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-ink-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-sm text-neutral-ink-900">{t('twoFactorAuth')}</span>
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success">{t('active')}</Badge>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-sm text-neutral-ink-900">{t('trustedDevices')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-ink-400" />
            </button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('notificationPreferences')}</CardTitle>
            <CardDescription>{t('managePushSettings')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-neutral-ink-500" />
                <Label htmlFor="notif-documents" className="cursor-pointer">{t('documents')}</Label>
              </div>
              <Switch
                id="notif-documents"
                checked={notifications.documents}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, documents: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-neutral-ink-500" />
                <Label htmlFor="notif-maintenance" className="cursor-pointer">{t('maintenance')}</Label>
              </div>
              <Switch
                id="notif-maintenance"
                checked={notifications.maintenance}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, maintenance: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-neutral-ink-500" />
                <Label htmlFor="notif-chat" className="cursor-pointer">{t('chatMessages')}</Label>
              </div>
              <Switch
                id="notif-chat"
                checked={notifications.chat}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, chat: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-neutral-ink-500" />
                <Label htmlFor="notif-tickets" className="cursor-pointer">{t('supportTickets')}</Label>
              </div>
              <Switch
                id="notif-tickets"
                checked={notifications.tickets}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, tickets: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin/Super-Admin Settings */}
        {(permissions.canManageAdmins || permissions.canManageBuildings) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('adminSettings')}</CardTitle>
              <CardDescription>{t('managementOptions')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissions.canManageBuildings && (
                <button 
                  onClick={() => onNavigate?.('buildings')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-neutral-ink-500" />
                    <span className="text-sm text-neutral-ink-900">{t('buildingManagement')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-ink-400" />
                </button>
              )}

              {permissions.canViewUserList && (
                <button 
                  onClick={() => onNavigate?.('users')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-neutral-ink-500" />
                    <span className="text-sm text-neutral-ink-900">{t('userManagement')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-ink-400" />
                </button>
              )}

              {permissions.canManageAdmins && (
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-warm-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-neutral-ink-500" />
                    <span className="text-sm text-neutral-ink-900">{t('systemConfiguration')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-ink-400" />
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-warm-50">
              <div className="flex items-center gap-3">
                <Languages className="w-4 h-4 text-neutral-ink-500" />
                <span className="text-sm text-neutral-ink-900">{t('language')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 border border-neutral-line-200">
                <button
                  onClick={() => setLanguage('it')}
                  className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
                    language === 'it'
                      ? 'bg-brand-sage-600 text-white shadow-md'
                      : 'text-neutral-ink-600 hover:text-brand-sage-600'
                  }`}
                >
                  IT
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
                    language === 'en'
                      ? 'bg-brand-sage-600 text-white shadow-md'
                      : 'text-neutral-ink-600 hover:text-brand-sage-600'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
            
            {/* Demo: Reset First Login */}
            <button 
              onClick={() => {
                clearSession();
                clearFirstLoginFlags();
                window.location.reload();
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-warning/10 transition-colors text-left border border-warning/20"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-warning" />
                <span className="text-sm text-warning">{t('resetFirstLogin')}</span>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-danger text-danger hover:bg-danger/10">
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmLogout')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('logoutMessage')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onLogout} className="bg-danger hover:bg-danger/90">
                {t('logout')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="text-center text-xs text-neutral-ink-400 pt-4">
          CasaZero v1.0.0
        </div>
      </div>
    </div>
  );
}
