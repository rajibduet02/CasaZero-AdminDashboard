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
import { Label } from '../ui/label';
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
import { API_BASE } from '../../utils/api';

type UserRole = 'resident' | 'admin' | 'super_admin';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  role: UserRole;
  /** Role text exactly as returned by the API (shown in the ROLE column). */
  role_label: string;
  /** Flat list for search — derived from API `residences` or `residence_names` */
  residence_names: string[];
  status: 'active' | 'inactive';
  user_status: number;
  lastActive: string;
  last_active: string | null;
  units?: { unit_id: number; unit_name?: string; name?: string }[];
  unit_id?: number | null;
  unit_name?: string | null;
  residences?: { residence_id: number; residence_name: string }[];
}

function isActiveStatus(userStatus: unknown): boolean {
  return userStatus === 1 || userStatus === '1' || userStatus === true;
}

/**
 * Flatten `role` when the API returns a string/number or an object
 * like `{ slug, label }` / `{ name, title }`.
 */
function getRoleFromApiUser(apiUser: { role?: unknown }): {
  mappingKey: unknown;
  label: string;
} {
  const r = apiUser?.role;
  if (r != null && typeof r === 'object' && !Array.isArray(r)) {
    const o = r as Record<string, unknown>;
    const mappingKey = o.slug ?? o.name ?? o.value ?? o.role ?? null;
    const labelRaw =
      o.label ?? o.title ?? o.display_name ?? o.name ?? mappingKey ?? '';
    const label = labelRaw !== null && labelRaw !== undefined ? String(labelRaw).trim() : '';
    return { mappingKey: mappingKey ?? r, label };
  }
  if (r === null || r === undefined) return { mappingKey: null, label: '' };
  return { mappingKey: r, label: String(r).trim() };
}

/** Normalize backend role strings for comparison (spaces, hyphens, casing). */
function normalizeRoleKey(role: unknown): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Map API role to a canonical value for filters / UserForm.
 * Handles Laravel-style slugs and human-readable labels from GET /user/get.
 */
function mapApiRole(role: unknown): UserRole {
  if (role != null && typeof role === 'object' && !Array.isArray(role)) {
    return 'resident';
  }
  const r = normalizeRoleKey(role ?? '');
  if (r === 'client') return 'resident';
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'resident') return 'resident';
  // Human-readable or alternate API spellings
  if (r === 'super_administrator' || r === 'superadministrator') return 'super_admin';
  if (r === 'administrator') return 'admin';
  return 'resident';
}

type ResidenceRow = { residence_id: number; residence_name: string };

/**
 * GET /user/get often returns `residences: []` for admins with no unit, while the
 * user row still has `residence_id` / `residence` / `residence_name`. Normalize so
 * the table can show and search by building.
 */
function normalizeResidencesFromApiUser(apiUser: any): {
  residences: ResidenceRow[];
  namesFromResidences: string[];
} {
  let residences: ResidenceRow[] = [];
  if (Array.isArray(apiUser.residences) && apiUser.residences.length > 0) {
    residences = apiUser.residences
      .map((r: any) => {
        const residence_id = Number(r.residence_id ?? r.id);
        const label = String(r.residence_name ?? r.name ?? '').trim();
        return {
          residence_id,
          residence_name:
            label || (Number.isNaN(residence_id) ? '' : `Residence ${residence_id}`),
        };
      })
      .filter((r: ResidenceRow) => !Number.isNaN(r.residence_id));
  }

  if (residences.length === 0) {
    const resObj = apiUser.residence;
    const rid =
      apiUser.residence_id ??
      (resObj && typeof resObj === 'object' && !Array.isArray(resObj)
        ? resObj.id ?? resObj.residence_id
        : undefined);
    if (rid != null && String(rid).trim() !== '') {
      const residence_id = Number(rid);
      if (!Number.isNaN(residence_id)) {
        const rname =
          apiUser.residence_name ??
          (resObj && typeof resObj === 'object'
            ? resObj.residence_name ?? resObj.name
            : undefined);
        residences = [
          {
            residence_id,
            residence_name: String(rname ?? '').trim() || `Residence ${residence_id}`,
          },
        ];
      }
    }
  }

  const namesFromResidences = residences.map((r) => r.residence_name).filter(Boolean);
  return { residences, namesFromResidences };
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
    const trimmed = name.trim();
    if (!trimmed || trimmed === '—') return '?';
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words[0][0] && words[1][0]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
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
      const apiUrl = `${API_BASE}/user/get`;
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

        // Map API response to table row model (GET /user/get shape)
        const mappedUsers: User[] = data.data.map((apiUser: any) => {
          const units = Array.isArray(apiUser.units) ? apiUser.units : [];
          const unitLabels = units
            .map((u: { unit_name?: string; name?: string }) => u.unit_name || u.name)
            .filter(Boolean);
          const unitName = unitLabels.length > 0 ? unitLabels.join(', ') : null;
          const firstUnit = units[0];
          const unitId =
            firstUnit != null && firstUnit.unit_id != null ? Number(firstUnit.unit_id) : null;

          const { residences, namesFromResidences } = normalizeResidencesFromApiUser(apiUser);
          const rawApiResidenceNames = Array.isArray(apiUser.residence_names)
            ? apiUser.residence_names.filter(Boolean)
            : [];
          const residence_names =
            rawApiResidenceNames.length > 0 ? rawApiResidenceNames : namesFromResidences;

          const lastRaw = apiUser.last_active;
          const lastActive =
            lastRaw === null ||
            lastRaw === undefined ||
            lastRaw === '' ||
            String(lastRaw).toLowerCase() === 'null'
              ? 'Never'
              : String(lastRaw);

          const { mappingKey, label: roleLabelFromApi } = getRoleFromApiUser(apiUser);

          return {
            id: String(apiUser.id ?? ''),
            name: String(apiUser.name ?? apiUser.user_name ?? '').trim() || '—',
            email: String(apiUser.email ?? '').trim(),
            phone: apiUser.phone != null ? String(apiUser.phone) : undefined,
            profile_image: apiUser.profile_image ?? undefined,
            role: mapApiRole(mappingKey),
            role_label: roleLabelFromApi,
            residence_names,
            status: isActiveStatus(apiUser.user_status) ? 'active' : 'inactive',
            user_status: Number(apiUser.user_status) === 1 ? 1 : 0,
            lastActive,
            last_active: apiUser.last_active ?? null,
            units,
            unit_id: unitId,
            unit_name: unitName,
            residences,
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
      const apiUrl = `${API_BASE}/user/delete/${userId}`;
      
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
    const q = searchQuery.toLowerCase().trim();
    const resLabel =
      user.residences?.map(r => r.residence_name).filter(Boolean).join(' ') ?? '';
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.phone && user.phone.toLowerCase().includes(q)) ||
      (user.unit_name && user.unit_name.toLowerCase().includes(q)) ||
      resLabel.toLowerCase().includes(q) ||
      user.residence_names.some(r => r.toLowerCase().includes(q)) ||
      (user.role_label && user.role_label.toLowerCase().includes(q));
    
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

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="p-4 rounded-lg border border-neutral-line-200 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="search-filter" className="text-xs text-neutral-ink-600">
              {t('search')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-ink-400" />
              <Input
                id="search-filter"
                type="text"
                placeholder={t('searchUsers') || 'Search users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 rounded-lg border-neutral-line-200 bg-white focus:border-[#6A8F7B] transition-all duration-200"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="p-4 rounded-lg border border-neutral-line-200 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl border-neutral-line-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRoles')}</SelectItem>
                <SelectItem value="resident">{t('resident')}</SelectItem>
                <SelectItem value="admin">{t('administrator')}</SelectItem>
                <SelectItem value="super_admin">{t('superAdmin')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl border-neutral-line-200">
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
            <>
              {filteredUsers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-neutral-ink-600">{t('noUsersFound')}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                        <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                              {t('name')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                              {t('phone') || 'Phone'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                              {t('unit') || 'Unit'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                              {t('residence') || 'Residence'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                              {t('role')}
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
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white text-sm">
                                        {getUserInitials(user.name)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm text-neutral-ink-900">{user.name}</p>
                                      {user.email && (
                                        <p className="text-xs text-neutral-ink-500 truncate max-w-xs">
                                          {user.email}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600 max-w-[140px] truncate" title={user.phone}>
                                  {user.phone?.trim() ? user.phone : '—'}
                                </td>
                                <td className="px-6 py-4 text-sm text-neutral-ink-600 max-w-[200px]">
                                  <span className="line-clamp-2" title={user.unit_name ?? undefined}>
                                    {user.unit_name?.trim() ? user.unit_name : '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-neutral-ink-600 max-w-[220px]">
                                  <span
                                    className="line-clamp-2"
                                    title={
                                      user.residences?.length
                                        ? user.residences.map((r) => r.residence_name).filter(Boolean).join(', ')
                                        : undefined
                                    }
                                  >
                                    {user.residences?.length
                                      ? user.residences.map((r) => r.residence_name).filter(Boolean).join(', ')
                                      : '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                                  <span
                                    className={`inline-flex px-3 py-1 rounded-lg text-xs ${
                                      user.role === 'admin'
                                        ? 'bg-[#6A8F7B]/10 text-[#6A8F7B]'
                                        : user.role === 'super_admin'
                                          ? 'bg-violet-100 text-violet-800'
                                          : 'bg-[#14B8A6]/10 text-[#14B8A6]'
                                    }`}
                                    title={user.role_label || undefined}
                                  >
                                    {user.role_label ||
                                      (user.role === 'admin'
                                        ? t('administrator')
                                        : user.role === 'super_admin'
                                          ? t('superAdmin')
                                          : t('resident'))}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
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
                </div>
              )}
            </>
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