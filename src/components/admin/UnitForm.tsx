import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Home, Building2, Loader2, User, ChevronDown, Check } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';

// Helper function to safely parse JSON responses
const safeJsonParse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  
  console.log('📄 Response Content-Type:', contentType);
  console.log('📄 Response Status:', response.status, response.statusText);
  
  // Check if response is HTML (error page)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error('❌ Server returned HTML instead of JSON. Response preview:', text.substring(0, 200));
    throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
  }
  
  // Check if response is empty
  if (!text || text.trim() === '') {
    console.error('❌ Server returned empty response');
    throw new Error('Server returned empty response');
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('❌ Failed to parse JSON. Response text:', text.substring(0, 200));
    throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

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
  const [openUserPopover, setOpenUserPopover] = useState(false);

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
        const response = await fetch('https://smarthome.attoexasolutions.com/api/residences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await safeJsonParse(response);
        console.log('📥 Residences API Response:', result);

        if (result.status && result.data) {
          setResidences(result.data);
          console.log('✅ Residences loaded successfully:', result.data.length, 'residences');
        } else {
          console.error('❌ Failed to load residences:', result);
          toast.error(t('error'), {
            description: 'Failed to load residences',
          });
        }
      } catch (error) {
        console.error('❌ Error fetching residences:', error);
        toast.error(t('error'), {
          description: 'Failed to load residences',
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
      const response = await fetch('https://smarthome.attoexasolutions.com/api/user/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const result = await safeJsonParse(response);
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
          description: 'Failed to load users',
        });
      }
    } catch (error) {
      console.error('❌ [UNIT-FORM] Error fetching users:', error);
      toast.error(t('error'), {
        description: 'Failed to load users',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (field: keyof Unit, value: any) => {
    console.log(`[FORM-CHANGE] Field: ${field}, Value:`, value, 'Type:', typeof value);
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
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
      newErrors.residence_id = 'Residence is required';
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

    console.log('=== UNIT FORM SUBMITTED ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Unit ID:', formData.id);
    console.log('Unit Data being sent to parent:', formData);

    await onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="rounded-2xl border border-neutral-line-200 shadow-2xl bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center border-2 border-white shadow-lg">
                <Home className="w-7 h-7 text-white" />
              </div>
              
              <div>
                <h2 className="text-neutral-ink-900">
                  {isEditMode ? 'Edit Unit' : t('addUnit')}
                </h2>
                <p className="text-sm text-neutral-ink-500">
                  {isEditMode ? 'Update unit information' : 'Create a new unit'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg hover:bg-neutral-line-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">Basic Information</h3>
              
              {/* Unit Name */}
              <div className="space-y-2">
                <Label htmlFor="unit_name" className="text-neutral-ink-700">
                  Unit Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit_name"
                  type="text"
                  placeholder="Enter unit name (e.g., Unit A1)"
                  value={formData.unit_name}
                  onChange={(e) => handleChange('unit_name', e.target.value)}
                  className={`rounded-none border-0 border-b-2 ${
                    errors.unit_name 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                  } shadow-sm focus:shadow-md transition-all`}
                />
                {errors.unit_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.unit_name}</p>
                )}
              </div>

              {/* Residence Selection */}
              <div className="space-y-2">
                <Label htmlFor="residence_id" className="text-neutral-ink-700">
                  {t('residence')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  value={formData.residence_id?.toString() || '0'}
                  onValueChange={(value) =>
                    handleChange('residence_id', parseInt(value))
                  }
                >
                  <AppSelectTrigger
                    className={errors.residence_id ? 'border-red-500 focus:border-red-500' : undefined}
                    disabled={loadingResidences}
                  >
                    <AppSelectValue placeholder={loadingResidences ? t('loading') : 'Select a residence'} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="0" className="rounded-lg" disabled>
                      <span className="text-neutral-ink-400">Select a residence</span>
                    </AppSelectItem>
                    {residences.map((residence) => (
                      <AppSelectItem key={residence.id} value={residence.id.toString()} className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#6A8F7B]" />
                          <span>{residence.residence_name}</span>
                        </div>
                      </AppSelectItem>
                    ))}
                  </AppSelectContent>
                </AppSelect>
                {errors.residence_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.residence_id}</p>
                )}
              </div>

              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user_id" className="text-neutral-ink-700">
                  {t('assignedTo') || 'Assigned To'} <span className="text-neutral-ink-400">({t('optional')})</span>
                </Label>
                <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUserPopover}
                      disabled={loadingUsers}
                      className={`w-full justify-between rounded-none border-0 border-b-2 ${
                        'border-neutral-line-200 focus:border-[#6A8F7B]'
                      } shadow-sm focus:shadow-md transition-all h-auto py-2`}
                    >
                      <span className="text-neutral-ink-600 truncate">
                        {formData.user_id
                          ? users.find((u) => u.id === formData.user_id?.toString())?.name || 'Select a resident'
                          : 'Select a resident'}
                      </span>
                      {loadingUsers ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search residents..." 
                        className="h-9" 
                      />
                      <CommandList>
                        <CommandEmpty>
                          {loadingUsers ? 'Loading users...' : 'No resident found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="not-assigned"
                            onSelect={() => {
                              handleChange('user_id', null);
                              setOpenUserPopover(false);
                            }}
                            className="cursor-pointer rounded-lg"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                !formData.user_id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span className="text-neutral-ink-400">Not assigned</span>
                          </CommandItem>
                          {users.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email || ''}`}
                              onSelect={() => {
                                handleChange('user_id', parseInt(user.id));
                                setOpenUserPopover(false);
                              }}
                              className="cursor-pointer rounded-lg"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.user_id?.toString() === user.id ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#6A8F7B]" />
                                <span>{user.name}</span>
                                {user.email && (
                                  <span className="text-xs text-neutral-ink-400">({user.email})</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Unit Description */}
              <div className="space-y-2">
                <Label htmlFor="unit_description" className="text-neutral-ink-700">
                  {t('description')} <span className="text-neutral-ink-400">({t('optional')})</span>
                </Label>
                <Textarea
                  id="unit_description"
                  placeholder="Enter unit description or notes"
                  value={formData.unit_description}
                  onChange={(e) => handleChange('unit_description', e.target.value)}
                  className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all min-h-[100px]"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-line-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border-neutral-line-200 hover:bg-neutral-line-100"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Unit' : 'Create Unit'}
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
