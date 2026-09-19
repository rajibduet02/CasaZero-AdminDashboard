import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Save, User as UserIcon, Upload, Camera, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { API_BASE,
  fetchResidencesCatalog,
  fetchUnitListCatalog,
  fetchUsersCatalog,
  isApiTruthyStatus,
  residencesArrayFromApiResult,
  safeJsonParse,
  apiFetch,
} from '../../utils/api';
import { RoleSelect,
  ResidenceSelect,
  UnitSelect,
  normalizeUserFormRole,
  getAssignmentVisibility,
  buildAssignmentPayload,
  filterUnitsAvailableForResidentAssignment,
  unitsPayloadHasOccupancySignals,
  buildUnitOccupancyMap,
  collectOccupiedUnitIdsFromUsers,
  unitIdsFromApiUser,
  toUnitSelectOption,
  type UserFormRole,
  type UnitOccupancyKeep,
} from './user-form';

interface User {
  id?: string;
  user_name: string;
  email: string;
  phone?: string;
  password?: string;
  profile_image?: string;
  two_fa_method: 'none' | 'sms' | 'email' | 'authenticator';
  role: UserFormRole;
  language: 'it' | 'en';
  registration_date?: string;
  is_document_notify: boolean;
  is_maintenance_notify: boolean;
  is_chat_notify: boolean;
  is_support_ticket_notify: boolean;
  is_password_set_by_admin: boolean;
  is_two_fa_status: boolean;
  user_status: boolean;
}

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
  loading?: boolean;
  /** Dashboard building filter: when role is Administrator, residence picker is limited to this id. */
  filteredResidenceId?: number | null;
}

function mergeResidenceListsById(prev: unknown[], incoming: unknown[]): any[] {
  const map = new Map<string, any>();
  const add = (r: unknown) => {
    if (!r || typeof r !== 'object') return;
    const row = r as Record<string, unknown>;
    const id = row.id ?? row.residence_id;
    if (id == null || String(id).trim() === '') return;
    const k = String(id).trim();
    const existing = map.get(k);
    map.set(k, existing ? { ...existing, ...row } : { ...row });
  };
  for (const r of prev) add(r);
  for (const r of incoming) add(r);
  return Array.from(map.values());
}

type AdminResidenceRow = { key: number; value: string };

function unitsArrayFromApiResult(result: Record<string, unknown> | null | undefined): any[] {
  if (Array.isArray(result?.units)) return result.units as any[];
  if (Array.isArray(result?.data)) return result.data as any[];
  return [];
}

function occupancyKeep(unitId: string | null, userId: string | null): UnitOccupancyKeep {
  return { unitId, userId };
}

function positiveIdString(value: unknown): string {
  if (value == null || String(value).trim() === '') return '';
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return '';
  return String(n);
}

/** First assigned residence id from a list row or GET /single/user payload. */
function originalResidenceIdFromUserLike(u: unknown): string {
  if (!u || typeof u !== 'object') return '';
  const row = u as Record<string, any>;
  const fromTop = positiveIdString(row.residence_id);
  if (fromTop) return fromTop;
  const residences = Array.isArray(row.residences) ? row.residences : [];
  for (const r of residences) {
    if (!r || typeof r !== 'object') continue;
    const fromRow = positiveIdString(
      (r as Record<string, unknown>).residence_id ?? (r as Record<string, unknown>).id,
    );
    if (fromRow) return fromRow;
  }
  const resObj = row.residence;
  if (resObj && typeof resObj === 'object' && !Array.isArray(resObj)) {
    const fromNested = positiveIdString(resObj.id ?? resObj.residence_id);
    if (fromNested) return fromNested;
  }
  return '';
}

/** GET /single/user often returns residences: [] for admins; recover from catalog residence_admin. */
function residenceIdFromAdminMatch(residences: unknown[], userId: string | null | undefined): string {
  const uid = String(userId ?? '').trim();
  if (!uid || !Array.isArray(residences)) return '';
  for (const r of residences) {
    if (!r || typeof r !== 'object') continue;
    const row = r as Record<string, any>;
    const adminId = row.residence_admin ?? row.admin?.id;
    if (adminId == null || String(adminId).trim() !== uid) continue;
    const id = positiveIdString(row.id ?? row.residence_id);
    if (id) return id;
  }
  return '';
}

function applyAvailableUnits(
  rawUnits: unknown[],
  keep: UnitOccupancyKeep,
  occupancyMap?: Map<string, number | null>,
  occupiedUnitIds?: Set<string>,
): any[] {
  return filterUnitsAvailableForResidentAssignment(
    rawUnits,
    keep,
    occupancyMap,
    occupiedUnitIds,
  ).map(toUnitSelectOption);
}

/** Occupied unit ids from residents (primary). Unit-list map is secondary. */
async function loadOccupancyForResidence(
  residenceId: number,
  excludeUserId: string | null,
): Promise<{ occupiedUnitIds: Set<string>; occupancyMap?: Map<string, number | null> }> {
  const occupiedUnitIds = new Set<string>();
  let occupancyMap: Map<string, number | null> | undefined;

  try {
    const usersRes = await fetchUsersCatalog();
    if (usersRes.ok) {
      const usersJson = (await safeJsonParse(usersRes)) as Record<string, unknown>;
      const users = Array.isArray(usersJson?.data) ? (usersJson.data as unknown[]) : [];
      for (const id of collectOccupiedUnitIdsFromUsers(users, excludeUserId)) {
        occupiedUnitIds.add(id);
      }
    }
  } catch (error) {
    console.error('❌ [UNITS] Failed to load resident unit occupancy from /user/get:', error);
  }

  try {
    const response = await fetchUnitListCatalog();
    if (response.ok) {
      const result = (await safeJsonParse(response)) as Record<string, unknown>;
      const raw = unitsArrayFromApiResult(result);
      const forResidence = raw.filter(u => {
        const rid = u?.residence_id ?? u?.residence?.id ?? u?.residence?.residence_id;
        return Number(rid) === residenceId;
      });
      occupancyMap = buildUnitOccupancyMap(forResidence.length > 0 ? forResidence : raw);
      for (const [unitId, occupant] of occupancyMap) {
        if (occupant != null) {
          if (excludeUserId != null && String(occupant) === String(excludeUserId)) continue;
          occupiedUnitIds.add(unitId);
        }
      }
    }
  } catch (error) {
    console.error('❌ [UNITS] Occupancy fallback from unit_list failed:', error);
  }

  return { occupiedUnitIds, occupancyMap };
}

export function UserForm({ user, onClose, onSave, loading, filteredResidenceId }: UserFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    user_name: user?.user_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
    profile_image: user?.profile_image || '',
    two_fa_method: 'none' as 'none' | 'sms' | 'email' | 'authenticator',
    role: normalizeUserFormRole(user?.role),
    language: user?.language || 'it',
    registration_date: new Date().toISOString().split('T')[0],
    is_document_notify: user?.is_document_notify ?? true,
    is_maintenance_notify: user?.is_maintenance_notify ?? true,
    is_chat_notify: user?.is_chat_notify ?? true,
    is_support_ticket_notify: user?.is_support_ticket_notify ?? true,
    is_password_set_by_admin: user?.is_password_set_by_admin ?? true,
    is_two_fa_status: false,
    user_status: user?.user_status ?? true,
  });

  const isFormDirtyRef = useRef<boolean>(false);
  const lastUserIdRef = useRef<string | undefined>(user?.id);
  const lastIsEditModeRef = useRef<boolean>(isEditMode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Cascading dropdown state for Residence and Units
  const [residences, setResidences] = useState<any[]>(() => {
    if (!isEditMode || !user) return [];
    const list: any[] = [];
    if (Array.isArray((user as any).residences)) {
      list.push(...(user as any).residences);
    }
    if ((user as any).residence && typeof (user as any).residence === 'object') {
      list.push((user as any).residence);
    }
    return list;
  });
  const [units, setUnits] = useState<any[]>([]);
  const [selectedResidenceId, setSelectedResidenceId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const adminResidenceRowIdRef = useRef(1);
  const [adminResidenceRows, setAdminResidenceRows] = useState<AdminResidenceRow[]>([
    { key: 0, value: '' },
  ]);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [pendingResidenceSelection, setPendingResidenceSelection] = useState<string | null>(null);
  const [pendingUnitSelection, setPendingUnitSelection] = useState<string | null>(null);
  /** Edit mode: keep this resident's current unit in the dropdown even though it is occupied. */
  const [editingAssignedUnitId, setEditingAssignedUnitId] = useState<string | null>(null);
  const [editingAssignedUserId, setEditingAssignedUserId] = useState<string | null>(
    isEditMode && user?.id ? String(user.id) : null,
  );
  /** Original assignment at edit-open time — sent as old_residence_id / old_unit_id on update. */
  const originalResidenceIdRef = useRef('');
  const originalUnitIdRef = useRef('');
  const selectedResidenceIdRef = useRef(selectedResidenceId);
  selectedResidenceIdRef.current = selectedResidenceId;

  // POST /residences with `is_null`: true for Administrator (scoped list), false for Resident (full list).
  // Administrator UI further restricts options to `filteredResidenceId` when the dashboard filter is set.
  useEffect(() => {
    const role = normalizeUserFormRole(formData.role);

    if (role === 'super_admin') {
      setResidences([]);
      setLoadingResidences(false);
      return;
    }

    const fetchResidences = async () => {
      setLoadingResidences(true);
      const isAdminRole = role === 'admin';
      console.log('🏢 [RESIDENCES] Fetching residences...', {
        role,
        is_null: isAdminRole,
        filteredResidenceId,
      });

      try {
        const response = await fetchResidencesCatalog({
          is_null: isAdminRole,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await safeJsonParse(response)) as Record<string, unknown>;
        console.log('📥 [RESIDENCES] API Response:', result);

        if (isApiTruthyStatus(result.status)) {
          let list = residencesArrayFromApiResult(result);

          if (isAdminRole && filteredResidenceId != null) {
            const fid = Number(filteredResidenceId);
            list = list.filter(
              (r: unknown) =>
                Number((r as Record<string, unknown>)?.id ?? (r as Record<string, unknown>)?.residence_id) ===
                fid,
            );
          }

          if (isAdminRole && filteredResidenceId != null && list.length === 0) {
            const response2 = await fetchResidencesCatalog({ is_null: false });
            if (response2.ok) {
              const result2 = (await safeJsonParse(response2)) as Record<string, unknown>;
              if (isApiTruthyStatus(result2.status)) {
                const full = residencesArrayFromApiResult(result2);
                const fid = Number(filteredResidenceId);
                list = full.filter(
                  (r: unknown) =>
                    Number((r as Record<string, unknown>)?.id ?? (r as Record<string, unknown>)?.residence_id) ===
                    fid,
                );
              }
            }
          }

          if (list.length > 0) {
            console.log('✅ [RESIDENCES] Loaded', list.length, 'residences');
          } else {
            console.warn('⚠️ [RESIDENCES] No residences after filter');
          }

          if (role === 'admin') {
            // For admin role, list must only be unassigned residences (is_null: true)
            // Plus keep the currently edited admin's existing assigned residence (if in edit mode)
            const allowedAdminResidenceMap = new Map<string, any>();
            for (const r of list) {
              const id = r?.id ?? r?.residence_id;
              if (id != null && String(id).trim() !== '') {
                allowedAdminResidenceMap.set(String(id).trim(), r);
              }
            }
            if (isEditMode && user) {
              const keepAssigned = [
                ...(Array.isArray((user as any).residences) ? (user as any).residences : []),
                ...((user as any).residence && typeof (user as any).residence === 'object' ? [(user as any).residence] : []),
              ];
              for (const r of keepAssigned) {
                const id = r?.id ?? r?.residence_id;
                if (id != null && String(id).trim() !== '') {
                  const k = String(id).trim();
                  if (!allowedAdminResidenceMap.has(k)) {
                    allowedAdminResidenceMap.set(k, r);
                  }
                }
              }
            }
            setResidences(Array.from(allowedAdminResidenceMap.values()));
          } else if (role === 'resident') {
            setResidences(prev => mergeResidenceListsById(prev, list));
          } else {
            setResidences(list as any[]);
          }
        } else {
          console.warn('⚠️ [RESIDENCES] No residences found');
          if (role === 'admin') {
            // Keep existing assigned if editing, otherwise empty
            const keepAssigned: any[] = [];
            if (isEditMode && user) {
              if (Array.isArray((user as any).residences)) keepAssigned.push(...(user as any).residences);
              if ((user as any).residence && typeof (user as any).residence === 'object') keepAssigned.push((user as any).residence);
            }
            setResidences(keepAssigned);
          }
        }
      } catch (error) {
        console.error('❌ [RESIDENCES] Error fetching residences:', error);
        toast.error(t('error') || 'Error', {
          description: t('failedToLoadResidences') || 'Failed to load residences.',
        });
      } finally {
        setLoadingResidences(false);
      }
    };

    fetchResidences();
  }, [formData.role, filteredResidenceId]);

  // Fetch units only for residents with a residence (admins never load the unit list here).
  // Occupied units are omitted; in edit mode the current user's unit stays in the list.
  useEffect(() => {
    if (isLoadingUserDetails) {
      return;
    }
    // Edit flow: details API sets units + pending residence before selectedResidenceId is applied
    if (pendingResidenceSelection) {
      return;
    }

    const role = normalizeUserFormRole(formData.role);

    if (role !== 'resident') {
      setUnits([]);
      setLoadingUnits(false);
      return;
    }

    const fetchUnits = async () => {
      if (!selectedResidenceId) {
        setUnits([]);
        setSelectedUnitId('');
        setLoadingUnits(false);
        return;
      }

      const residenceIdAtStart = selectedResidenceId;
      const keep = occupancyKeep(editingAssignedUnitId, editingAssignedUserId);
      setLoadingUnits(true);

      try {
        const requestBody = { residence_id: parseInt(selectedResidenceId, 10) };
        const response = await apiFetch(`${API_BASE}/unit_by_residence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await safeJsonParse(response)) as Record<string, unknown>;
        if (selectedResidenceIdRef.current !== residenceIdAtStart) {
          return;
        }

        const unitsLoaded = isApiTruthyStatus(result.status);
        const rawUnits = unitsLoaded ? unitsArrayFromApiResult(result) : [];
        if (!unitsLoaded) {
          toast.error(t('error') || 'Error', {
            description:
              (typeof result.message === 'string' && result.message) ||
              t('failedToLoadUnitsForResidence') ||
              'Failed to load units.',
          });
        }
        let occupancyMap: Map<string, number | null> | undefined;
        let occupiedUnitIds: Set<string> | undefined;

        if (rawUnits.length > 0) {
          const occupancy = await loadOccupancyForResidence(
            parseInt(residenceIdAtStart, 10),
            editingAssignedUserId,
          );
          if (selectedResidenceIdRef.current !== residenceIdAtStart) {
            return;
          }
          occupiedUnitIds = occupancy.occupiedUnitIds;
          occupancyMap = occupancy.occupancyMap;
          if (!occupancyMap && unitsPayloadHasOccupancySignals(rawUnits)) {
            occupancyMap = buildUnitOccupancyMap(rawUnits);
          }
          console.log('🏠 [UNITS] Occupancy filter:', {
            residenceId: residenceIdAtStart,
            total: rawUnits.length,
            occupied: occupiedUnitIds.size,
            keepUnitId: keep.unitId,
          });
        }

        const available = applyAvailableUnits(rawUnits, keep, occupancyMap, occupiedUnitIds);
        setUnits(available);

        setSelectedUnitId(prev => {
          if (!prev) return prev;
          return available.some(u => String(u.id) === prev) ? prev : '';
        });
        setPendingUnitSelection(prev => {
          if (!prev) return prev;
          return available.some(u => String(u.id) === prev) ? prev : null;
        });
      } catch (error) {
        console.error('❌ [UNITS] Error fetching units:', error);
        if (selectedResidenceIdRef.current === residenceIdAtStart) {
          setUnits([]);
          toast.error(t('error') || 'Error', {
            description: t('failedToLoadUnitsForResidence') || 'Failed to load units.',
          });
        }
      } finally {
        if (selectedResidenceIdRef.current === residenceIdAtStart) {
          setLoadingUnits(false);
        }
      }
    };

    fetchUnits();
  }, [
    selectedResidenceId,
    isLoadingUserDetails,
    formData.role,
    pendingResidenceSelection,
    editingAssignedUnitId,
    editingAssignedUserId,
  ]);

  // Apply pending residence selection after residences are loaded
  useEffect(() => {
    if (pendingResidenceSelection && residences.length > 0) {
      // Verify the residence exists in the list
      const residenceExists = residences.some(r => {
        const rid = r.id ?? r.residence_id;
        return rid != null && String(rid) === pendingResidenceSelection;
      });
      if (residenceExists) {
        setSelectedResidenceId(pendingResidenceSelection);
        if (normalizeUserFormRole(formData.role) === 'admin') {
          setAdminResidenceRows(prev => [{ key: prev[0]?.key ?? 0, value: pendingResidenceSelection }]);
        }
        console.log('✅ [RESIDENCES] Applied pending residence selection:', pendingResidenceSelection);
      } else {
        console.warn('⚠️ [RESIDENCES] Pending residence ID not found in list:', pendingResidenceSelection);
      }
      setPendingResidenceSelection(null);
    }
  }, [pendingResidenceSelection, residences, formData.role]);

  // Admin GET /single/user often omits residences; recover old_residence_id from catalog.
  useEffect(() => {
    if (!isEditMode || originalResidenceIdRef.current.trim()) return;
    const fromAdmin = residenceIdFromAdminMatch(residences, editingAssignedUserId);
    if (fromAdmin) {
      originalResidenceIdRef.current = fromAdmin;
      console.log('✅ [RESIDENCES] Recovered old_residence_id from loaded catalog:', fromAdmin);
    }
  }, [isEditMode, editingAssignedUserId, residences]);

  // Apply pending unit selection after units are loaded
  useEffect(() => {
    if (pendingUnitSelection && units.length > 0) {
      // Verify the unit exists in the list
      const unitExists = units.some(u => String(u.id) === pendingUnitSelection);
      if (unitExists) {
        setSelectedUnitId(pendingUnitSelection);
        console.log('✅ [UNITS] Applied pending unit selection:', pendingUnitSelection);
      } else {
        console.warn('⚠️ [UNITS] Pending unit ID not found in list:', pendingUnitSelection);
      }
      setPendingUnitSelection(null);
    }
  }, [pendingUnitSelection, units]);

  const fetchUserDetails = useCallback(async (userId: string, isCurrentCheck?: () => boolean) => {
    setFetchingUser(true);
    setIsLoadingUserDetails(true);

    try {
      const apiUrl = `${API_BASE}/single/user/${userId}`;
      
      console.log('=== API REQUEST (Fetch User) ===');
      console.log('URL:', apiUrl);
      console.log('Method:', 'GET');

      const response = await apiFetch(apiUrl);

      console.log('=== API RESPONSE (Fetch User) ===');
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

      // Ignore stale responses if active user changed or request was cancelled
      if (isCurrentCheck && !isCurrentCheck()) {
        console.log('⏹️ [FETCH USER] Ignored stale user response for ID:', userId);
        return;
      }

      if (data.status && data.user) {
        console.log('✅ SUCCESS: User details fetched successfully');
        console.log('User Data:', data.user);
        console.log('Residences from API:', data.residences);
        console.log('Units from API:', data.units);

        const loadedRole = normalizeUserFormRole(data.user.role);

        // Helper function to convert various boolean representations to boolean
        const toBoolean = (value: any): boolean => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'number') return value === 1;
          if (typeof value === 'string') {
            if (value === '1' || value.toLowerCase() === 'true') return true;
            if (value === '0' || value.toLowerCase() === 'false') return false;
          }
          return false;
        };

        const loadedUserId =
          data.user.id != null && String(data.user.id).trim() !== ''
            ? String(data.user.id)
            : userId;
        // Single-user API often omits user.unit_id and only returns units: [{ id, unit_name }]
        const unitIdsFromDetails = unitIdsFromApiUser({
          ...data.user,
          units: data.units ?? data.user.units,
        });
        const loadedUnitId = unitIdsFromDetails[0] ?? null;

        // Super admin: no residence/unit scope in the form
        if (loadedRole === 'super_admin') {
          setResidences([]);
          setUnits([]);
          setSelectedResidenceId('');
          setSelectedUnitId('');
          setAdminResidenceRows([{ key: 0, value: '' }]);
          setPendingResidenceSelection(null);
          setPendingUnitSelection(null);
          setEditingAssignedUnitId(null);
          setEditingAssignedUserId(null);
          originalResidenceIdRef.current = '';
          originalUnitIdRef.current = '';
        } else {
          let residenceIdToSelect: string | null = null;
          const uid = data.user.residence_id;
          if (uid != null && String(uid).trim() !== '') {
            residenceIdToSelect = String(uid);
          } else if (data.residences && Array.isArray(data.residences) && data.residences.length > 0) {
            const first = data.residences[0] as { id?: unknown; residence_id?: unknown };
            const rid = first?.id ?? first?.residence_id;
            if (rid != null && String(rid).trim() !== '') {
              residenceIdToSelect = String(rid);
            }
          }
          if (residenceIdToSelect) {
            originalResidenceIdRef.current = residenceIdToSelect;
          } else if (!originalResidenceIdRef.current.trim() && loadedRole === 'admin') {
            try {
              const catalogRes = await fetchResidencesCatalog({ is_null: false });
              if (catalogRes.ok) {
                const catalogJson = (await safeJsonParse(catalogRes)) as Record<string, unknown>;
                const catalogList = residencesArrayFromApiResult(catalogJson);
                const fromAdmin = residenceIdFromAdminMatch(catalogList, loadedUserId);
                if (fromAdmin) {
                  originalResidenceIdRef.current = fromAdmin;
                  console.log('✅ [RESIDENCES] Recovered old_residence_id from catalog admin match:', fromAdmin);
                }
              }
            } catch (error) {
              console.warn('⚠️ [RESIDENCES] Could not recover old_residence_id from catalog:', error);
            }
          }

          if (data.residences && Array.isArray(data.residences) && data.residences.length > 0) {
            setResidences(prev => mergeResidenceListsById(prev, data.residences));
          }

          if (residenceIdToSelect) {
            setPendingResidenceSelection(residenceIdToSelect);
          } else if (!data.residences?.length) {
            console.warn('⚠️ [RESIDENCES] No residence id or list in user API response');
          }
        }

        // Only residents use the unit dropdown; seed list from API while loading user details
        if (loadedRole === 'resident') {
          setEditingAssignedUserId(loadedUserId);
          setEditingAssignedUnitId(loadedUnitId);
          originalUnitIdRef.current = loadedUnitId ?? '';
          if (data.units && Array.isArray(data.units) && data.units.length > 0) {
            const keep = occupancyKeep(loadedUnitId, loadedUserId);
            const seedSource = unitsPayloadHasOccupancySignals(data.units)
              ? data.units
              : loadedUnitId
                ? data.units.filter((u: { id?: unknown }) => String(u.id) === loadedUnitId)
                : [];
            setUnits(applyAvailableUnits(seedSource, keep));
            if (loadedUnitId) {
              setPendingUnitSelection(loadedUnitId);
            } else {
              setSelectedUnitId('');
              setPendingUnitSelection(null);
            }
          } else if (loadedUnitId) {
            setPendingUnitSelection(loadedUnitId);
          } else {
            setSelectedUnitId('');
            setPendingUnitSelection(null);
          }
        } else {
          setEditingAssignedUnitId(null);
          setEditingAssignedUserId(loadedRole === 'admin' ? loadedUserId : null);
          originalUnitIdRef.current = '';
          setUnits([]);
          setSelectedUnitId('');
          setPendingUnitSelection(null);
        }

        // Map API response to form data, preserving active user edits
        setFormData(prev => ({
          ...prev,
          user_name: isFormDirtyRef.current ? prev.user_name : (data.user.user_name || ''),
          email: isFormDirtyRef.current ? prev.email : (data.user.email || ''),
          phone: isFormDirtyRef.current ? prev.phone : (data.user.phone || ''),
          password: '',
          confirmPassword: '',
          profile_image: data.user.profile_image || prev.profile_image || '',
          two_fa_method: 'none',
          role: isFormDirtyRef.current ? prev.role : loadedRole,
          language: isFormDirtyRef.current ? prev.language : (data.user.language || 'it'),
          registration_date: prev.registration_date || new Date().toISOString().split('T')[0],
          is_document_notify: toBoolean(data.user.is_document_notify),
          is_maintenance_notify: toBoolean(data.user.is_maintenance_notify),
          is_chat_notify: toBoolean(data.user.is_chat_notify),
          is_support_ticket_notify: toBoolean(data.user.is_support_ticket_notify),
          is_password_set_by_admin: toBoolean(data.user.is_password_set_by_admin),
          is_two_fa_status: toBoolean(data.user.is_two_fa_status),
          user_status: toBoolean(data.user.user_status),
        }));

        console.log('📋 [FORM DATA] Notification settings:', {
          is_document_notify: toBoolean(data.user.is_document_notify),
          is_maintenance_notify: toBoolean(data.user.is_maintenance_notify),
          is_chat_notify: toBoolean(data.user.is_chat_notify),
          is_support_ticket_notify: toBoolean(data.user.is_support_ticket_notify),
          raw_values: {
            is_document_notify: data.user.is_document_notify,
            is_maintenance_notify: data.user.is_maintenance_notify,
            is_chat_notify: data.user.is_chat_notify,
            is_support_ticket_notify: data.user.is_support_ticket_notify,
          }
        });

        console.log('✅ Form data populated from API response');
        console.log('=== FETCH USER DETAILS COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('❌ API Error: status is false or user is missing');
        console.error('Data:', data);

        toast.error(t('error'), {
          description: data.message || t('failedToLoadUserDetails'),
        });
      }
    } catch (error) {
      console.error('=== EXCEPTION CAUGHT (Fetch User) ===');
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

      toast.error(t('error'), {
        description: t('failedToLoadUserDetails'),
      });
    } finally {
      setFetchingUser(false);
      setIsLoadingUserDetails(false);
    }
  }, [t]);

  useEffect(() => {
    let isCurrent = true;
    const userIdChanged = user?.id !== lastUserIdRef.current;
    const modeChanged = isEditMode !== lastIsEditModeRef.current;

    if (userIdChanged || modeChanged) {
      lastUserIdRef.current = user?.id;
      lastIsEditModeRef.current = isEditMode;
      isFormDirtyRef.current = false;

      if (isEditMode && user) {
        const initialRes: any[] = [];
        if (Array.isArray((user as any).residences)) {
          initialRes.push(...(user as any).residences);
        }
        if ((user as any).residence && typeof (user as any).residence === 'object') {
          initialRes.push((user as any).residence);
        }
        if (initialRes.length > 0) {
          setResidences(prev => mergeResidenceListsById(prev, initialRes));
        }
      }

      setFormData({
        user_name: user?.user_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        confirmPassword: '',
        profile_image: user?.profile_image || '',
        two_fa_method: 'none',
        role: normalizeUserFormRole(user?.role),
        language: user?.language || 'it',
        registration_date: new Date().toISOString().split('T')[0],
        is_document_notify: user?.is_document_notify ?? true,
        is_maintenance_notify: user?.is_maintenance_notify ?? true,
        is_chat_notify: user?.is_chat_notify ?? true,
        is_support_ticket_notify: user?.is_support_ticket_notify ?? true,
        is_password_set_by_admin: user?.is_password_set_by_admin ?? true,
        is_two_fa_status: false,
        user_status: user?.user_status ?? true,
      });
    }

    if (isEditMode && user) {
      originalResidenceIdRef.current = originalResidenceIdFromUserLike(user);
      originalUnitIdRef.current = unitIdsFromApiUser(user)[0] ?? '';
    } else {
      originalResidenceIdRef.current = '';
      originalUnitIdRef.current = '';
    }

    if (isEditMode && user?.id) {
      fetchUserDetails(user.id, () => isCurrent);
    }

    return () => {
      isCurrent = false;
    };
  }, [isEditMode, user?.id, user, fetchUserDetails]);

  const handleChange = (field: string, value: string | boolean) => {
    isFormDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /** Role drives which assignment fields exist — clear dependents to avoid stale IDs in the payload. */
  const handleRoleChange = useCallback((nextRole: UserFormRole) => {
    isFormDirtyRef.current = true;
    const prevRole = normalizeUserFormRole(formData.role);

    setFormData(prev => ({ ...prev, role: nextRole }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.residence_id;
      delete next.unit_id;
      return next;
    });

    if (nextRole === 'super_admin') {
      setSelectedResidenceId('');
      setSelectedUnitId('');
      setUnits([]);
      setAdminResidenceRows([{ key: 0, value: '' }]);
      setPendingResidenceSelection(null);
      setPendingUnitSelection(null);
    } else if (nextRole === 'admin') {
      // Admin uses residence only; do not auto-select to avoid implicit assignment.
      setSelectedUnitId('');
      setPendingUnitSelection(null);
      setUnits([]);
      if (prevRole === 'resident') {
        setAdminResidenceRows([{ key: 0, value: selectedResidenceId.trim() ? selectedResidenceId : '' }]);
      } else if (prevRole === 'super_admin') {
        setSelectedResidenceId('');
        setAdminResidenceRows([{ key: 0, value: '' }]);
      } else if (prevRole !== 'admin') {
        setAdminResidenceRows([{ key: 0, value: '' }]);
      }
    } else if (nextRole === 'resident') {
      // Resident needs both fields, selected explicitly by user.
      if (prevRole === 'admin') {
        const first = adminResidenceRows.map(r => r.value.trim()).find(Boolean) || '';
        setSelectedResidenceId(first);
      } else {
        setSelectedResidenceId('');
      }
      setAdminResidenceRows([{ key: 0, value: '' }]);
      setSelectedUnitId('');
      setUnits([]);
      setPendingResidenceSelection(null);
      setPendingUnitSelection(null);
    }
  }, [formData.role, selectedResidenceId, adminResidenceRows]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('=== PROFILE IMAGE UPLOAD STARTED ===');
    console.log('Selected File:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      toast.error(t('error'), {
        description: t('invalidImageFile'),
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      toast.error(t('error'), {
        description: t('imageMax5mb'),
      });
      return;
    }

    setUploadingImage(true);
    setProfileImageFile(file);

    try {
      // Create a temporary user ID for new users (will be replaced after user creation)
      // For existing users, use their ID
      const tempUserId = user?.id || 'temp_' + Date.now();
      
      console.log('User ID for upload:', tempUserId);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profile_image', file);

      console.log('=== API REQUEST (Profile Image Upload) ===');
      console.log('URL:', `${API_BASE}/user/profile_image/update/${tempUserId}`);
      console.log('Method:', 'POST');
      console.log('FormData:', {
        profile_image: file.name,
      });

      const response = await apiFetch(
        `${API_BASE}/user/profile_image/update/${tempUserId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('=== API RESPONSE (Profile Image Upload) ===');
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response OK:', response.ok);

      const data = await response.json();
      
      console.log('Response Data:', data);
      console.log('Response Data (JSON):', JSON.stringify(data, null, 2));

      if (data.status && data.image_url) {
        console.log('✅ SUCCESS: Profile image uploaded successfully');
        console.log('Image URL:', data.image_url);
        
        // Update form with the uploaded image URL
        handleChange('profile_image', data.image_url);
        
        toast.success(t('successExclaim'), {
          description: data.message || t('profileImageUploaded'),
        });
        
        console.log('=== PROFILE IMAGE UPLOAD COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('❌ API ERROR: Upload failed');
        console.error('Error Message:', data.message);
        console.error('Full Error Response:', data);
        
        toast.error(t('error'), {
          description: data.message || t('failedToUploadImage'),
        });
      }
    } catch (error) {
      console.error('=== EXCEPTION CAUGHT (Profile Image Upload) ===');
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
      
      toast.error(t('error'), {
        description: t('failedToUploadImage'),
      });
    } finally {
      setUploadingImage(false);
      console.log('Upload loading state set to false');
      console.log('=== PROFILE IMAGE UPLOAD PROCESS ENDED ===');
    }
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    console.log('=== FORM VALIDATION STARTED ===');
    console.log('Form Data:', formData);
    
    const newErrors: Record<string, string> = {};

    if (!formData.user_name.trim()) {
      newErrors.user_name = t('nameRequired') || 'Name is required';
      console.error('❌ Validation Error: user_name is empty');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired') || 'Email is required';
      console.error('❌ Validation Error: email is empty');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('emailInvalid') || 'Invalid email';
      console.error('❌ Validation Error: email format is invalid -', formData.email);
    }

    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = t('passwordRequired') || 'Password is required';
        console.error('❌ Validation Error: password is empty');
      } else if (formData.password.length < 8) {
        newErrors.password = t('passwordTooShort') || 'Password must be at least 8 characters';
        console.error('❌ Validation Error: password too short -', formData.password.length, 'characters');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('passwordsDoNotMatch') || 'Passwords do not match';
        console.error('❌ Validation Error: passwords do not match');
      }
    }

    const role = normalizeUserFormRole(formData.role);
    if (role === 'resident') {
      if (!selectedResidenceId.trim()) {
        newErrors.residence_id = t('selectResidence') || 'Please select a residence';
      }
      if (!selectedUnitId.trim()) {
        newErrors.unit_id = t('selectUnit') || 'Please select a unit';
      }
    } else if (role === 'admin') {
      const chosen = adminResidenceRows.map(r => r.value.trim()).filter(Boolean);
      if (chosen.length === 0) {
        newErrors.residence_id = t('selectResidence') || 'Please select a residence';
      } else {
        const seen = new Set<string>();
        for (const id of chosen) {
          if (seen.has(id)) {
            newErrors.residence_id = t('residenceSelectedOnce');
            break;
          }
          seen.add(id);
        }
      }
    }
    // super_admin: no assignment fields required

    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    
    if (isValid) {
      console.log('✅ Form validation passed');
    } else {
      console.error('❌ Form validation failed');
      console.error('Validation Errors:', newErrors);
      console.error('Total Errors:', Object.keys(newErrors).length);
    }
    
    console.log('=== FORM VALIDATION ENDED ===');
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const role = normalizeUserFormRole(formData.role);
    const assignment = buildAssignmentPayload(
      role,
      selectedResidenceId,
      selectedUnitId,
      role === 'admin' ? adminResidenceRows.map(r => r.value) : undefined,
    );

    const userData: Partial<User> & {
      unit_id?: string;
      residence_id?: string;
      residenceIds?: string[];
      old_residence_id?: string;
      old_unit_id?: string;
      profileImageFile?: File | null;
    } = {
      user_name: formData.user_name,
      email: formData.email,
      phone: formData.phone || undefined,
      profile_image: formData.profile_image || undefined,
      two_fa_method: formData.two_fa_method as 'none' | 'sms' | 'email' | 'authenticator',
      role,
      language: formData.language as 'it' | 'en',
      registration_date: formData.registration_date,
      is_document_notify: formData.is_document_notify,
      is_maintenance_notify: formData.is_maintenance_notify,
      is_chat_notify: formData.is_chat_notify,
      is_support_ticket_notify: formData.is_support_ticket_notify,
      is_password_set_by_admin: formData.is_password_set_by_admin,
      is_two_fa_status: formData.is_two_fa_status,
      user_status: formData.user_status,
      profileImageFile: profileImageFile,
      ...assignment,
    };

    if (isEditMode) {
      const oldResidenceId = originalResidenceIdRef.current.trim();
      const oldUnitId = originalUnitIdRef.current.trim();
      if (oldResidenceId) userData.old_residence_id = oldResidenceId;
      if (oldUnitId) userData.old_unit_id = oldUnitId;
    }

    // Add password for create mode (required) or edit mode (optional)
    if (formData.password) {
      userData.password = formData.password;
      (userData as any).confirmPassword = formData.confirmPassword;
    }

    if (isEditMode && user?.id) {
      userData.id = user.id;
    }

    console.log('=== FORM SUBMITTED ===');
    console.log('User Data being sent to parent:', userData);
    console.log('Profile Image File:', profileImageFile?.name);

    onSave(userData);
  };

  const assignmentVisibility = getAssignmentVisibility(normalizeUserFormRole(formData.role));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        ref={modalContainerRef}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header with Profile Image */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
            <div className="flex items-center gap-3">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {/* Clickable Profile Image */}
              <button
                type="button"
                onClick={handleProfileImageClick}
                disabled={uploadingImage}
                className="relative group p-2 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : formData.profile_image ? (
                    <img
                      src={formData.profile_image}
                      alt="Profile"
                      className="w-full h-full rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
                      }}
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                {/* Camera Overlay */}
                {!uploadingImage && (
                  <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
              
              <div>
                <h2 className="text-neutral-ink-900">
                  {isEditMode ? t('editUser') : t('addUser')}
                </h2>
                <p className="text-sm text-neutral-ink-500">
                  {isEditMode ? t('updateUserInfo') : t('createNewUserAccount')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg w-9 h-9 p-0 hover:bg-neutral-line-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">

            {/* Role & Language Section */}
<div className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 border border-[#6A8F7B]/20">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68]"></div>
    <h3 className="text-neutral-ink-900 font-medium">{t('roleAndLanguage')}</h3>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
    <RoleSelect
      value={normalizeUserFormRole(formData.role)}
      onChange={handleRoleChange}
      label={t('role')}
      placeholder={t('selectRole')}
      residentLabel={t('resident')}
      adminLabel={t('administrator')}
      superAdminLabel={t('superAdmin')}
      containerRef={modalContainerRef}
      required
    />

    {/* Language Toggle */}
    <div className="space-y-2">
      <Label className="text-neutral-ink-700">
        {t('language')} <span className="text-red-500">*</span>
      </Label>
      <div className="flex items-center gap-2 h-11 p-1 rounded-xl border border-neutral-line-200 bg-neutral-line-50">
        <button
          type="button"
          onClick={() => handleChange('language', 'it')}
          className={`flex-1 h-full rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm ${
            formData.language === 'it'
              ? 'bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white shadow-md'
              : 'bg-transparent text-neutral-ink-700 hover:bg-white'
          }`}
        >
          <span className="text-base">🇮🇹</span>
          <span>IT</span>
        </button>

        <button
          type="button"
          onClick={() => handleChange('language', 'en')}
          className={`flex-1 h-full rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm ${
            formData.language === 'en'
              ? 'bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white shadow-md'
              : 'bg-transparent text-neutral-ink-700 hover:bg-white'
          }`}
        >
          <span className="text-base">🇬🇧</span>
          <span>EN</span>
        </button>
      </div>
    </div>

  </div>
</div>

            {assignmentVisibility.showResidence || assignmentVisibility.showUnit ? (
              <div className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 border border-[#6A8F7B]/20 min-h-[8.5rem]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68]" />
                  <h3 className="text-neutral-ink-900 font-medium">{t('residenceUnitAssignment')}</h3>
                </div>

                <div
                  className={`grid gap-4 ${
                    assignmentVisibility.showUnit
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:max-w-md'
                  }`}
                >
                  {assignmentVisibility.showResidence ? (
                    <div className="space-y-3">
                      {normalizeUserFormRole(formData.role) === 'admin' ? (
                        <>
                          {adminResidenceRows.map((row, index) => {
                            return (
                              <div key={row.key} className="flex gap-2 items-end">
                                <div className="flex-1 min-w-0">
                                  <ResidenceSelect
                                    id={`residence-${row.key}`}
                                    label={t('residence')}
                                    placeholder={t('selectResidence')}
                                    value={row.value}
                                    onValueChange={(value) => {
                                      setAdminResidenceRows(prev =>
                                        prev.map(r => (r.key === row.key ? { ...r, value } : r)),
                                      );
                                      if (errors.residence_id) {
                                        setErrors(prev => ({ ...prev, residence_id: '' }));
                                      }
                                    }}
                                    residences={residences}
                                    loading={loadingResidences}
                                    containerRef={modalContainerRef}
                                    required
                                  />
                                </div>
                                {index > 0 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-11 w-11 shrink-0 rounded-xl p-0 text-neutral-ink-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setAdminResidenceRows(prev =>
                                        prev.filter(r => r.key !== row.key),
                                      );
                                      if (errors.residence_id) {
                                        setErrors(prev => ({ ...prev, residence_id: '' }));
                                      }
                                    }}
                                    aria-label={t('removeResidence')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <div className="w-11 shrink-0" aria-hidden />
                                )}
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl border-neutral-line-200 text-neutral-ink-700 hover:bg-neutral-line-50"
                            onClick={() => {
                              setAdminResidenceRows(prev => [
                                ...prev,
                                { key: adminResidenceRowIdRef.current++, value: '' },
                              ]);
                            }}
                          >
                            + {t('addResidence')}
                          </Button>
                        </>
                      ) : (
                        <ResidenceSelect
                          label={t('residence')}
                          placeholder={t('selectResidence')}
                          value={selectedResidenceId}
                          onValueChange={(value) => {
                            setSelectedResidenceId(value);
                            setSelectedUnitId('');
                            if (errors.residence_id) {
                              setErrors(prev => ({ ...prev, residence_id: '' }));
                            }
                            if (errors.unit_id) {
                              setErrors(prev => ({ ...prev, unit_id: '' }));
                            }
                          }}
                          residences={residences}
                          loading={loadingResidences}
                          containerRef={modalContainerRef}
                          required
                        />
                      )}
                      {errors.residence_id ? (
                        <p className="text-xs text-red-500 mt-1">{errors.residence_id}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {assignmentVisibility.showUnit ? (
                    <div>
                      <UnitSelect
                        label={t('unit')}
                        placeholderWhenEnabled={t('selectUnit')}
                        placeholderWhenNoResidence={
                          t('selectResidenceFirst') || 'Select residence first'
                        }
                        value={selectedUnitId}
                        onValueChange={(value) => {
                          setSelectedUnitId(value);
                          if (errors.unit_id) {
                            setErrors(prev => ({ ...prev, unit_id: '' }));
                          }
                        }}
                        units={units}
                        loading={loadingUnits}
                        disabledUntilResidence={!selectedResidenceId.trim()}
                        containerRef={modalContainerRef}
                        required
                      />
                      {errors.unit_id ? (
                        <p className="text-xs text-red-500 mt-1">{errors.unit_id}</p>
                      ) : null}
                      {selectedResidenceId && units.length === 0 && !loadingUnits ? (
                        <p className="text-xs text-neutral-ink-500 italic mt-1">
                          {t('noUnitsFoundForResidence')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">{t('basicInformation')}</h3>
              
              {/* User Name */}
              <div className="space-y-2">
                <Label htmlFor="user_name" className="text-neutral-ink-700">
                  {t('fullName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user_name"
                  name="user_name"
                  type="text"
                  autoComplete="off"
                  placeholder={t('enterFullName')}
                  value={formData.user_name}
                  onChange={(e) => handleChange('user_name', e.target.value)}
                  className={`rounded-none border-0 border-b-2 ${
                    errors.user_name 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                  } shadow-sm focus:shadow-md transition-all`}
                />
                {errors.user_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.user_name}</p>
                )}
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-ink-700">
                    {t('email')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="user-email"
                    type="email"
                    autoComplete="off"
                    placeholder={t('emailPlaceholder') || 'email@example.com'}
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`rounded-none border-0 border-b-2 ${
                      errors.email 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    } shadow-sm focus:shadow-md transition-all`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-neutral-ink-700">
                    {t('phone')}
                  </Label>
                  <Input
                    id="phone"
                    name="user-phone"
                    type="tel"
                    autoComplete="off"
                    placeholder="+39 123 456 7890"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password Section (only for new users) */}
            {!isEditMode && (
              <div className="space-y-4 pt-4 border-t border-neutral-line-200">
                <h3 className="text-neutral-ink-900 font-medium">{t('password')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-neutral-ink-700">
                      {t('password')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="user-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className={`rounded-none border-0 border-b-2 ${
                        errors.password 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                      } shadow-sm focus:shadow-md transition-all`}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-neutral-ink-700">
                      {t('confirmPassword')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="user-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className={`rounded-none border-0 border-b-2 ${
                        errors.confirmPassword 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                      } shadow-sm focus:shadow-md transition-all`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            

            {/* Notification Preferences Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-line-200">
              <h3 className="text-neutral-ink-900 font-medium">{t('notificationPreferences')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Notifications */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_document_notify" className="text-neutral-ink-700 cursor-pointer">
                      {t('documentNotifications')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('receiveDocumentUpdates')}</p>
                  </div>
                  <Switch
                    id="is_document_notify"
                    checked={formData.is_document_notify}
                    onCheckedChange={(checked) => handleChange('is_document_notify', checked)}
                  />
                </div>

                {/* Maintenance Notifications */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_maintenance_notify" className="text-neutral-ink-700 cursor-pointer">
                      {t('maintenanceNotifications')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('receiveMaintenanceUpdates')}</p>
                  </div>
                  <Switch
                    id="is_maintenance_notify"
                    checked={formData.is_maintenance_notify}
                    onCheckedChange={(checked) => handleChange('is_maintenance_notify', checked)}
                  />
                </div>

                {/* Chat Notifications */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_chat_notify" className="text-neutral-ink-700 cursor-pointer">
                      {t('chatNotifications')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('receiveChatUpdates')}</p>
                  </div>
                  <Switch
                    id="is_chat_notify"
                    checked={formData.is_chat_notify}
                    onCheckedChange={(checked) => handleChange('is_chat_notify', checked)}
                  />
                </div>

                {/* Support Ticket Notifications */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_support_ticket_notify" className="text-neutral-ink-700 cursor-pointer">
                      {t('supportNotifications')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('receiveSupportUpdates')}</p>
                  </div>
                  <Switch
                    id="is_support_ticket_notify"
                    checked={formData.is_support_ticket_notify}
                    onCheckedChange={(checked) => handleChange('is_support_ticket_notify', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Account Settings Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-line-200">
              <h3 className="text-neutral-ink-900 font-medium">{t('accountSettings')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password Set by Admin */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_password_set_by_admin" className="text-neutral-ink-700 cursor-pointer">
                      {t('passwordSetByAdmin')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('userMustResetPassword')}</p>
                  </div>
                  <Switch
                    id="is_password_set_by_admin"
                    checked={formData.is_password_set_by_admin}
                    onCheckedChange={(checked) => handleChange('is_password_set_by_admin', checked)}
                  />
                </div>

                {/* User Status */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="user_status" className="text-neutral-ink-700 cursor-pointer">
                      {t('accountStatus')}
                    </Label>
                    <p className="text-xs text-neutral-ink-500">{t('activeOrInactiveAccount')}</p>
                  </div>
                  <Switch
                    id="user_status"
                    checked={formData.user_status}
                    onCheckedChange={(checked) => handleChange('user_status', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-5 border-t border-neutral-line-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border-neutral-line-200 hover:bg-neutral-line-100"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 rounded-lg shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isEditMode ? t('saveChanges') : t('create')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}