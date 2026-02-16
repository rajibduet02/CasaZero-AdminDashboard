import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Building2, MapPin, Tag, User as UserIcon, Loader2, Image, Upload } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
  id?: number;
  residence_name: string;
  residence_address: string;
  residence_type: 'Condominium' | 'Apartment' | 'House';
  residence_status: 'Completed' | 'Under Construction';
  residence_admin: number | null;
  number_of_units: string;
  residence_photo: string | null;
}

interface ResidenceFormProps {
  residence?: Residence | null;
  onClose: () => void;
  onSave: (residence: Residence) => Promise<void>;
  loading?: boolean;
}

interface User {
  id: number;
  user_name: string;
  profile_image?: string;
  role: string;
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
    residence_admin: residence?.residence_admin || null,
    number_of_units: residence?.number_of_units || '',
    residence_photo: residence?.residence_photo || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(initialLoading || false);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(residence?.residence_photo || null);

  // Update form data when residence prop changes (for edit mode)
  useEffect(() => {
    if (residence) {
      console.log('📝 [RESIDENCE-FORM] Populating form with residence data:', residence);
      setFormData({
        id: residence.id,
        residence_name: residence.residence_name || '',
        residence_address: residence.residence_address || '',
        residence_type: residence.residence_type || 'Condominium',
        residence_status: residence.residence_status || 'Completed',
        residence_admin: residence.residence_admin || null,
        number_of_units: residence.number_of_units || '',
        residence_photo: residence.residence_photo || null,
      });
      setPhotoPreview(residence.residence_photo || null);
    }
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
        const response = await fetch('https://smarthome.attoexasolutions.com/api/get_users_by_role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'admin' }),
        });

        const result = await safeJsonParse(response);
        console.log('📥 Admin Users API Response:', result);

        if (result.status && result.data) {
          setAdminUsers(result.data);
          console.log('✅ Admin users loaded successfully:', result.data.length, 'users');
        } else {
          console.error('❌ Failed to load admin users:', result);
          toast.error(t('error'), {
            description: 'Failed to load admin users',
          });
        }
      } catch (error) {
        console.error('❌ Error fetching admin users:', error);
        toast.error(t('error'), {
          description: 'Failed to load admin users',
        });
      } finally {
        setLoadingAdmins(false);
      }
    };

    fetchAdminUsers();
  }, [t]);

  const handleChange = (field: keyof Residence, value: any) => {
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📸 [IMAGE-UPLOAD] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('error'), {
          description: 'Please upload an image file only',
        });
        e.target.value = ''; // Reset input
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('error'), {
          description: 'Image size must be less than 2MB',
        });
        e.target.value = ''; // Reset input
        return;
      }

      // Create preview
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
          description: 'Failed to read image file',
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

    console.log('=== RESIDENCE FORM SUBMITTED ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Residence ID:', formData.id);
    console.log('Residence Data being sent to parent:', formData);

    try {
      await onSave(formData);
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="rounded-2xl border border-neutral-line-200 shadow-2xl bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5">
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
                      alt="Residence" 
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
              
              {/* Residence Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="residence_image" className="text-neutral-ink-700">
                  {t('residenceImage') || 'Residence Image'}
                </Label>
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="relative">
                    {photoPreview ? (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-neutral-line-200 shadow-sm group">
                        <img
                          src={photoPreview}
                          alt="Residence preview"
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
                            <span className="text-xs text-white">Remove</span>
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
                      {photoPreview ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-ink-500">
                        Maximum file size: <span className="text-neutral-ink-700">2MB</span>
                      </p>
                      <p className="text-xs text-neutral-ink-500">
                        Accepted formats: <span className="text-neutral-ink-700">JPG, PNG, GIF, WebP</span>
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

              {/* Residence Admin and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residence_admin" className="text-neutral-ink-700">
                    {t('residenceAdmin')}
                  </Label>
                  <Select
                    value={formData.residence_admin?.toString() || 'none'}
                    onValueChange={(value) =>
                      handleChange('residence_admin', value === 'none' ? null : parseInt(value))
                    }
                  >
                    <SelectTrigger 
                      className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all"
                      disabled={loadingAdmins}
                    >
                      <SelectValue placeholder={loadingAdmins ? t('loading') : 'Select an admin'} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        <span className="text-neutral-ink-500">{t('notAssigned')}</span>
                      </SelectItem>
                      {adminUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()} className="rounded-lg">
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residence_status" className="text-neutral-ink-700">
                    {t('residenceStatus')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.residence_status}
                    onValueChange={(value: 'Completed' | 'Under Construction') =>
                      handleChange('residence_status', value)
                    }
                  >
                    <SelectTrigger className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Completed" className="rounded-lg">{t('completed')}</SelectItem>
                      <SelectItem value="Under Construction" className="rounded-lg">{t('underConstruction')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-line-200">
              <h3 className="text-neutral-ink-900 font-medium">Location Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="residence_address" className="text-neutral-ink-700">
                  {t('address')} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="residence_address"
                  placeholder="Enter complete address"
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