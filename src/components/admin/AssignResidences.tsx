import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Building2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';

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
  const [mode, setMode] = useState<AssignmentMode>('users-to-building');
  const [searchQuery, setSearchQuery] = useState('');
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
    const fetchUsers = async () => {
      console.log('👥 [ASSIGN-BUILDINGS] Loading resident users from API...');
      setLoadingUsers(true);
      
      try {
        const requestBody = { role: 'residence' };
        
        console.log('📤 [REQUEST] API Endpoint:', 'https://smarthome.attoexasolutions.com/api/get_users_by_role');
        console.log('📤 [REQUEST] Method:', 'POST');
        console.log('📤 [REQUEST] Headers:', {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        });
        console.log('📤 [REQUEST] Body:', requestBody);
        console.log('📤 [REQUEST] Body JSON:', JSON.stringify(requestBody));
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/get_users_by_role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        console.log('📡 Response headers:', response.headers);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📥 Users API Response:', result);

        if (result.status && result.data) {
          setUsers(result.data);
          console.log('✅ Resident users loaded successfully:', result.data.length, 'users');
        } else {
          console.error('❌ Failed to load users:', result);
          toast.error('Error', {
            description: result.message || 'Failed to load users',
          });
          // Set empty array as fallback
          setUsers([]);
        }
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : 'No stack trace',
        });
        
        toast.error('Error', {
          description: 'Failed to load users. Please check your connection.',
        });
        
        // Set empty array as fallback
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Load buildings from API
  useEffect(() => {
    const fetchBuildings = async () => {
      console.log('🔄 Fetching buildings...');
      console.log('🌐 API Endpoint:', 'https://smarthome.attoexasolutions.com/api/residences');
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [BUILDINGS] Auth token:', token ? 'Present' : 'Missing');

      const response = await fetch('https://smarthome.attoexasolutions.com/api/residences', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Buildings API Response:', result);

      if (result.status && result.data) {
        setBuildings(result.data);
        console.log('✅ Buildings loaded successfully:', result.data.length, 'buildings');
        console.log('📸 Buildings with photos:', result.data.filter((b: Building) => b.residence_photo).length);
      } else {
        console.error('❌ Failed to load buildings:', result);
        toast.error('Error', {
          description: result.message || 'Failed to load buildings',
        });
        // Set empty array as fallback
        setBuildings([]);
      }
    };

    fetchBuildings();
  }, []);

  // Load units based on selected residence
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedBuildingId) {
        setUnits([]);
        setSelectedUnitId(null);
        return;
      }

      console.log('🏠 [UNITS] Fetching units for residence:', selectedBuildingId);
      setLoadingUnits(true);
      
      try {
        const requestBody = { residence_id: selectedBuildingId };
        
        console.log('📤 [UNITS] API Endpoint:', 'https://smarthome.attoexasolutions.com/api/unit_by_residence');
        console.log('📤 [UNITS] Method:', 'POST');
        console.log('📤 [UNITS] Request Body:', requestBody);
        
        // Get auth token from localStorage
        const token = localStorage.getItem('casazero_token');
        console.log('🔑 [UNITS] Auth token:', token ? 'Present' : 'Missing');
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/unit_by_residence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📡 [UNITS] Response status:', response.status);
        console.log('📡 [UNITS] Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📥 [UNITS] API Response:', result);

        if (result.status && result.data) {
          setUnits(result.data);
          console.log('✅ [UNITS] Units loaded successfully:', result.data.length, 'units');
        } else {
          console.error('❌ [UNITS] Failed to load units:', result);
          setUnits([]);
        }
      } catch (error) {
        console.error('❌ [UNITS] Error fetching units:', error);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [selectedBuildingId]);

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
      toast.error('Error', {
        description: 'Please select a residence, unit, and at least one user',
      });
      return;
    }

    console.log('═══════════════════════════════════════');
    console.log('👥 [ASSIGN-USERS-TO-UNIT] ASSIGNMENT STARTED');
    console.log('═══════════════════════════════════════');
    console.log('🏠 [ASSIGN] Residence ID:', selectedBuildingId);
    console.log('🏠 [ASSIGN] Unit ID:', selectedUnitId);
    console.log('👥 [ASSIGN] User IDs:', Array.from(selectedUserIds));
    console.log('⏰ [ASSIGN] Timestamp:', new Date().toISOString());

    setLoading(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [ASSIGN] Auth token:', token ? 'Present ✓' : 'Missing ✗');

      const requestBody = {
        unit_id: selectedUnitId,
        user_ids: Array.from(selectedUserIds),
      };

      console.log('📤 [ASSIGN] API Endpoint:', 'https://smarthome.attoexasolutions.com/api/tag_user_to_unit/create');
      console.log('📤 [ASSIGN] Method:', 'POST');
      console.log('📤 [ASSIGN] Request Body:', requestBody);

      const response = await fetch('https://smarthome.attoexasolutions.com/api/tag_user_to_unit/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 [ASSIGN] Response received');
      console.log('📊 [ASSIGN] Response Status:', response.status);
      console.log('📊 [ASSIGN] Response Status Text:', response.statusText);
      console.log('📊 [ASSIGN] Response OK:', response.ok);

      const contentType = response.headers.get('content-type');
      console.log('📄 [ASSIGN] Content-Type:', contentType);

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
      console.log('📥 [ASSIGN] API Response:', result);
      console.log('📊 [ASSIGN] Response status field:', result.status);
      console.log('📊 [ASSIGN] Response message field:', result.message);
      console.log('📊 [ASSIGN] Response data:', result.data);

      if (result.status) {
        console.log('✅ [ASSIGN] Users assigned to unit successfully');
        console.log('✅ [ASSIGN] Success message:', result.message);
        console.log('✅ [ASSIGN] Assignments created:', result.data?.length || 0);

        const unit = units.find(u => u.id === selectedUnitId);
        const building = buildings.find(b => b.id === selectedBuildingId);

        toast.success('Success!', {
          description: result.message || `${selectedUserIds.size} user(s) assigned to ${unit?.name} in ${building?.residence_name}`,
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
        console.log('✅ [ASSIGN] Selections cleared');
      } else {
        console.error('❌ [ASSIGN] Assignment failed - API returned status: false');
        console.error('❌ [ASSIGN] Result:', result);
        toast.error('Error', {
          description: result.message || 'Failed to assign users to unit',
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
      
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to assign users. Please try again.',
      });
    } finally {
      setLoading(false);
      console.log('🏁 [ASSIGN] Assignment operation completed');
      console.log('═══════════════════════════════════════');
    }
  };

  // Assign buildings to user
  const handleAssignBuildingsToUser = async () => {
    if (!selectedUserId || selectedBuildingIds.size === 0) {
      toast.error('Error', {
        description: 'Please select a user and at least one building',
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

    toast.success('Success!', {
      description: `${newAssignments.length} building(s) assigned to ${user?.user_name}`,
    });
  };

  // Remove assignment
  const handleRemoveAssignment = async (userId: number, buildingId: number) => {
    if (!selectedUnitId) {
      toast.error('Error', {
        description: 'Please select a unit first',
      });
      return;
    }

    console.log('═══════════════════════════════════════');
    console.log('🗑️ [REMOVE-USER-FROM-UNIT] REMOVAL STARTED');
    console.log('═══════════════════════════════════════');
    console.log('👤 [REMOVE] User ID:', userId);
    console.log('🏠 [REMOVE] Unit ID:', selectedUnitId);
    console.log('⏰ [REMOVE] Timestamp:', new Date().toISOString());

    setLoading(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [REMOVE] Auth token:', token ? 'Present ✓' : 'Missing ✗');

      const requestBody = {
        user_id: userId,
        unit_id: selectedUnitId,
      };

      console.log('📤 [REMOVE] API Endpoint:', 'https://smarthome.attoexasolutions.com/api/remove_user_from_unit');
      console.log('📤 [REMOVE] Method:', 'POST');
      console.log('📤 [REMOVE] Request Body:', requestBody);

      const response = await fetch('https://smarthome.attoexasolutions.com/api/remove_user_from_unit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 [REMOVE] Response received');
      console.log('📊 [REMOVE] Response Status:', response.status);
      console.log('📊 [REMOVE] Response Status Text:', response.statusText);
      console.log('📊 [REMOVE] Response OK:', response.ok);

      const contentType = response.headers.get('content-type');
      console.log('📄 [REMOVE] Content-Type:', contentType);

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
      console.log('📥 [REMOVE] API Response:', result);
      console.log('📊 [REMOVE] Response status field:', result.status);
      console.log('📊 [REMOVE] Response message field:', result.message);

      if (result.status) {
        console.log('✅ [REMOVE] User removed from unit successfully');
        console.log('✅ [REMOVE] Success message:', result.message);

        const user = users.find(u => u.id === userId);
        const unit = units.find(u => u.id === selectedUnitId);

        toast.success('Success!', {
          description: result.message || `${user?.user_name} removed from ${unit?.name}`,
        });

        // Remove from local assignments
        setAssignments(prev => prev.filter(a => !(a.userId === userId && a.buildingId === buildingId)));
        
        console.log('✅ [REMOVE] Local assignments updated');
      } else {
        console.error('❌ [REMOVE] Removal failed - API returned status: false');
        console.error('❌ [REMOVE] Result:', result);
        toast.error('Error', {
          description: result.message || 'Failed to remove user from unit',
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
      
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove user. Please try again.',
      });
    } finally {
      setLoading(false);
      console.log('🏁 [REMOVE] Removal operation completed');
      console.log('═══════════════════════════════════════');
    }
  };

  // Calculate stats
  const totalAssignments = assignments.length;
  const totalUsersWithBuildings = new Set(assignments.map(a => a.userId)).size;
  const totalBuildingsWithUsers = new Set(assignments.map(a => a.buildingId)).size;

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.user_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  // Filter buildings based on search
  const filteredBuildings = buildings.filter(building => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      building.residence_name.toLowerCase().includes(query) ||
      (building.residence_address ? building.residence_address.toLowerCase().includes(query) : false)
    );
  });

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
            <h1 className="text-neutral-ink-900 mb-2">Assign Building and Units</h1>
            <p className="text-neutral-ink-500">Manage user-building assignments</p>
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
              <p className="text-sm text-neutral-ink-500">Total Assignments</p>
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
              <p className="text-sm text-neutral-ink-500">Users Assigned</p>
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
              <p className="text-sm text-neutral-ink-500">Buildings Occupied</p>
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
                <h3 className="text-neutral-ink-900 font-medium">Select Building</h3>
                <p className="text-sm text-neutral-ink-500">Choose a building to assign users</p>
              </div>
            </div>

            {/* Residence Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-ink-700">Residence</label>
              <Select
                value={selectedBuildingId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedBuildingId(parseInt(value));
                  setSelectedUnitId(null);
                  setSelectedUserIds(new Set());
                }}
              >
                <SelectTrigger className="rounded-xl border-neutral-line-200">
                  <SelectValue placeholder="Select a building" />
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
                <label className="text-sm font-medium text-neutral-ink-700">Units</label>
                <Select
                  value={selectedUnitId?.toString() || ''}
                  onValueChange={(value) => {
                    setSelectedUnitId(parseInt(value));
                    setSelectedUserIds(new Set());
                  }}
                  disabled={loadingUnits}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200">
                    <SelectValue placeholder={loadingUnits ? "Loading units..." : "Select a unit"} />
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
                        No units available for this residence
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
                <h4 className="text-sm font-medium text-neutral-ink-700">Currently Assigned Users</h4>
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
                      No users assigned yet
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
                <h3 className="text-neutral-ink-900 font-medium">Select Users</h3>
                <p className="text-sm text-neutral-ink-500">
                  {selectedUserIds.size > 0 ? `${selectedUserIds.size} user(s) selected` : 'Choose users to assign'}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder="Search users..."
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
                          Assigned
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
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Assign {selectedUserIds.size} User(s) to Unit
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