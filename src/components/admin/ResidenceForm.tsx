import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Loader2, Image, Upload, Trash2, Plus } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
} from '../ui/app-select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, safeJsonParse } from '../../utils/api';
import { fetchCompanies } from './CompanyList';

/** Matches `maintenances[]` in POST /residences/store. */
export interface ResidenceMaintenancePair {
  maintenance_id: number;
  company_id: number;
}

interface Residence {
  id?: number;
  residence_name: string;
  residence_address: string;
  residence_type: 'Condominium' | 'Apartment' | 'House';
  residence_status: 'Completed' | 'Under Construction';
  residence_admin: number | null;
  number_of_units: string;
  residence_photo: string | null;
  maintenances?: ResidenceMaintenancePair[];
}

export type ResidenceFormSavePayload = Residence;

interface ResidenceFormProps {
  residence?: Residence | null;
  onClose: () => void;
  onSave: (residence: ResidenceFormSavePayload) => Promise<void>;
  loading?: boolean;
}

interface User {
  id: number;
  user_name: string;
  profile_image?: string;
  role: string;
}

/** Row from GET /maintenance/list (same as MaintenanceList). */
interface MaintenanceListOption {
  id: number;
  maintenance_title: string;
}

function newAssignmentRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** `single_residence` uses `admin.id`; some list endpoints use `residence_admin`. */
function residenceAdminFromApiPayload(r: Residence | null | undefined): number | null {
  if (!r) return null;
  if (r.residence_admin != null) {
    const n = Number(r.residence_admin);
    return Number.isNaN(n) ? null : n;
  }
  const ext = r as unknown as { admin?: { id?: number } | null };
  if (ext.admin?.id != null) {
    const n = Number(ext.admin.id);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Map GET single_residence / nested shapes into assignment rows for the form. */
function rowsFromApiMaintenances(raw: unknown): {
  rowId: string;
  maintenanceId: number | null;
  companyId: number | null;
}[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ rowId: newAssignmentRowId(), maintenanceId: null, companyId: null }];
  }
  const rows = (raw as Record<string, unknown>[]).map((item) => {
    const midRaw = item.maintenance_id ?? (item.maintenance as { id?: number } | undefined)?.id;
    const cidRaw = item.company_id ?? (item.company as { id?: number } | undefined)?.id;
    const maintenanceId =
      midRaw == null || midRaw === '' ? null : Number(midRaw);
    const companyId =
      cidRaw == null || cidRaw === '' ? null : Number(cidRaw);
    return {
      rowId: newAssignmentRowId(),
      maintenanceId:
        maintenanceId != null && !Number.isNaN(maintenanceId) ? maintenanceId : null,
      companyId: companyId != null && !Number.isNaN(companyId) ? companyId : null,
    };
  });
  const complete = rows.filter((r) => r.maintenanceId != null && r.companyId != null);
  if (complete.length === 0) {
    return [{ rowId: newAssignmentRowId(), maintenanceId: null, companyId: null }];
  }
  return complete;
}

/** One row from GET single_residence `maintenances` (includes titles for dropdown labels). */
interface ApiResidenceMaintenanceRow {
  maintenance_id?: unknown;
  maintenance_title?: unknown;
  company_id?: unknown;
  company_name?: unknown;
}

function mergeMaintenanceOptionsFromResidenceRows(
  prev: MaintenanceListOption[],
  rows: ApiResidenceMaintenanceRow[],
  labelForMissing: string
): MaintenanceListOption[] {
  const map = new Map<number, MaintenanceListOption>();
  for (const m of prev) {
    const id = Number(m.id);
    if (!Number.isNaN(id)) map.set(id, { id, maintenance_title: m.maintenance_title });
  }
  for (const item of rows) {
    const id =
      item.maintenance_id != null && item.maintenance_id !== ''
        ? Number(item.maintenance_id)
        : NaN;
    if (Number.isNaN(id)) continue;
    const fromApi = String(item.maintenance_title ?? '').trim();
    const existing = map.get(id);
    map.set(id, {
      id,
      maintenance_title:
        fromApi || existing?.maintenance_title || labelForMissing,
    });
  }
  return Array.from(map.values());
}

function mergeCompanyOptionsFromResidenceRows(
  prev: { id: number; name: string }[],
  rows: ApiResidenceMaintenanceRow[],
  labelForMissing: string
): { id: number; name: string }[] {
  const map = new Map<number, { id: number; name: string }>();
  for (const c of prev) {
    const id = Number(c.id);
    if (!Number.isNaN(id)) map.set(id, { id, name: c.name });
  }
  for (const item of rows) {
    const cid =
      item.company_id != null && item.company_id !== '' ? Number(item.company_id) : NaN;
    if (Number.isNaN(cid)) continue;
    const fromApi = String(item.company_name ?? '').trim();
    const existing = map.get(cid);
    map.set(cid, {
      id: cid,
      name: fromApi || existing?.name || labelForMissing,
    });
  }
  return Array.from(map.values());
}

export function ResidenceForm({ residence, onClose, onSave, loading: initialLoading }: ResidenceFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!residence?.id;

  const [formData, setFormData] = useState<Residence>({
    id: residence?.id,
    residence_name: residence?.residence_name || '',
    residence_address: residence?.residence_address || '',
    residence_type: residence?.residence_type || 'Condominium',
    residence_status: residence?.residence_status || 'Completed',
    residence_admin: residenceAdminFromApiPayload(residence ?? null),
    number_of_units: residence?.number_of_units || '',
    residence_photo: residence?.residence_photo || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(initialLoading || false);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(residence?.residence_photo || null);

  const [maintenanceListOptions, setMaintenanceListOptions] = useState<MaintenanceListOption[]>([]);
  const [loadingMaintenances, setLoadingMaintenances] = useState(false);
  /** id + company name only (from same API / mapping as CompanyList.fetchCompanies). */
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [categoryCompanyRows, setCategoryCompanyRows] = useState<
    { rowId: string; maintenanceId: number | null; companyId: number | null }[]
  >([{ rowId: newAssignmentRowId(), maintenanceId: null, companyId: null }]);

  useEffect(() => {
    setLoading(!!initialLoading);
  }, [initialLoading]);

  // Update form data when residence prop changes (for edit mode)
  useEffect(() => {
    if (residence) {
      console.log('📝 [RESIDENCE-FORM] Populating form with residence data:', residence);
      const nu = residence.number_of_units;
      setFormData({
        id: residence.id,
        residence_name: residence.residence_name || '',
        residence_address: residence.residence_address || '',
        residence_type: residence.residence_type || 'Condominium',
        residence_status: residence.residence_status || 'Completed',
        residence_admin: residenceAdminFromApiPayload(residence),
        number_of_units: nu != null && nu !== '' ? String(nu) : '',
        residence_photo: residence.residence_photo || null,
      });
      setPhotoPreview(residence.residence_photo || null);
    }
  }, [residence]);

  useEffect(() => {
    if (!residence?.id) {
      setCategoryCompanyRows([{ rowId: newAssignmentRowId(), maintenanceId: null, companyId: null }]);
      return;
    }
    const ext = residence as unknown as Record<string, unknown>;
    const raw =
      ext.maintenances ?? ext.residence_maintenances ?? ext.maintenance_assignments;
    setCategoryCompanyRows(rowsFromApiMaintenances(raw));
  }, [residence]);

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Load admin users from API
  useEffect(() => {
    const fetchAdminUsers = async () => {
      console.log('👥 [RESIDENCE-FORM] Loading admin users from API...');
      setLoadingAdmins(true);
      
      try {
        const response = await fetch(`${API_BASE}/get_users_by_role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'admin' }),
        });

        const result = (await safeJsonParse(response)) as {
          status?: boolean;
          data?: User[];
        };
        console.log('📥 Admin Users API Response:', result);

        if (result.status && result.data) {
          setAdminUsers(result.data);
          console.log('✅ Admin users loaded successfully:', result.data.length, 'users');
        } else {
          console.error('❌ Failed to load admin users:', result);
          toast.error(t('error'), {
            description: t('failedToLoadAdminUsersDesc'),
          });
        }
      } catch (error) {
        console.error('❌ Error fetching admin users:', error);
        toast.error(t('error'), {
          description: t('failedToLoadAdminUsersDesc'),
        });
      } finally {
        setLoadingAdmins(false);
      }
    };

    fetchAdminUsers();
  }, [t]);

  useEffect(() => {
    const loadMaintenancesFromList = async () => {
      setLoadingMaintenances(true);
      try {
        const token = localStorage.getItem('casazero_token');
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        console.log('📡 [RESIDENCE-FORM] Fetching maintenances from maintenance/list...');
        const response = await fetch(`${API_BASE}/maintenance/list`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await safeJsonParse(response)) as {
          status?: boolean;
          data?: { id: number; maintenance_title?: string }[];
        };

        if (data.status === true && Array.isArray(data.data)) {
          const options: MaintenanceListOption[] = data.data.map((m) => ({
            id: Number(m.id),
            maintenance_title: (m.maintenance_title ?? '').trim() || t('notApplicableShort'),
          })).filter((o) => !Number.isNaN(o.id));
          setMaintenanceListOptions(options);
          console.log('✅ [RESIDENCE-FORM] Loaded', options.length, 'maintenances for dropdown');
        } else {
          setMaintenanceListOptions([]);
        }
      } catch (error) {
        console.error('❌ [RESIDENCE-FORM] Failed to fetch maintenance list:', error);
        toast.error(t('error'), { description: t('failedToLoadMaintenancesDesc') });
        setMaintenanceListOptions([]);
      } finally {
        setLoadingMaintenances(false);
      }
    };

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const list = await fetchCompanies();
        setCompanies(
          list
            .map((c) => ({
              id: Number(c.id),
              name: (c.name ?? '').trim() || t('notApplicableShort'),
            }))
            .filter((c) => !Number.isNaN(c.id))
        );
        console.log('✅ [RESIDENCE-FORM] Loaded', list.length, 'companies (get_all/company)');
      } catch (error) {
        console.error('❌ [RESIDENCE-FORM] Failed to fetch companies:', error);
        toast.error(t('error'), { description: t('failedToLoadCompaniesDesc') });
        setCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadMaintenancesFromList();
    loadCompanies();
  }, [t]);

  // After lists load, ensure IDs from GET single_residence `maintenances` exist as Select items (Radix needs a matching item to show a label).
  useEffect(() => {
    if (!residence?.id) return;
    if (loadingMaintenances || loadingCompanies) return;

    const ext = residence as unknown as { maintenances?: ApiResidenceMaintenanceRow[] };
    const rows = ext.maintenances;
    if (!Array.isArray(rows) || rows.length === 0) return;

    const label = t('notApplicableShort');
    setMaintenanceListOptions((prev) =>
      mergeMaintenanceOptionsFromResidenceRows(prev, rows, label)
    );
    setCompanies((prev) => mergeCompanyOptionsFromResidenceRows(prev, rows, label));
  }, [residence, loadingMaintenances, loadingCompanies, t]);

  const maintenancesForRow = (rowId: string): MaintenanceListOption[] => {
    const row = categoryCompanyRows.find((r) => r.rowId === rowId);
    const selectedHere =
      row?.maintenanceId != null && !Number.isNaN(Number(row.maintenanceId))
        ? Number(row.maintenanceId)
        : null;
    return maintenanceListOptions.filter((m) => {
      const mid = Number(m.id);
      if (Number.isNaN(mid)) return false;
      if (selectedHere !== null && mid === selectedHere) return true;
      return !categoryCompanyRows.some((a) => {
        if (a.rowId === rowId) return false;
        const aid = a.maintenanceId != null ? Number(a.maintenanceId) : NaN;
        return !Number.isNaN(aid) && aid === mid;
      });
    });
  };

  const addCategoryCompanyRow = () => {
    setCategoryCompanyRows((prev) => [
      ...prev,
      { rowId: newAssignmentRowId(), maintenanceId: null, companyId: null },
    ]);
  };

  const removeCategoryCompanyRow = (rowId: string) => {
    setCategoryCompanyRows((prev) => {
      if (prev.length <= 1) {
        return [{ rowId: newAssignmentRowId(), maintenanceId: null, companyId: null }];
      }
      return prev.filter((r) => r.rowId !== rowId);
    });
  };

  const updateCategoryCompanyRow = (
    rowId: string,
    patch: Partial<{ maintenanceId: number | null; companyId: number | null }>
  ) => {
    setCategoryCompanyRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r))
    );
  };

  const handleChange = (field: keyof Residence, value: any) => {
    // Ensure residence_admin is number | null for API contract
    const normalizedValue =
      field === 'residence_admin'
        ? value === '' || value == null
          ? null
          : Number(value)
        : value;
    setFormData(prev => ({ ...prev, [field]: normalizedValue }));
    if (errors[field as string]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📸 [IMAGE-UPLOAD] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('error'), {
          description: t('imageFilesOnlyDesc'),
        });
        e.target.value = ''; // Reset input
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('error'), {
          description: t('imageMax2mbDesc'),
        });
        e.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('✅ [IMAGE-UPLOAD] File read complete, updating preview');
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        handleChange('residence_photo', base64String);
      };
      reader.onerror = () => {
        console.error('❌ [IMAGE-UPLOAD] Error reading file');
        toast.error(t('error'), {
          description: t('failedToReadImageDesc'),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    console.log('🗑️ [IMAGE-UPLOAD] Removing photo');
    setPhotoPreview(null);
    handleChange('residence_photo', null);
    
    // Reset both file inputs
    const headerInput = document.getElementById('residence_photo_header') as HTMLInputElement;
    const formInput = document.getElementById('residence_image') as HTMLInputElement;
    if (headerInput) headerInput.value = '';
    if (formInput) formInput.value = '';
  };

  const validateForm = () => {
    console.log('=== FORM VALIDATION STARTED ===');
    console.log('Form Data:', formData);
    
    const newErrors: Record<string, string> = {};

    if (!formData.residence_name.trim()) {
      newErrors.residence_name = t('nameRequired');
      console.error('❌ Validation Error: residence_name is empty');
    }

    if (!formData.residence_address.trim()) {
      newErrors.residence_address = t('buildingRequired');
      console.error('❌ Validation Error: residence_address is empty');
    }

    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    
    if (isValid) {
      console.log('✅ Form validation passed');
    } else {
      console.error('❌ Form validation failed');
      console.error('Validation Errors:', newErrors);
    }
    
    console.log('=== FORM VALIDATION ENDED ===');
    
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const partialRow = categoryCompanyRows.some(
      (r) =>
        (r.maintenanceId != null && r.companyId == null) ||
        (r.maintenanceId == null && r.companyId != null)
    );
    if (partialRow) {
      toast.error(t('error'), {
        description: t('maintenanceCompanyRowsIncompleteDesc'),
      });
      return;
    }

    const maintenancesPayload = categoryCompanyRows
      .filter((r) => r.maintenanceId != null && r.companyId != null)
      .map((r) => ({
        maintenance_id: r.maintenanceId as number,
        company_id: r.companyId as number,
      }));

    const payload: ResidenceFormSavePayload = {
      ...formData,
      ...(maintenancesPayload.length > 0 ? { maintenances: maintenancesPayload } : {}),
    };

    console.log('=== RESIDENCE FORM SUBMITTED ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Residence ID:', formData.id);
    console.log('Residence Data being sent to parent:', payload);

    // Create: wait for API success, then close (loading from parent).
    if (!isEditMode) {
      try {
        await onSave(payload);
        onClose();
      } catch {
        // Toast from parent; keep form open
      }
      return;
    }

    try {
      await onSave(payload);
      onClose();
    } catch {
      // Error handled by parent/onSave (e.g. toast); do not close dialog
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 8 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
            <div className="flex items-center gap-3">
              {/* Circular Photo Upload Icon */}
              <div className="relative group">
                <input
                  id="residence_photo_header"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('residence_photo_header')?.click()}
                  className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center hover:opacity-90 transition-all duration-300 cursor-pointer border-2 border-white shadow-lg"
                >
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt={t('residenceImageAlt')} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="w-7 h-7 text-white" />
                  )}
                  
                  {/* Upload overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </button>
                
                {/* Remove photo button - only show when photo exists */}
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div>
                <h2 className="text-neutral-ink-900">
                  {isEditMode ? t('editResidence') : t('addResidence')}
                </h2>
                <p className="text-sm text-neutral-ink-500">
                  {isEditMode ? t('updateResidence') : t('createNewResidence')}
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
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">{t('basicInformation')}</h3>
              
              {/* Residence Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="residence_image" className="text-neutral-ink-700">
                  {t('residencePhoto')}
                </Label>
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="relative">
                    {photoPreview ? (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-neutral-line-200 shadow-sm group">
                        <img
                          src={photoPreview}
                          alt={t('residencePreviewAlt')}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove overlay */}
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <X className="w-6 h-6 text-white" />
                            <span className="text-xs text-white">{t('removeImage')}</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed border-neutral-line-300 bg-neutral-line-50 flex items-center justify-center">
                        <Image className="w-12 h-12 text-neutral-ink-300" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button & Info */}
                  <div className="flex-1 space-y-2">
                    <input
                      id="residence_image"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('residence_image')?.click()}
                      className="rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] hover:bg-[#6A8F7B]/5 transition-all"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {photoPreview ? t('changeImage') : t('uploadImage')}
                    </Button>
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-ink-500">
                        {t('maxFileSizeLabel')}{' '}
                        <span className="text-neutral-ink-700">2MB</span>
                      </p>
                      <p className="text-xs text-neutral-ink-500">
                        {t('acceptedFormatsLabel')}{' '}
                        <span className="text-neutral-ink-700">{t('imageFormatsSupported')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Residence Name */}
              <div className="space-y-2">
                <Label htmlFor="residence_name" className="text-neutral-ink-700">
                  {t('residenceName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="residence_name"
                  type="text"
                  placeholder={t('enterResidenceName')}
                  value={formData.residence_name}
                  onChange={(e) => handleChange('residence_name', e.target.value)}
                  className={`rounded-none border-0 border-b-2 ${
                    errors.residence_name 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                  } shadow-sm focus:shadow-md transition-all`}
                />
                {errors.residence_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.residence_name}</p>
                )}
              </div>

              {/* Number of Units */}
              <div className="space-y-2">
                <Label htmlFor="number_of_units" className="text-neutral-ink-700">
                  {t('numberOfUnits')}
                </Label>
                <Input
                  id="number_of_units"
                  type="number"
                  placeholder={t('enterNumberOfUnits')}
                  value={formData.number_of_units}
                  onChange={(e) => handleChange('number_of_units', e.target.value)}
                  className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all"
                />
              </div>

              {/* Residence type (POST /residences/store) */}
              <div className="space-y-2">
                <Label htmlFor="residence_type" className="text-neutral-ink-700">
                  {t('residenceType')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  value={formData.residence_type}
                  onValueChange={(value: 'Condominium' | 'Apartment' | 'House') =>
                    handleChange('residence_type', value)
                  }
                >
                  <AppSelectTrigger className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all">
                    <AppSelectValue />
                  </AppSelectTrigger>
                  <AppSelectContent className="rounded-xl">
                    <AppSelectItem value="Condominium" className="rounded-lg">
                      {t('condominium')}
                    </AppSelectItem>
                    <AppSelectItem value="Apartment" className="rounded-lg">
                      {t('apartment')}
                    </AppSelectItem>
                    <AppSelectItem value="House" className="rounded-lg">
                      {t('house')}
                    </AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
              </div>

              {/* Residence Admin and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residence_admin" className="text-neutral-ink-700">
                    {t('residenceAdmin')}
                  </Label>
                  <AppSelect
                    value={formData.residence_admin?.toString() || 'none'}
                    onValueChange={(value) =>
                      handleChange('residence_admin', value === 'none' ? null : parseInt(value))
                    }
                  >
                    <AppSelectTrigger 
                      className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all"
                      disabled={loadingAdmins}
                    >
                      <AppSelectValue
                        placeholder={loadingAdmins ? t('loading') : t('selectAdminPlaceholder')}
                      />
                    </AppSelectTrigger>
                    <AppSelectContent className="rounded-xl">
                      <AppSelectItem value="none" className="rounded-lg">
                        <span className="text-neutral-ink-500">{t('notAssigned')}</span>
                      </AppSelectItem>
                      {adminUsers.map((user) => (
                        <AppSelectItem key={user.id} value={user.id.toString()} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            {user.profile_image ? (
                              <img 
                                src={user.profile_image} 
                                alt={user.user_name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center text-white text-xs">
                                {getInitials(user.user_name)}
                              </div>
                            )}
                            <span>{user.user_name}</span>
                          </div>
                        </AppSelectItem>
                      ))}
                    </AppSelectContent>
                  </AppSelect>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residence_status" className="text-neutral-ink-700">
                    {t('residenceStatus')} <span className="text-red-500">*</span>
                  </Label>
                  <AppSelect
                    value={formData.residence_status}
                    onValueChange={(value: 'Completed' | 'Under Construction') =>
                      handleChange('residence_status', value)
                    }
                  >
                    <AppSelectTrigger className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all">
                      <AppSelectValue />
                    </AppSelectTrigger>
                    <AppSelectContent className="rounded-xl">
                      <AppSelectItem value="Completed" className="rounded-lg">{t('completed')}</AppSelectItem>
                      <AppSelectItem value="Under Construction" className="rounded-lg">{t('underConstruction')}</AppSelectItem>
                    </AppSelectContent>
                  </AppSelect>
                </div>
              </div>
            </div>

            {/* Maintenance type & company: same as create — populated from API in edit mode */}
            <div className="space-y-4 pt-4 border-t border-neutral-line-200">
                <h3 className="text-neutral-ink-900 font-medium">{t('maintenanceAndCompanySection')}</h3>
                {(loadingMaintenances || loadingCompanies) && (
                  <div className="flex items-center gap-2 text-sm text-neutral-ink-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6A8F7B]" />
                    {t('loading')}
                  </div>
                )}
                <div className="space-y-4 min-w-0">
                  {categoryCompanyRows.map((row) => {
                    const typeOptions = maintenancesForRow(row.rowId);
                    const selectedMaintenance =
                      row.maintenanceId != null
                        ? maintenanceListOptions.find(
                            (m) => Number(m.id) === Number(row.maintenanceId)
                          )
                        : undefined;
                    const typeTriggerLabel =
                      row.maintenanceId == null
                        ? t('selectMaintenancePlaceholder')
                        : selectedMaintenance
                          ? selectedMaintenance.maintenance_title
                          : `${t('maintenanceIdPrefix')}${row.maintenanceId}`;
                    return (
                      <div
                        key={row.rowId}
                        className="flex flex-row flex-nowrap items-end gap-2 sm:gap-3 md:gap-4 w-full min-w-0"
                      >
                        <div className="flex-1 min-w-0 basis-0 space-y-1.5 sm:space-y-2">
                          <Label
                            className="text-neutral-ink-700 text-xs sm:text-sm block truncate"
                            title={t('maintenanceTypeLabel')}
                          >
                            {t('maintenanceTypeLabel')}
                          </Label>
                          <AppSelect
                            value={row.maintenanceId == null ? '' : String(row.maintenanceId)}
                            onValueChange={(value) =>
                              updateCategoryCompanyRow(row.rowId, {
                                maintenanceId: value === '' ? null : Number(value),
                              })
                            }
                            disabled={loadingMaintenances}
                          >
                            <AppSelectTrigger className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all w-full min-w-0 max-w-full overflow-hidden [&>span]:min-w-0">
                              <span
                                className={`min-w-0 flex-1 truncate text-left ${
                                  row.maintenanceId == null ? 'text-muted-foreground' : ''
                                }`}
                              >
                                {typeTriggerLabel}
                              </span>
                            </AppSelectTrigger>
                            <AppSelectContent className="rounded-xl max-h-[min(280px,50vh)]">
                              {typeOptions.length === 0 ? (
                                <div className="px-2 py-3 text-sm text-neutral-ink-500">
                                  {t('noMaintenancesAvailable')}
                                </div>
                              ) : (
                                typeOptions.map((m) => (
                                  <AppSelectItem
                                    key={m.id}
                                    value={String(m.id)}
                                    className="rounded-lg"
                                  >
                                    {m.maintenance_title}
                                  </AppSelectItem>
                                ))
                              )}
                            </AppSelectContent>
                          </AppSelect>
                        </div>
                        <div className="flex-1 min-w-0 basis-0 space-y-1.5 sm:space-y-2">
                          <Label
                            className="text-neutral-ink-700 text-xs sm:text-sm block truncate"
                            title={t('assignedCompanyLabel')}
                          >
                            {t('assignedCompanyLabel')}
                          </Label>
                          <AppSelect
                            value={row.companyId == null ? 'none' : String(row.companyId)}
                            onValueChange={(value) =>
                              updateCategoryCompanyRow(row.rowId, {
                                companyId: value === 'none' ? null : Number(value),
                              })
                            }
                            disabled={loadingCompanies}
                          >
                            <AppSelectTrigger className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all w-full min-w-0 max-w-full overflow-hidden">
                              <AppSelectValue placeholder={t('selectCompanyPlaceholder')} />
                            </AppSelectTrigger>
                            <AppSelectContent className="rounded-xl max-h-[min(280px,50vh)]">
                              <AppSelectItem value="none" className="rounded-lg">
                                <span className="text-neutral-ink-500">{t('notAssigned')}</span>
                              </AppSelectItem>
                              {companies.map((company) => (
                                <AppSelectItem
                                  key={company.id}
                                  value={String(company.id)}
                                  className="rounded-lg"
                                >
                                  {company.name}
                                </AppSelectItem>
                              ))}
                            </AppSelectContent>
                          </AppSelect>
                        </div>
                        <div className="shrink-0 flex items-end self-stretch pb-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeCategoryCompanyRow(row.rowId)}
                            className="border-neutral-line-200 size-9 sm:size-10"
                            aria-label={t('removeMaintenanceRowAria')}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCategoryCompanyRow}
                  className="rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] hover:bg-[#6A8F7B]/5 transition-all"
                  disabled={loadingMaintenances}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addMaintenanceType')}
                </Button>
              </div>

            {/* Address Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-line-200">
              <h3 className="text-neutral-ink-900 font-medium">{t('locationDetails')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="residence_address" className="text-neutral-ink-700">
                  {t('address')} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="residence_address"
                  placeholder={t('enterFullAddressPlaceholder')}
                  value={formData.residence_address}
                  onChange={(e) => handleChange('residence_address', e.target.value)}
                  className={`rounded-none border-0 border-b-2 ${
                    errors.residence_address 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                  } shadow-sm focus:shadow-md transition-all min-h-[100px]`}
                />
                {errors.residence_address && (
                  <p className="text-xs text-red-500 mt-1">{errors.residence_address}</p>
                )}
              </div>
            </div>

            

            {/* Form Actions */}
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
                className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-lg shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? t('updateResidence') : t('createResidence')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}