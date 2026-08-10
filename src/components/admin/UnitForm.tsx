import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Home, Building2, Loader2, User, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectViewport,
} from '../ui/app-select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, fetchResidencesCatalog, safeJsonParse,
  apiFetch,
} from '../../utils/api';

interface Residence {
  id: number;
  residence_name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
  role: string;
}

interface Unit {
  id?: number;
  residence_id: number;
  unit_name: string;
  unit_description: string;
  user_id?: number | null;
}

interface UnitFormProps {
  unit?: Unit | null;
  onClose: () => void;
  onSave: (unit: Unit) => Promise<void>;
  loading?: boolean;
}

export function UnitForm({ unit, onClose, onSave, loading: initialLoading }: UnitFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!unit?.id;
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Unit>({
    id: unit?.id,
    residence_id: unit?.residence_id || 0,
    unit_name: unit?.unit_name || '',
    unit_description: unit?.unit_description || '',
    user_id: unit?.user_id || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(initialLoading || false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Update form data when unit prop changes (for edit mode)
  useEffect(() => {
    if (unit) {
      console.log('📝 [UNIT-FORM] Populating form with unit data:', unit);
      setFormData({
        id: unit.id,
        residence_id: unit.residence_id || 0,
        unit_name: unit.unit_name || '',
        unit_description: unit.unit_description || '',
        user_id: unit.user_id || null,
      });
    }
  }, [unit]);

  // Load residences from API
  useEffect(() => {
    const fetchResidences = async () => {
      console.log('🏢 [UNIT-FORM] Loading residences from API...');
      setLoadingResidences(true);
      
      try {
        const response = await fetchResidencesCatalog();

        const result = (await safeJsonParse(response)) as { status?: boolean; data?: unknown; message?: string };
        console.log('📥 Residences API Response:', result);

        if (result.status && result.data) {
          const data = Array.isArray(result.data) ? result.data : [];
          setResidences(data as Residence[]);
          console.log('✅ Residences loaded successfully:', data.length, 'residences');
        } else {
          console.error('❌ Failed to load residences:', result);
          toast.error(t('error'), {
            description: t('failedToLoadResidences'),
          });
        }
      } catch (error) {
        console.error('❌ Error fetching residences:', error);
        toast.error(t('error'), {
          description: t('failedToLoadResidences'),
        });
      } finally {
        setLoadingResidences(false);
      }
    };

    fetchResidences();
    fetchResidentUsers();
  }, [t]);

  // Load resident users from API
  const fetchResidentUsers = async () => {
    console.log('👥 [UNIT-FORM] Loading resident users from API...');
    setLoadingUsers(true);
    
    try {
      const token = localStorage.getItem('casazero_token');
      const response = await apiFetch(`${API_BASE}/user/get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const result = (await safeJsonParse(response)) as { status?: boolean; data?: any[]; message?: string };
      console.log('📥 [UNIT-FORM] Users API Response:', result);

      if (result.status && result.data) {
        // Filter users with role "client" (Resident)
        const residentUsers = result.data.filter((user: any) =>
          user.role === 'client' || user.role === 'Client' || user.role === 'resident' || user.role === 'Resident'
        );
        
        const formattedUsers = residentUsers.map((user: any) => ({
          id: user.id?.toString() || user.user_id?.toString() || '',
          name: user.user_name || user.name || user.username || '',
          email: user.email || '',
          profile_image: user.profile_image || '',
          role: user.role || 'client',
        }));
        
        setUsers(formattedUsers);
        console.log('✅ [UNIT-FORM] Resident users loaded successfully:', formattedUsers.length, 'users');
      } else {
        console.error('❌ [UNIT-FORM] Failed to load users:', result);
        toast.error(t('error'), {
          description: t('failedToLoadUsers'),
        });
      }
    } catch (error) {
      console.error('❌ [UNIT-FORM] Error fetching users:', error);
      toast.error(t('error'), {
        description: t('failedToLoadUsers'),
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (field: keyof Unit, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    console.log('=== FORM VALIDATION STARTED ===');
    console.log('Form Data:', formData);
    
    const newErrors: Record<string, string> = {};

    if (!formData.unit_name.trim()) {
      newErrors.unit_name = t('nameRequired');
      console.error('❌ Validation Error: unit_name is empty');
    }

    if (!formData.residence_id || formData.residence_id === 0) {
      newErrors.residence_id = t('residenceRequired');
      console.error('❌ Validation Error: residence_id is not selected');
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

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Let parent handle error (e.g. toast). Form stays open so user can fix and retry.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div ref={modalContainerRef} className="w-full h-full flex flex-col min-h-0 max-h-[90vh]">
        <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
            <div>
              <h2 className="text-neutral-ink-900 font-medium">
                {isEditMode ? t('editUnit') : t('addUnit')}
              </h2>
              <p className="text-sm text-neutral-ink-500 mt-0.5">
                {isEditMode ? t('updateUnitInfo') : t('createNewUnit')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg w-9 h-9 p-0 hover:bg-neutral-line-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form - scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">{t('basicInformation')}</h3>
              
              {/* Unit Name */}
              <div className="space-y-2">
                <Label htmlFor="unit_name" className="text-neutral-ink-700">
                  {t('unitName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit_name"
                  type="text"
                  placeholder={t('enterUnitName')}
                  value={formData.unit_name}
                  onChange={(e) => handleChange('unit_name', e.target.value)}
                  className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${
                    errors.unit_name ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
                {errors.unit_name && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.unit_name}</span>
                  </div>
                )}
              </div>

              {/* Residence Selection */}
              <div className="space-y-2">
                <Label htmlFor="residence_id" className="text-neutral-ink-700">
                  {t('residence')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.residence_id != null && formData.residence_id !== 0 ? String(formData.residence_id) : ''}
                  onValueChange={(value) => handleChange('residence_id', value === '' ? 0 : parseInt(value))}
                  disabled={loadingResidences}
                >
                  <AppSelectTrigger
                    id="residence_id"
                    className={errors.residence_id ? 'border-red-500 focus:border-red-500' : undefined}
                    disabled={loadingResidences}
                  >
                    <AppSelectValue
                      placeholder={
                        loadingResidences
                          ? (t('loading') || 'Loading...')
                          : residences.length === 0
                            ? (t('noBuildings') || 'No residences')
                            : t('selectResidence') || 'Select a residence'
                      }
                    />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectViewport>
                      <AppSelectItem value="" className="rounded-lg text-neutral-ink-400">
                        {t('selectResidence') || 'Select a residence'}
                      </AppSelectItem>
                      {residences.map((residence) => (
                        <AppSelectItem key={residence.id} value={residence.id.toString()} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#6A8F7B]" />
                            <span>{residence.residence_name}</span>
                          </div>
                        </AppSelectItem>
                      ))}
                    </AppSelectViewport>
                  </AppSelectContent>
                </AppSelect>
                {errors.residence_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.residence_id}</span>
                  </div>
                )}
              </div>

              {/* Assigned To (User/Resident) Selection */}
              <div className="space-y-2">
                <Label htmlFor="user_id" className="text-neutral-ink-700">
                  {t('assignedTo') || 'Assigned To'} <span className="text-neutral-ink-400">({t('optional')})</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.user_id != null ? String(formData.user_id) : ''}
                  onValueChange={(value) => handleChange('user_id', value === '' ? null : parseInt(value))}
                  disabled={loadingUsers}
                >
                  <AppSelectTrigger
                    id="user_id"
                    className={errors.user_id ? 'border-red-500 focus:border-red-500' : undefined}
                    disabled={loadingUsers}
                  >
                    <AppSelectValue
                      placeholder={
                        loadingUsers
                          ? (t('loading') || 'Loading...')
                          : users.length === 0
                            ? t('noResidents')
                            : t('selectResident')
                      }
                    />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectViewport>
                      <AppSelectItem value="" className="rounded-lg">
                        <span className="text-neutral-ink-400">{t('notAssigned')}</span>
                      </AppSelectItem>
                      {users.map((user) => (
                        <AppSelectItem key={user.id} value={user.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#6A8F7B]" />
                            <span>{user.name}</span>
                            {user.email && (
                              <span className="text-xs text-neutral-ink-400 truncate">({user.email})</span>
                            )}
                          </div>
                        </AppSelectItem>
                      ))}
                    </AppSelectViewport>
                  </AppSelectContent>
                </AppSelect>
                {errors.user_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.user_id}</span>
                  </div>
                )}
              </div>

              {/* Unit Description */}
              <div className="space-y-2">
                <Label htmlFor="unit_description" className="text-neutral-ink-700">
                  {t('description')} <span className="text-neutral-ink-400">({t('optional')})</span>
                </Label>
                <Textarea
                  id="unit_description"
                  placeholder={t('enterUnitDescription')}
                  value={formData.unit_description}
                  onChange={(e) => handleChange('unit_description', e.target.value)}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[100px]"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-5 border-t border-neutral-line-200 shrink-0">
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
                    {isEditMode ? t('saveChanges') : t('create')}
                  </>
                )}
              </Button>
            </div>
          </form>
          </div>
        </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
