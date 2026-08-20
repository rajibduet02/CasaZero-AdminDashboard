import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Building2, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Home,
  X,
  ChevronDown,
  Upload,
  FileText,
  Check
} from 'lucide-react';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useLanguage } from '../../utils/LanguageContext';
import { UnitForm } from './UnitForm';
import { API_BASE, fetchResidencesCatalog, fetchUnitListCatalog, safeJsonParse,
  apiFetch,
} from '../../utils/api';

interface Residence {
  id: number;
  residence_name: string;
}

interface User {
  id: number;
  username: string;
  profile_image: string | null;
}

interface Unit {
  id: number;
  residence_id: number;
  unit_name: string;
  unit_description: string | null;
  created_at: string;
  updated_at: string;
  residence: Residence;
  /** Shown in "Assigned To" — matches `user` from POST /unit_list when present. */
  user?: User | null;
  /** Resident assigned to the unit (unit_store / unit_update); null when only admin contact is in `user`. */
  user_id?: number | null;
}

/**
 * Maps POST /unit_list rows: display uses nested `user` from API; form `user_id` only when it denotes a resident assignment.
 */
function resolveUnitListUserFields(unit: any): {
  assignee: any | null;
  fetchUserId: number | null;
  formUserId: number | null;
} {
  const adminIdRaw = unit.residence?.residence_admin;
  const adminId = adminIdRaw != null && adminIdRaw !== '' ? Number(adminIdRaw) : null;

  const nested =
    unit.assigned_user ||
    unit.assignedUser ||
    unit.client ||
    unit.resident ||
    unit.tenant ||
    unit.assignee ||
    null;
  if (nested && nested.id != null) {
    return {
      assignee: nested,
      fetchUserId: null,
      formUserId: Number(nested.id),
    };
  }

  const rawUserId =
    unit.user_id != null && unit.user_id !== '' ? Number(unit.user_id) : null;

  if (rawUserId != null && !Number.isNaN(rawUserId)) {
    if (adminId != null && rawUserId === adminId) {
      // Same id as building admin: list still shows API `user` (username / profile_image)
      return {
        assignee: unit.user ?? null,
        fetchUserId: null,
        formUserId: null,
      };
    }
    return {
      assignee: null,
      fetchUserId: rawUserId,
      formUserId: rawUserId,
    };
  }

  const apiUser = unit.user;
  if (apiUser && apiUser.id != null) {
    const uid = Number(apiUser.id);
    const isBuildingAdmin = adminId != null && uid === adminId;
    return {
      assignee: apiUser,
      fetchUserId: null,
      formUserId: isBuildingAdmin ? null : uid,
    };
  }

  return { assignee: null, fetchUserId: null, formUserId: null };
}

async function fetchUserDisplayMap(
  userIds: number[],
): Promise<Map<number, { username: string; profile_image: string | null }>> {
  const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];
  const map = new Map<number, { username: string; profile_image: string | null }>();
  if (uniqueIds.length === 0) return map;

  try {
    const token = localStorage.getItem('casazero_token');
    const userResponse = await apiFetch(`${API_BASE}/user/get`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      skipAuthFailureHandling: true,
    });
    if (!userResponse.ok) return map;
    const userData = await userResponse.json();
    const rows = Array.isArray(userData?.data) ? userData.data : [];
    for (const row of rows) {
      const id = Number(row?.id);
      if (!id) continue;
      map.set(id, {
        username: String(row.name ?? row.user_name ?? row.username ?? '').trim(),
        profile_image: row.profile_image ?? null,
      });
    }
  } catch {
    /* enrichment only — unit_list payload remains the source of truth */
  }
  return map;
}

function userDisplayFromRecord(
  row: any,
): { username: string; profile_image: string | null } {
  if (!row || typeof row !== 'object') {
    return { username: '', profile_image: null };
  }
  return {
    username: String(row.username || row.user_name || row.name || '').trim(),
    profile_image: row.profile_image ?? null,
  };
}

/** Normalize rows from POST /unit_list (optional filter by residence applied before calling). */
async function normalizeUnitsFromApiResponse(
  unitsData: any[],
  fallbackResidenceId: number | null,
  apiTopLevelResidence?: { id?: number; residence_id?: number; residence_name?: string } | null,
): Promise<Unit[]> {
  const missingNameIds: number[] = [];
  const resolvedRows = unitsData.map((unit: any) => {
    const { assignee, fetchUserId, formUserId } = resolveUnitListUserFields(unit);
    let displayId: number | null = null;
    let username = '';
    let profile_image: string | null = null;

    if (assignee && assignee.id != null) {
      displayId = Number(assignee.id);
      const display = userDisplayFromRecord(assignee);
      username = display.username;
      profile_image = display.profile_image;
    } else if (fetchUserId != null && !Number.isNaN(fetchUserId)) {
      displayId = fetchUserId;
      const display = userDisplayFromRecord(unit.user);
      username = display.username;
      profile_image = display.profile_image;
    }

    if (!username && displayId != null) {
      missingNameIds.push(displayId);
    }

    return { unit, formUserId, displayId, username, profile_image };
  });

  const userMap = await fetchUserDisplayMap(missingNameIds);

  return resolvedRows.map(({ unit, formUserId, displayId, username, profile_image }) => {
    let normalizedUser: User | null = null;
    let nextUsername = username;
    let nextImage = profile_image;

    if (!nextUsername && displayId != null && userMap.has(displayId)) {
      const fetched = userMap.get(displayId)!;
      nextUsername = fetched.username;
      if (nextImage == null) nextImage = fetched.profile_image;
    }

    if (displayId != null) {
      normalizedUser = {
        id: displayId,
        username: nextUsername || '',
        profile_image: nextImage,
      };
    }

    const resObj = unit.residence;
    const residence_id = Number(
      unit.residence_id ??
        resObj?.id ??
        apiTopLevelResidence?.id ??
        apiTopLevelResidence?.residence_id ??
        fallbackResidenceId ??
        0,
    );
    const residence_name =
      resObj?.residence_name ?? apiTopLevelResidence?.residence_name ?? '';

    return {
      id: unit.id,
      unit_name: unit.unit_name || unit.name || '',
      unit_description: unit.unit_description ?? unit.description ?? null,
      residence_id,
      residence: {
        id: Number(resObj?.id ?? apiTopLevelResidence?.id ?? residence_id),
        residence_name: residence_name,
      },
      created_at: unit.created_at || '',
      updated_at: unit.updated_at || '',
      user_id: formUserId,
      user: normalizedUser,
    };
  });
}

interface UnitManagementListProps {
  onEditUnit: (unit: Unit) => void;
  onCreateUnit: () => void;
  /** Super admin only — condominium admins cannot create units from this screen. */
  showAddUnitButton?: boolean;
  refreshKey?: number;
  filteredResidenceId?: number | null;
  onUploadDocument?: (unit: Unit) => void;
  onViewDocuments?: (unit: Unit) => void;
  onClearFilter?: () => void;
  onFilterChange?: (residenceId: number | null) => void; // Callback to update parent's filteredResidenceId
}

export function UnitManagementList({
  onEditUnit,
  onCreateUnit,
  showAddUnitButton = true,
  refreshKey,
  filteredResidenceId,
  onUploadDocument,
  onViewDocuments,
  onClearFilter,
  onFilterChange,
}: UnitManagementListProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [residenceInfo, setResidenceInfo] = useState<{ residence_id: number; residence_name: string } | null>(null);
  
  // Residence filter dropdown state
  const [residences, setResidences] = useState<Residence[]>([]);
  // Initialize selectedResidenceId from filteredResidenceId prop to preserve filter state
  const [selectedResidenceId, setSelectedResidenceId] = useState<number | null>(filteredResidenceId || null);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [openResidencePopover, setOpenResidencePopover] = useState(false);

  const { t } = useLanguage();

  // Fetch residences for the dropdown filter
  const fetchResidences = async () => {
    setLoadingResidences(true);
    try {

      const response = await fetchResidencesCatalog();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status && result.data) {
        const residenceList = result.data.map((item: any) => ({
          id: item.id,
          residence_name: item.residence_name,
        }));
        setResidences(residenceList);
      }
    } catch (error) {
      console.error('❌ [RESIDENCES-DROPDOWN] Error fetching residences:', error);
    } finally {
      setLoadingResidences(false);
    }
  };

  // Handle residence selection
  const handleResidenceSelect = async (residenceId: number | null) => {
    setSelectedResidenceId(residenceId);
    
    // Update parent's filteredResidenceId if callback is provided
    if (onFilterChange) {
      onFilterChange(residenceId);
    }
    
    if (residenceId === null) {
      // Clear filter - show all units
      setResidenceInfo(null);
      await fetchUnits();
    } else {
      setLoading(true);
      try {
        const response = await fetchUnitListCatalog();
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = (await safeJsonParse(response)) as {
          status?: unknown;
          data?: unknown[];
          message?: string;
        };
        const rawList = Array.isArray(result.data) ? result.data : [];
        const unitsData = rawList.filter(
          (u: any) => Number(u.residence_id) === Number(residenceId),
        );
        const first = unitsData[0];
        if (first?.residence) {
          setResidenceInfo({
            residence_id: first.residence.id,
            residence_name: first.residence.residence_name,
          });
        } else {
          setResidenceInfo(null);
        }
        const transformedUnits = await normalizeUnitsFromApiResponse(
          unitsData,
          residenceId,
          null,
        );
        setUnits(transformedUnits);
        setFilteredUnits(transformedUnits);
      } catch (error) {
        console.error('❌ [RESIDENCE-SELECT] Error:', error);
        setUnits([]);
        setFilteredUnits([]);
        toast.error(t('error'), {
          description: t('failedToLoadUnitsForResidence'),
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch residences on mount
  useEffect(() => {
    fetchResidences();
  }, []);

  // Fetch units from API
  const fetchUnits = async () => {
    setLoading(true);
    try {
      // POST /unit_list with { residence_admin }; filter client-side when filteredResidenceId is set
      const response = await fetchUnitListCatalog();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await safeJsonParse(response)) as {
        status?: unknown;
        data?: unknown[];
        message?: string;
      };

      const rawList = Array.isArray(result.data) ? result.data : [];
      let unitsData = rawList;

      if (filteredResidenceId != null) {
        unitsData = rawList.filter(
          (u: any) => Number(u.residence_id) === Number(filteredResidenceId),
        );
        const first = unitsData[0];
        if (first?.residence) {
          setResidenceInfo({
            residence_id: first.residence.id,
            residence_name: first.residence.residence_name,
          });
        } else {
          setResidenceInfo(null);
        }
      } else {
        setResidenceInfo(null);
      }

      const transformedUnits = await normalizeUnitsFromApiResponse(
        unitsData,
        filteredResidenceId ?? null,
        null,
      );
      setUnits(transformedUnits);
      setFilteredUnits(transformedUnits);

      const ok =
        result.status === true || result.status === 1 || result.status === '1';
      if (!ok && transformedUnits.length === 0) {
        toast.error(t('error'), {
          description: String(result.message || t('failedToLoadUnits')),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [UNITS] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [UNITS] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
          console.error('   4. Firewall blocking request');
        } else if (error.message.includes('JSON')) {
          console.error(' [UNITS] JSON Parse Error - Server sent invalid JSON');
        } else if (error.message.includes('HTML')) {
          console.error('❌ [UNITS] Server Error - Returned HTML instead of JSON');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToConnect'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Sync selectedResidenceId with filteredResidenceId prop whenever it changes
  useEffect(() => {
    if (filteredResidenceId !== null) {
      if (filteredResidenceId !== selectedResidenceId) {
        setSelectedResidenceId(filteredResidenceId);
      }
    } else {
      // Only clear if it's actually set
      if (selectedResidenceId !== null) {
        setSelectedResidenceId(null);
        setResidenceInfo(null);
      }
    }
  }, [filteredResidenceId]); // Only depend on filteredResidenceId, not selectedResidenceId to avoid loops

  // Load units on mount and when refreshKey or filteredResidenceId changes
  useEffect(() => {
    
    // fetchUnits() uses filteredResidenceId prop directly, so filtering will work correctly
    // We sync selectedResidenceId for UI display purposes (dropdown selection)
    if (filteredResidenceId !== null) {
      // If filteredResidenceId is set, ensure selectedResidenceId matches for UI
      if (filteredResidenceId !== selectedResidenceId) {
        setSelectedResidenceId(filteredResidenceId);
      }
    } else {
      // Clear local filter state when filteredResidenceId is cleared
      if (selectedResidenceId !== null || residenceInfo !== null) {
        setResidenceInfo(null);
        setSelectedResidenceId(null);
      }
    }
    
    // fetchUnits() will use filteredResidenceId prop to determine if filtering is needed
    fetchUnits();
  }, [refreshKey, filteredResidenceId]);

  // Filter units based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUnits(units);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = units.filter(
        (unit) =>
          unit.unit_name.toLowerCase().includes(query) ||
          unit.unit_description?.toLowerCase().includes(query) ||
          unit.residence?.residence_name?.toLowerCase().includes(query) ||
          unit.user?.username?.toLowerCase().includes(query)
      );
      setFilteredUnits(filtered);
    }
  }, [searchQuery, units]);

  const handleDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUnit) return;

    
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      
      const apiUrl = `${API_BASE}/unit_delete`;
      const requestBody = { id: deletingUnit.id };
      
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      
      const response = await apiFetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        console.error('❌ [DELETE-UNIT] HTTP Error Response');
        console.error('❌ [DELETE-UNIT] Status Code:', response.status);
        
        const responseText = await response.text();
        console.error('❌ [DELETE-UNIT] Response Body:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [DELETE-UNIT] Server returned HTML instead of JSON');
          throw new Error(`Server error: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [DELETE-UNIT] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await safeJsonParse(response);

      if (result.status) {
        
        toast.success(t('successExclaim'), {
          description: result.message || t('unitDeletedSuccess'),
        });
        
        await fetchUnits();
      } else {
        console.error('❌ [DELETE-UNIT] Delete failed - API returned status: false');
        console.error('❌ [DELETE-UNIT] Result:', result);
        toast.error(t('error'), {
          description: result.message || t('failedToDeleteUnit'),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [DELETE-UNIT] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [DELETE-UNIT] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: t('failedToDeleteUnitRetry'),
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeletingUnit(null);
    }
  };

  // Calculate stats
  const totalUnits = units.length;
  const residenceGroups = units.reduce((acc, unit) => {
    const residenceName = unit.residence?.residence_name || t('unknown');
    acc[residenceName] = (acc[residenceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-neutral-ink-900 mb-2">{t('unitManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageAllUnits')}</p>
        </div>

        {showAddUnitButton ? (
          <Button
            onClick={onCreateUnit}
            className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('addUnit')}
          </Button>
        ) : null}
      </motion.div>

      {/* Filtered by Residence Badge */}
      {filteredResidenceId && residenceInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 rounded-xl border border-[#6A8F7B] bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-neutral-ink-600">{t('showingUnitsFor')}</p>
                  <p className="text-neutral-ink-900">{residenceInfo.residence_name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onClearFilter) {
                    onClearFilter();
                  } else {
                    // Fallback: clear local state and fetch all units
                    setResidenceInfo(null);
                    setSelectedResidenceId(null);
                    fetchUnits();
                  }
                }}
                className="rounded-lg hover:bg-white/50"
              >
                <X className="w-4 h-4 mr-2" />
                {t('clearFilter')}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalUnits}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalUnits') || 'Total Units'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{Object.keys(residenceGroups).length}</p>
              <p className="text-sm text-neutral-ink-500">{t('residences') || 'Residences'}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Residence Filter Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            {/* Residence Filter */}
            <div className="flex items-center gap-3 flex-1">
              <Building2 className="w-5 h-5 text-neutral-ink-400" />
              <Popover open={openResidencePopover} onOpenChange={setOpenResidencePopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openResidencePopover}
                    className="w-full justify-between rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                    disabled={loadingResidences}
                  >
                    <span className="text-neutral-ink-600">
                      {(selectedResidenceId || filteredResidenceId)
                        ? residences.find((r) => r.id === (selectedResidenceId || filteredResidenceId))?.residence_name
                        : t('filterByResidence')}
                    </span>
                    {loadingResidences ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchResidence')} className="h-9" />
                    <CommandList>
                      <CommandEmpty>{t('noResidenceFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-residences"
                          onSelect={() => {
                            handleResidenceSelect(null);
                            setOpenResidencePopover(false);
                          }}
                          className="cursor-pointer rounded-lg"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedResidenceId === null ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {t('allResidences')}
                        </CommandItem>
                        {residences.map((residence) => (
                          <CommandItem
                            key={residence.id}
                            value={residence.residence_name}
                            onSelect={() => {
                              handleResidenceSelect(residence.id);
                              setOpenResidencePopover(false);
                            }}
                            className="cursor-pointer rounded-lg"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedResidenceId === residence.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <Building2 className="w-4 h-4 mr-2 text-[#6A8F7B]" />
                            {residence.residence_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedResidenceId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResidenceSelect(null)}
                  className="rounded-lg hover:bg-neutral-line-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder={t('searchUnits')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Units Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="relative"
      >
        <Card className="rounded-2xl border border-neutral-line-200 overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loading') || 'Loading units...'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('unitName')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('residence') || 'Residence'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('assignedTo') || 'Assigned To'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('description')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('documents') || 'Documents'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                    {filteredUnits.map((unit) => (
                      <tr
                        key={unit.id}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                              <Home className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm text-neutral-ink-900">{unit.unit_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{unit.residence?.residence_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {unit.user ? (
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage 
                                  src={unit.user.profile_image || undefined} 
                                  alt={unit.user.username || 'User'}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] text-white text-xs">
                                  {unit.user.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className="text-sm text-neutral-ink-900 truncate"
                                title={unit.user.username || 'User'}
                              >
                                {unit.user.username || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-ink-400 italic">{t('notAssigned')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-ink-600">
                          <span className="truncate max-w-md block">{unit.unit_description || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUploadDocument && onUploadDocument(unit)}
                              className="h-9 w-9 p-0 rounded-lg hover:bg-[#6A8F7B]/10 hover:text-[#6A8F7B] transition-all"
                              title={t('uploadDocuments')}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDocuments && onViewDocuments(unit)}
                              className="h-9 w-9 p-0 rounded-lg hover:bg-[#6A8F7B]/10 hover:text-[#6A8F7B] transition-all"
                              title={t('viewDocuments')}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
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
                              className="w-56 rounded-xl"
                            >
                              <DropdownMenuItem
                                onClick={() => onEditUnit(unit)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(unit)}
                                className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Empty State */}
              {filteredUnits.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-neutral-ink-500">{t('noUnits')}</p>
                </motion.div>
              )}
              
              {/* Bottom padding to ensure dropdown menu visibility */}
              {filteredUnits.length > 0 && (
                <div className="h-24" />
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUnit')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingUnit?.unit_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}