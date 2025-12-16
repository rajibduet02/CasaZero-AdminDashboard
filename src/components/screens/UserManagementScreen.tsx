import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Search, UserPlus, Mail, MoreVertical, Shield, Trash2, Info, Edit, Bell, FileText, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { type Role, getPermissions, getRoleLabel } from '../../utils/permissions';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';

interface UserManagementScreenProps {
  role: Role;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  residence?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  phone?: string;
}

export function UserManagementScreen({ role }: UserManagementScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Invite dialog state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [inviteUnit, setInviteUnit] = useState('');
  
  // Edit user dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('client');
  const [editUnit, setEditUnit] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  
  // Send notification dialog state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationUser, setNotificationUser] = useState<User | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Send document dialog state
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [documentUser, setDocumentUser] = useState<User | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  
  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const mockUsers: User[] = [
    {
      id: '1',
      firstName: 'Marco',
      lastName: 'Rossi',
      email: 'marco.rossi@example.com',
      role: 'client',
      residence: 'Unit 4B',
      status: 'active',
      joinedDate: 'Mar 2024',
      phone: '+39 320 123 4567',
    },
    {
      id: '2',
      firstName: 'Sofia',
      lastName: 'Bianchi',
      email: 'sofia.bianchi@example.com',
      role: 'client',
      residence: 'Unit 3A',
      status: 'active',
      joinedDate: 'Apr 2024',
      phone: '+39 331 987 6543',
    },
    {
      id: '3',
      firstName: 'Giovanni',
      lastName: 'Conti',
      email: 'giovanni.conti@example.com',
      role: 'admin',
      residence: 'Building A',
      status: 'active',
      joinedDate: 'Jan 2024',
      phone: '+39 340 555 1234',
    },
    {
      id: '4',
      firstName: 'Elena',
      lastName: 'Romano',
      email: 'elena.romano@example.com',
      role: 'client',
      residence: 'Unit 2C',
      status: 'pending',
      joinedDate: 'Oct 2024',
      phone: '+39 349 876 5432',
    },
  ];

  const [users, setUsers] = useState(mockUsers);

  const filteredUsers = users.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteUser = () => {
    console.log('Inviting user:', { email: inviteEmail, role: inviteRole, unit: inviteUnit });
    toast.success('Invitation sent successfully', {
      description: `An invitation email has been sent to ${inviteEmail}`,
    });
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteRole('client');
    setInviteUnit('');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditUnit(user.residence || '');
    setEditPhone(user.phone || '');
    setEditStatus(user.status);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? {
              ...u,
              firstName: editFirstName,
              lastName: editLastName,
              email: editEmail,
              role: editRole,
              residence: editUnit,
              phone: editPhone,
              status: editStatus,
            }
          : u
      ));
      toast.success('User updated successfully', {
        description: `${editFirstName} ${editLastName}'s information has been updated`,
      });
      setIsEditOpen(false);
    }
  };

  const handleSendNotification = (user: User) => {
    setNotificationUser(user);
    setNotificationTitle('');
    setNotificationMessage('');
    setIsNotificationOpen(true);
  };

  const handleSendNotificationSubmit = () => {
    console.log('Sending notification to:', notificationUser, {
      title: notificationTitle,
      message: notificationMessage,
    });
    toast.success('Notification sent', {
      description: `Push notification sent to ${notificationUser?.firstName} ${notificationUser?.lastName}`,
    });
    setIsNotificationOpen(false);
  };

  const handleSendDocument = (user: User) => {
    setDocumentUser(user);
    setDocumentTitle('');
    setDocumentDescription('');
    setIsDocumentOpen(true);
  };

  const handleSendDocumentSubmit = () => {
    console.log('Sending document to:', documentUser, {
      title: documentTitle,
      description: documentDescription,
    });
    toast.success('Document shared', {
      description: `Document sent to ${documentUser?.firstName} ${documentUser?.lastName}`,
    });
    setIsDocumentOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingUser) {
      setUsers(users.filter(u => u.id !== deletingUser.id));
      toast.success('User removed', {
        description: `${deletingUser.firstName} ${deletingUser.lastName} has been removed from the system`,
      });
      setIsDeleteOpen(false);
      setDeletingUser(null);
    }
  };

  if (!permissions.canViewUserList) {
    return (
      <div className="pb-20 bg-gradient-to-b from-white via-brand-sage-50 to-brand-sage-100 min-h-screen">
        <div className="px-4 py-6 max-w-md mx-auto">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access user management.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-white min-h-screen">
      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl mb-1">User Management</h2>
            <p className="text-sm text-neutral-ink-500">
              {role === 'super-admin' ? 'Manage all users across buildings' : 'Manage residents in your building'}
            </p>
          </div>
          {permissions.canInviteResidents && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join CasaZero
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Resident</SelectItem>
                        {permissions.canManageAdmins && (
                          <>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="super-admin">Super Admin</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteRole === 'client' && (
                    <div className="space-y-2">
                      <Label htmlFor="unit">Residence Unit</Label>
                      <Select value={inviteUnit} onValueChange={setInviteUnit}>
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1A">Unit 1A</SelectItem>
                          <SelectItem value="2B">Unit 2B</SelectItem>
                          <SelectItem value="3C">Unit 3C</SelectItem>
                          <SelectItem value="4B">Unit 4B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteUser}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-ink-500" />
          <Input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Admin View Notice */}
        {role === 'super-admin' && (
          <Alert className="bg-neutral-ink-900 text-white border-neutral-ink-800">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Super Admin View:</span> Managing users across all buildings
            </AlertDescription>
          </Alert>
        )}

        {/* User List */}
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-brand-sage-500 text-white">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-xs text-neutral-ink-500">{user.email}</p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.canEditUsers && (
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                          )}
                          
                          {permissions.canSendNotifications && (
                            <DropdownMenuItem onClick={() => handleSendNotification(user)}>
                              <Bell className="w-4 h-4 mr-2" />
                              Send Notification
                            </DropdownMenuItem>
                          )}
                          
                          {permissions.canUploadDocuments && (
                            <DropdownMenuItem onClick={() => handleSendDocument(user)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Send Document
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {permissions.canRemoveResidents && (
                            <DropdownMenuItem 
                              className="text-danger"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          user.role === 'super-admin'
                            ? 'bg-neutral-ink-900 text-white'
                            : user.role === 'admin'
                            ? 'bg-brand-sage-600 text-white'
                            : 'bg-info text-white'
                        }
                      >
                        {getRoleLabel(user.role)}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className={
                          user.status === 'active'
                            ? 'bg-success/10 text-success'
                            : user.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-neutral-ink-200 text-neutral-ink-700'
                        }
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>

                      {user.residence && (
                        <span className="text-xs text-neutral-ink-500">{user.residence}</span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-ink-400 mt-2">Joined {user.joinedDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-ink-500">No users found</p>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+39 320 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Resident</SelectItem>
                  {permissions.canManageAdmins && (
                    <>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="super-admin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as 'active' | 'pending' | 'inactive')}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editRole === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Residence Unit</Label>
                <Select value={editUnit} onValueChange={setEditUnit}>
                  <SelectTrigger id="edit-unit">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1A">Unit 1A</SelectItem>
                    <SelectItem value="2B">Unit 2B</SelectItem>
                    <SelectItem value="3A">Unit 3A</SelectItem>
                    <SelectItem value="2C">Unit 2C</SelectItem>
                    <SelectItem value="3C">Unit 3C</SelectItem>
                    <SelectItem value="4B">Unit 4B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Push Notification</DialogTitle>
            <DialogDescription>
              Send a push notification to {notificationUser?.firstName} {notificationUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-title">Notification Title</Label>
              <Input
                id="notification-title"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Important Update"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotificationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotificationSubmit}>
              <Bell className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Document Dialog */}
      <Dialog open={isDocumentOpen} onOpenChange={setIsDocumentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Document</DialogTitle>
            <DialogDescription>
              Share a document with {documentUser?.firstName} {documentUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-title">Document Title</Label>
              <Input
                id="document-title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Building Regulations"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder="Brief description of the document..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-file">Upload File</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-neutral-ink-500">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendDocumentSubmit}>
              <FileText className="w-4 h-4 mr-2" />
              Send Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingUser?.firstName} {deletingUser?.lastName} from the system? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-danger text-white hover:bg-danger/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
