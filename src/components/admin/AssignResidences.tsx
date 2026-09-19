import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Building2,
  UserPlus,
  Home,
  Search,
  Users,
  X,
  Check,
  ArrowRight,
  Loader2,
  User as UserIcon,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { API_BASE, fetchResidencesCatalog, apiFetch, isAbortError } from '../../utils/api';
import { useLanguage } from '../../utils/LanguageContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

type AssignmentMode = 'users-to-building' | 'buildings-to-user';

interface User {
  id: number;
  user_name: string;
  email: string;
  role: string;
  profile_image?: string;
}

interface Building {
  id: number;
  residence_name: string;
  residence_address: string | null;
  residence_type: 'Condominium' | 'Apartment' | 'House';
  residence_status: string;
  residence_photo: string | null;
  residence_admin: number | null;
  created_at: string;
  updated_at: string;
}

interface Unit {
  id: number;
  name: string;
}

interface Assignment {
  userId: number;
  buildingId: number;
  userName: string;
  buildingName: string;
}

export function AssignResidences() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AssignmentMode>('users-to-building');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Load users from API
  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      setLoadingUsers(true);
      
      try {
        const requestBody = { role: 'residence' };
        
        console.log('📤 [REQUEST] Headers:', {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        });
        
        const response = await apiFetch(`${API_BASE}/get_users_by_role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });


        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status && result.data) {
          setUsers(result.data);
        } else {
          console.error('❌ Failed to load users:', result);
          toast.error(t('error'), {
            description: result.message || t('failedToLoadUsers'),
          });
          // Set empty array as fallback
          setUsers([]);
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        console.error('❌ Error fetching users:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : 'No stack trace',
        });
        
        toast.error(t('error'), {
          description: t('failedToLoadUsersConnection'),
        });
        
        // Set empty array as fallback
        setUsers([]);
      } finally {
        if (!controller.signal.aborted) setLoadingUsers(false);
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [t]);

  // Load buildings from API
  useEffect(() => {
    let cancelled = false;
    const fetchBuildings = async () => {

      let response: Response;
      try {
        response = await fetchResidencesCatalog();
      } catch (e) {
        if (cancelled || isAbortError(e)) return;
        console.error('❌ [BUILDINGS] Network error:', e);
        setBuildings([]);
        toast.error(t('error') || 'Error', {
          description: t('failedToLoad') || 'Failed to load residences.',
        });
        return;
      }
      if (cancelled) return;


      if (!response.ok) {
        console.error('❌ [BUILDINGS] HTTP error:', response.status);
        setBuildings([]);
        toast.error(t('error') || 'Error', {
          description: t('failedToLoad') || 'Failed to load residences.',
        });
        return;
      }

      const result = await response.json();
      if (cancelled) return;

      if (result.status && result.data) {
        setBuildings(result.data);
      } else {
        console.error('❌ Failed to load buildings:', result);
        toast.error(t('error'), {
          description: result.message || t('failedToLoad'),
        });
        // Set empty array as fallback
        setBuildings([]);
      }
    };

    void fetchBuildings();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Load units based on selected residence
  useEffect(() => {
    if (!selectedBuildingId) {
      setUnits([]);
      setSelectedUnitId(null);
      return;
    }

    const controller = new AbortController();
    const fetchUnits = async () => {
      setLoadingUnits(true);
      
      try {
        const requestBody = { residence_id: selectedBuildingId };
        
        
        // Get auth token from localStorage
        const token = localStorage.getItem('casazero_token');
        
        const response = await apiFetch(`${API_BASE}/unit_by_residence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status && result.data) {
          setUnits(result.data);
        } else {
          console.error('❌ [UNITS] Failed to load units:', result);
          setUnits([]);
          toast.error(t('error') || 'Error', {
            description: result.message || t('failedToLoadUnitsForResidence') || 'Failed to load units.',
          });
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        console.error('❌ [UNITS] Error fetching units:', error);
        setUnits([]);
        toast.error(t('error') || 'Error', {
          description: t('failedToLoadUnitsForResidence') || 'Failed to load units.',
        });
      } finally {
        if (!controller.signal.aborted) setLoadingUnits(false);
      }
    };

    void fetchUnits();
    return () => controller.abort();
  }, [selectedBuildingId, t]);

  // Mock assignments (userId -> buildingId relationships)
  const [assignments, setAssignments] = useState<Assignment[]>([
    { userId: 3, buildingId: 1, userName: 'Luca Moretti', buildingName: 'Green Valley Condominium' },
    { userId: 4, buildingId: 1, userName: 'Giulia Romano', buildingName: 'Green Valley Condominium' },
    { userId: 5, buildingId: 2, userName: 'Alessandro Costa', buildingName: 'Sunset Apartments' },
    { userId: 3, buildingId: 3, userName: 'Luca Moretti', buildingName: 'Villa Serena' },
    { userId: 6, buildingId: 4, userName: 'Francesca Ricci', buildingName: 'Lake View Residence' },
  ]);

  // Get users assigned to selected building
  const getAssignedUsers = (buildingId: number) => {
    return assignments
      .filter(a => a.buildingId === buildingId)
      .map(a => users.find(u => u.id === a.userId))
      .filter(Boolean) as User[];
  };

  // Get buildings assigned to selected user
  const getAssignedBuildings = (userId: number) => {
    return assignments
      .filter(a => a.userId === userId)
      .map(a => buildings.find(r => r.id === a.buildingId))
      .filter(Boolean) as Building[];
  };

  // Check if user is assigned to building
  const isAssigned = (userId: number, buildingId: number) => {
    return assignments.some(a => a.userId === userId && a.buildingId === buildingId);
  };

  // Toggle user selection
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Toggle building selection
  const toggleBuildingSelection = (buildingId: number) => {
    setSelectedBuildingIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buildingId)) {
        newSet.delete(buildingId);
      } else {
        newSet.add(buildingId);
      }
      return newSet;
    });
  };

  // Assign users to building
  const handleAssignUsersToBuilding = async () => {
    if (!selectedBuildingId || !selectedUnitId || selectedUserIds.size === 0) {
      toast.error(t('error'), {
        description: t('pleaseSelectResidenceUnitUser'),
      });
      return;
    }


    setLoading(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');

      const requestBody = {
        unit_id: selectedUnitId,
        user_ids: Array.from(selectedUserIds),
      };


      const response = await apiFetch(`${API_BASE}/tag_user_to_unit/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });


      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        console.error('❌ [ASSIGN] HTTP Error Response');
        console.error('❌ [ASSIGN] Status Code:', response.status);
        
        const responseText = await response.text();
        console.error('❌ [ASSIGN] Response Body:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [ASSIGN] Server returned HTML instead of JSON');
          throw new Error(`Server error: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [ASSIGN] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();

      if (result.status) {

        const unit = units.find(u => u.id === selectedUnitId);
        const building = buildings.find(b => b.id === selectedBuildingId);

        toast.success(t('successExclaim'), {
          description:
            result.message ||
            t('usersAssignedToUnitSuccess')
              .replace('{count}', String(selectedUserIds.size))
              .replace('{unit}', unit?.name || '')
              .replace('{building}', building?.residence_name || ''),
        });

        // Update local assignments for UI display
        const newAssignments: Assignment[] = [];
        selectedUserIds.forEach(userId => {
          const user = users.find(u => u.id === userId);
          if (user && building) {
            newAssignments.push({
              userId,
              buildingId: selectedBuildingId,
              userName: user.user_name,
              buildingName: building.residence_name,
            });
          }
        });
        setAssignments(prev => [...prev, ...newAssignments]);

        // Clear selections
        setSelectedUserIds(new Set());
      } else {
        console.error('❌ [ASSIGN] Assignment failed - API returned status: false');
        console.error('❌ [ASSIGN] Result:', result);
        toast.error(t('error'), {
          description: result.message || t('failedToAssignUsers'),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [ASSIGN] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [ASSIGN] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToAssignUsersRetry'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Assign buildings to user
  const handleAssignBuildingsToUser = async () => {
    if (!selectedUserId || selectedBuildingIds.size === 0) {
      toast.error(t('error'), {
        description: t('pleaseSelectUserAndBuilding'),
      });
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = users.find(u => u.id === selectedUserId);
    const newAssignments: Assignment[] = [];

    selectedBuildingIds.forEach(buildingId => {
      if (!isAssigned(selectedUserId, buildingId)) {
        const building = buildings.find(r => r.id === buildingId);
        if (user && building) {
          newAssignments.push({
            userId: selectedUserId,
            buildingId,
            userName: user.user_name,
            buildingName: building.residence_name,
          });
        }
      }
    });

    setAssignments(prev => [...prev, ...newAssignments]);
    setSelectedBuildingIds(new Set());
    setLoading(false);

    toast.success(t('successExclaim'), {
      description: t('buildingsAssignedSuccess')
        .replace('{count}', String(newAssignments.length))
        .replace('{name}', user?.user_name || ''),
    });
  };

  // Remove assignment
  const handleRemoveAssignment = async (userId: number, buildingId: number) => {
    if (!selectedUnitId) {
      toast.error(t('error'), {
        description: t('pleaseSelectUnitFirst'),
      });
      return;
    }


    setLoading(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');

      const requestBody = {
        user_id: userId,
        unit_id: selectedUnitId,
      };


      const response = await apiFetch(`${API_BASE}/remove_user_from_unit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });


      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        console.error('❌ [REMOVE] HTTP Error Response');
        console.error('❌ [REMOVE] Status Code:', response.status);
        
        const responseText = await response.text();
        console.error('❌ [REMOVE] Response Body:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [REMOVE] Server returned HTML instead of JSON');
          throw new Error(`Server error: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [REMOVE] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();

      if (result.status) {

        const user = users.find(u => u.id === userId);
        const unit = units.find(u => u.id === selectedUnitId);

        toast.success(t('successExclaim'), {
          description: result.message || t('assignmentRemoved'),
        });

        // Remove from local assignments
        setAssignments(prev => prev.filter(a => !(a.userId === userId && a.buildingId === buildingId)));
        
      } else {
        console.error('❌ [REMOVE] Removal failed - API returned status: false');
        console.error('❌ [REMOVE] Result:', result);
        toast.error(t('error'), {
          description: result.message || t('failedToRemoveUserFromUnit'),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [REMOVE] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [REMOVE] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToRemoveUserRetry'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalAssignments = assignments.length;
  const totalUsersWithBuildings = new Set(assignments.map(a => a.userId)).size;
  const totalBuildingsWithUsers = new Set(assignments.map(a => a.buildingId)).size;

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const query = debouncedSearch.toLowerCase();
    return users.filter(
      (user) =>
        user.user_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, debouncedSearch]);

  // Filter buildings based on search
  const filteredBuildings = useMemo(() => {
    if (!debouncedSearch) return buildings;
    const query = debouncedSearch.toLowerCase();
    return buildings.filter(
      (building) =>
        building.residence_name.toLowerCase().includes(query) ||
        (building.residence_address ? building.residence_address.toLowerCase().includes(query) : false)
    );
  }, [buildings, debouncedSearch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-neutral-ink-900 mb-2">{t('assignBuildingAndUnits')}</h1>
            <p className="text-neutral-ink-500">{t('manageAssignments')}</p>
          </div>
        </div>
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
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalAssignments}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalAssignments')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalUsersWithBuildings}</p>
              <p className="text-sm text-neutral-ink-500">{t('usersAssigned')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalBuildingsWithUsers}</p>
              <p className="text-sm text-neutral-ink-500">{t('buildingsOccupied')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {/* Removed Mode Toggle - Only showing Assign Users to Unit */}
      </motion.div>

      {/* Assignment Interface - Only Users to Building */}
      <motion.div
        key="users-to-building"
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Left: Select Residence and Unit */}
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-neutral-ink-900 font-medium">{t('selectBuildingHeading')}</h3>
                <p className="text-sm text-neutral-ink-500">{t('chooseBuilding')}</p>
              </div>
            </div>

            {/* Residence Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-ink-700">{t('residence')}</label>
              <Select
                value={selectedBuildingId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedBuildingId(parseInt(value));
                  setSelectedUnitId(null);
                  setSelectedUserIds(new Set());
                }}
              >
                <SelectTrigger className="rounded-xl border-neutral-line-200">
                  <SelectValue placeholder={t('selectABuilding')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id.toString()} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {building.residence_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Units Selection - Only show when residence is selected */}
            {selectedBuildingId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-neutral-ink-700">{t('units')}</label>
                <Select
                  value={selectedUnitId?.toString() || ''}
                  onValueChange={(value) => {
                    setSelectedUnitId(parseInt(value));
                    setSelectedUserIds(new Set());
                  }}
                  disabled={loadingUnits}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200">
                    <SelectValue placeholder={loadingUnits ? t('loadingUnits') : t('selectAUnit')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {units.length > 0 ? (
                      units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            {unit.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-neutral-ink-400 text-center">
                        {t('noUnitsForResidence')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            {selectedBuildingId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-4 border-t border-neutral-line-200"
              >
                <h4 className="text-sm font-medium text-neutral-ink-700">{t('currentlyAssignedUsers')}</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getAssignedUsers(selectedBuildingId).map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-neutral-line-50 border border-neutral-line-200"
                    >
                      <div className="flex items-center gap-2">
                        {user.profile_image ? (
                          <img
                            src={user.profile_image}
                            alt={user.user_name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-[#6A8F7B]"
                            width={32}
                            height={32}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-neutral-ink-900">{user.user_name}</p>
                          <p className="text-xs text-neutral-ink-500">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(user.id, selectedBuildingId)}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  {getAssignedUsers(selectedBuildingId).length === 0 && (
                    <p className="text-sm text-neutral-ink-400 text-center py-4">
                      {t('noUsersAssigned')}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </Card>

        {/* Right: Select Users */}
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-neutral-ink-900 font-medium">{t('selectUsers')}</h3>
                <p className="text-sm text-neutral-ink-500">
                  {selectedUserIds.size > 0
                    ? t('usersSelectedCount').replace('{count}', String(selectedUserIds.size))
                    : t('chooseUsers')}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user.id);
                const alreadyAssigned = selectedBuildingId ? isAssigned(user.id, selectedBuildingId) : false;
                const canSelect = selectedBuildingId;

                return (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => !alreadyAssigned && canSelect && toggleUserSelection(user.id)}
                    disabled={!canSelect || alreadyAssigned}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#6A8F7B]/10 to-[#5a7a68]/10 border-[#6A8F7B]'
                        : alreadyAssigned
                        ? 'bg-neutral-line-50 border-neutral-line-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-neutral-line-200 hover:border-[#6A8F7B] hover:bg-neutral-line-50'
                    } ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {user.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt={user.user_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#6A8F7B]"
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium text-neutral-ink-900">{user.user_name}</p>
                        <p className="text-xs text-neutral-ink-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alreadyAssigned && (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          {t('assigned')}
                        </Badge>
                      )}
                      {isSelected && !alreadyAssigned && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Assign Button */}
            {selectedUserIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  onClick={handleAssignUsersToBuilding}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('assigning')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('assignUsersToUnitButton').replace('{count}', String(selectedUserIds.size))}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}