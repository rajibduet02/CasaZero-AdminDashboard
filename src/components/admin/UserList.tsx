import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Filter,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  role: 'client' | 'admin';
  residence_names: string[];
  status: 'active' | 'inactive';
  user_status: number;
  lastActive: string;
  last_active: string;
}

interface UserListProps {
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  refreshKey?: number;
}

export function UserList({ onCreateUser, onEditUser, refreshKey }: UserListProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Function to get user initials
  const getUserInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle image loading error
  const handleImageError = (userId: string) => {
    console.log('Image failed to load for user:', userId);
    setFailedImages(prev => new Set(prev).add(userId));
  };

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, [refreshKey]);

  const fetchUsers = async () => {
    console.log('=== USER LIST FETCH STARTED ===');
    console.log('Refresh Key:', refreshKey);
    
    setLoading(true);
    try {
      const apiUrl = 'https://smarthome.attoexasolutions.com/api/user/get';
      console.log('Fetching from URL:', apiUrl);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [USERS] Auth token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);
      
      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response Data:', data);
      console.log('Response Data (JSON):', JSON.stringify(data, null, 2));

      if (data.status && data.data) {
        console.log('✅ Successfully fetched', data.data.length, 'users');
        
        // Map API response to our User interface
        const mappedUsers: User[] = data.data.map((apiUser: any) => {
          console.log('Mapping user:', apiUser.name, '- Role from API:', apiUser.role);
          
          return {
            id: String(apiUser.id),
            name: apiUser.name,
            email: apiUser.email,
            phone: apiUser.phone,
            profile_image: apiUser.profile_image,
            role: apiUser.role || 'client', // Map role from API response
            residence_names: apiUser.residence_names || [],
            status: apiUser.user_status === 1 ? 'active' : 'inactive',
            user_status: apiUser.user_status,
            lastActive: apiUser.last_active === 'null' || !apiUser.last_active ? 'Never' : apiUser.last_active,
            last_active: apiUser.last_active,
          };
        });

        console.log('Mapped Users:', mappedUsers);
        setUsers(mappedUsers);
        
        toast.success(t('success') || 'Success', {
          description: data.message || t('usersLoadedSuccessfully') || 'Users loaded successfully',
        });
      } else {
        console.error('❌ API Error: status is false or data is missing');
        console.error('Data:', data);
        
        toast.error(t('error') || 'Error', {
          description: data.message || t('failedToLoadUsers') || 'Failed to load users',
        });
      }
    } catch (error) {
      console.error('=== EXCEPTION CAUGHT ===');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full Error Object:', error);
      
      if (error instanceof TypeError) {
        console.error('Network Error Details:');
        console.error('- This might be a CORS issue');
        console.error('- Or the server might be unreachable');
        console.error('- Check network tab for more details');
      }
      
      toast.error(t('error') || 'Error', {
        description: t('networkError') || 'Failed to load users. Please try again.',
      });
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
      console.log('=== USER LIST FETCH ENDED ===');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    console.log('=== USER DELETE STARTED ===');
    console.log('User ID to delete:', userId);
    
    setDeletingUser(true);

    try {
      const apiUrl = `https://smarthome.attoexasolutions.com/api/user/delete/${userId}`;
      
      console.log('=== API REQUEST (Delete User) ===');
      console.log('URL:', apiUrl);
      console.log('Method:', 'GET');

      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      console.log('=== API RESPONSE (Delete User) ===');
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('Response Data:', data);
      console.log('Response Data (JSON):', JSON.stringify(data, null, 2));

      if (data.status) {
        console.log('✅ SUCCESS: User deleted successfully');
        console.log('Deleted User:', data.user);

        // Remove user from the list
        setUsers(users.filter(user => user.id !== userId));
        setDeleteUserId(null);
        
        toast.success(t('deleteSuccess') || 'Success!', {
          description: data.message || t('userDeleted') || 'User deleted successfully',
        });
        
        console.log('=== USER DELETE COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('❌ API ERROR: Delete failed');
        console.error('Error Message:', data.message);
        console.error('Full Error Response:', data);
        
        toast.error(t('error') || 'Error', {
          description: data.message || t('failedToDeleteUser') || 'Failed to delete user',
        });
      }
    } catch (error) {
      console.error('=== EXCEPTION CAUGHT (Delete User) ===');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full Error Object:', error);
      
      if (error instanceof TypeError) {
        console.error('Network Error Details:');
        console.error('- This might be a CORS issue');
        console.error('- Or the server might be unreachable');
        console.error('- Check network tab for more details');
      }
      
      toast.error(t('error') || 'Error', {
        description: t('networkError') || 'Failed to delete user. Please try again.',
      });
    } finally {
      setDeletingUser(false);
      console.log('Deleting user state set to false');
      console.log('=== USER DELETE PROCESS ENDED ===');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.residence_names.some(residence => residence.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalUsers = users.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-neutral-ink-900 mb-2">{t('userManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageUserAccounts')}</p>
        </div>

        <Button
          onClick={onCreateUser}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addUser')}
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalUsers}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalUsers')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488]">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{activeUsers}</p>
              <p className="text-sm text-neutral-ink-500">{t('activeUsers')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#FFB020] to-[#F59E0B]">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalUsers - activeUsers}</p>
              <p className="text-sm text-neutral-ink-500">{t('inactiveUsers')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-48 rounded-xl border-neutral-line-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRoles')}</SelectItem>
                <SelectItem value="client">{t('resident')}</SelectItem>
                <SelectItem value="admin">{t('administrator')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 rounded-xl border-neutral-line-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingUsers') || 'Loading users...'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('name')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('email')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('role')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('building')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200" style={{ minHeight: '200px' }}>
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {user.profile_image && !failedImages.has(user.id) ? (
                              <img
                                src={user.profile_image}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-neutral-line-200"
                                onError={() => handleImageError(user.id)}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white ${user.profile_image && !failedImages.has(user.id) ? 'hidden' : ''}`}>
                              {getUserInitials(user.name)}
                            </div>
                            <span className="text-sm text-neutral-ink-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs ${
                            user.role === 'admin'
                              ? 'bg-[#6A8F7B]/10 text-[#6A8F7B]'
                              : 'bg-[#14B8A6]/10 text-[#14B8A6]'
                          }`}>
                            {user.role === 'admin' ? t('administrator') : t('resident')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          {user.residence_names.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs ${
                            user.status === 'active'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {user.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {user.status === 'active' ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-line-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              side="left"
                              align="start"
                              sideOffset={8}
                              alignOffset={0}
                              collisionPadding={12}
                              avoidCollisions
                              className="w-48 rounded-xl"
                            >
                              <DropdownMenuItem
                                onClick={() => onEditUser(user)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteUserId(user.id)}
                                className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Empty State */}
              {filteredUsers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-neutral-ink-500">{t('noUsersFound')}</p>
                </motion.div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteUserConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deletingUser}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}