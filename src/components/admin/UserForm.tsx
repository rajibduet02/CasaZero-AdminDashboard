import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Save, User as UserIcon, Upload, Camera, Loader2 } from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { API_BASE } from '../../utils/api';
import {
  RoleSelect,
  ResidenceSelect,
  UnitSelect,
  normalizeUserFormRole,
  getAssignmentVisibility,
  buildAssignmentPayload,
  type UserFormRole,
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
}

export function UserForm({ user, onClose, onSave, loading }: UserFormProps) {
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Cascading dropdown state for Residence and Units
  const [residences, setResidences] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedResidenceId, setSelectedResidenceId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [pendingResidenceSelection, setPendingResidenceSelection] = useState<string | null>(null);
  const [pendingUnitSelection, setPendingUnitSelection] = useState<string | null>(null);

  // Fetch residences on component mount (only if not in edit mode)
  useEffect(() => {
    // Skip fetching all residences if we're in edit mode (will be loaded from user details)
    if (isEditMode && user?.id) {
      console.log('⏸️ [RESIDENCES] Skipping initial fetch - will load from user details');
      return;
    }

    const fetchResidences = async () => {
      setLoadingResidences(true);
      console.log('🏢 [RESIDENCES] Fetching residences...');

      try {
        const response = await fetch(`${API_BASE}/residences`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📥 [RESIDENCES] API Response:', result);

        if (result.status && result.data && Array.isArray(result.data)) {
          console.log('✅ [RESIDENCES] Loaded', result.data.length, 'residences');
          setResidences(result.data);
        } else {
          console.warn('⚠️ [RESIDENCES] No residences found');
          setResidences([]);
        }
      } catch (error) {
        console.error('❌ [RESIDENCES] Error fetching residences:', error);
        setResidences([]);
      } finally {
        setLoadingResidences(false);
      }
    };

    fetchResidences();
  }, [isEditMode, user?.id]);

  // Fetch units only for residents with a residence (admins never load the unit list here)
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

      setLoadingUnits(true);

      try {
        const requestBody = { residence_id: parseInt(selectedResidenceId, 10) };
        const response = await fetch(`${API_BASE}/unit_by_residence`, {
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

        const result = await response.json();

        if (result.status && result.units && Array.isArray(result.units)) {
          const normalizedUnits = result.units.map((unit: any) => ({
            id: unit.id,
            name: unit.unit_name || unit.name || '',
            unit_name: unit.unit_name || unit.name || '',
          }));
          setUnits(normalizedUnits);
        } else {
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
  }, [selectedResidenceId, isLoadingUserDetails, formData.role, pendingResidenceSelection]);

  // Apply pending residence selection after residences are loaded
  useEffect(() => {
    if (pendingResidenceSelection && residences.length > 0) {
      // Verify the residence exists in the list
      const residenceExists = residences.some(r => r.id.toString() === pendingResidenceSelection);
      if (residenceExists) {
        setSelectedResidenceId(pendingResidenceSelection);
        console.log('✅ [RESIDENCES] Applied pending residence selection:', pendingResidenceSelection);
      } else {
        console.warn('⚠️ [RESIDENCES] Pending residence ID not found in list:', pendingResidenceSelection);
      }
      setPendingResidenceSelection(null);
    }
  }, [pendingResidenceSelection, residences]);

  // Apply pending unit selection after units are loaded
  useEffect(() => {
    if (pendingUnitSelection && units.length > 0) {
      // Verify the unit exists in the list
      const unitExists = units.some(u => u.id.toString() === pendingUnitSelection);
      if (unitExists) {
        setSelectedUnitId(pendingUnitSelection);
        console.log('✅ [UNITS] Applied pending unit selection:', pendingUnitSelection);
      } else {
        console.warn('⚠️ [UNITS] Pending unit ID not found in list:', pendingUnitSelection);
      }
      setPendingUnitSelection(null);
    }
  }, [pendingUnitSelection, units]);

  const fetchUserDetails = useCallback(async (userId: string) => {
    setFetchingUser(true);
    setIsLoadingUserDetails(true);

    try {
      const apiUrl = `${API_BASE}/single/user/${userId}`;
      
      console.log('=== API REQUEST (Fetch User) ===');
      console.log('URL:', apiUrl);
      console.log('Method:', 'GET');

      const response = await fetch(apiUrl);

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

        // Super admin: no residence/unit scope in the form
        if (loadedRole === 'super_admin') {
          setResidences([]);
          setUnits([]);
          setSelectedResidenceId('');
          setSelectedUnitId('');
          setPendingResidenceSelection(null);
          setPendingUnitSelection(null);
        } else if (data.residences && Array.isArray(data.residences) && data.residences.length > 0) {
          let residenceIdToSelect: string | null = null;
          if (data.user.residence_id) {
            residenceIdToSelect = data.user.residence_id.toString();
          } else {
            residenceIdToSelect = data.residences[0].id.toString();
          }
          setResidences(data.residences);
          setPendingResidenceSelection(residenceIdToSelect);
        } else {
          console.warn('⚠️ [RESIDENCES] No residences in API response');
        }

        // Only residents use the unit dropdown; seed list from API while loading user details
        if (loadedRole === 'resident' && data.units && Array.isArray(data.units) && data.units.length > 0) {
          const normalizedUnits = data.units.map((unit: any) => ({
            id: unit.id,
            name: unit.unit_name || unit.name || '',
            unit_name: unit.unit_name || unit.name || '',
          }));
          setUnits(normalizedUnits);
          if (data.user.unit_id) {
            setPendingUnitSelection(data.user.unit_id.toString());
          } else {
            setSelectedUnitId('');
            setPendingUnitSelection(null);
          }
        } else {
          setUnits([]);
          setSelectedUnitId('');
          setPendingUnitSelection(null);
        }

        // Map API response to form data
        setFormData({
          user_name: data.user.user_name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          password: '',
          confirmPassword: '',
          profile_image: data.user.profile_image || '',
          two_fa_method: 'none',
          role: loadedRole,
          language: data.user.language || 'it',
          registration_date: new Date().toISOString().split('T')[0],
          is_document_notify: toBoolean(data.user.is_document_notify),
          is_maintenance_notify: toBoolean(data.user.is_maintenance_notify),
          is_chat_notify: toBoolean(data.user.is_chat_notify),
          is_support_ticket_notify: toBoolean(data.user.is_support_ticket_notify),
          is_password_set_by_admin: toBoolean(data.user.is_password_set_by_admin),
          is_two_fa_status: toBoolean(data.user.is_two_fa_status),
          user_status: toBoolean(data.user.user_status),
        });

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

        toast.error('Error', {
          description: data.message || 'Failed to load user details',
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

      toast.error('Error', {
        description: 'Failed to load user details. Please try again.',
      });
    } finally {
      setFetchingUser(false);
      setIsLoadingUserDetails(false);
    }
  }, []);

  useEffect(() => {
    if (isEditMode && user?.id) {
      fetchUserDetails(user.id);
    }
  }, [isEditMode, user?.id, fetchUserDetails]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /** Role drives which assignment fields exist — clear dependents to avoid stale IDs in the payload. */
  const handleRoleChange = useCallback((nextRole: UserFormRole) => {
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
      setPendingResidenceSelection(null);
      setPendingUnitSelection(null);
    } else if (nextRole === 'admin') {
      // Admin uses residence only; do not auto-select to avoid implicit assignment.
      setSelectedUnitId('');
      setPendingUnitSelection(null);
      setUnits([]);
    } else if (nextRole === 'resident') {
      // Resident needs both fields, selected explicitly by user.
      setSelectedResidenceId('');
      setSelectedUnitId('');
      setUnits([]);
      setPendingResidenceSelection(null);
      setPendingUnitSelection(null);
    }
  }, []);

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
      toast.error('Error', {
        description: 'Please select a valid image file',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      toast.error('Error', {
        description: 'Image size should be less than 5MB',
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

      const response = await fetch(
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
        
        toast.success('Success!', {
          description: data.message || 'Profile image uploaded successfully',
        });
        
        console.log('=== PROFILE IMAGE UPLOAD COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('❌ API ERROR: Upload failed');
        console.error('Error Message:', data.message);
        console.error('Full Error Response:', data);
        
        toast.error('Error', {
          description: data.message || 'Failed to upload profile image',
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
      
      toast.error('Error', {
        description: 'Failed to upload image. Please try again.',
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
      if (!selectedResidenceId.trim()) {
        newErrors.residence_id = t('selectResidence') || 'Please select a residence';
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
    const assignment = buildAssignmentPayload(role, selectedResidenceId, selectedUnitId);

    const userData: Partial<User> & {
      unit_id?: string;
      residence_id?: string;
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
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">

            {/* Role & Language Section */}
<div className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 border border-[#6A8F7B]/20">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68]"></div>
    <h3 className="text-neutral-ink-900 font-medium">Role & Language</h3>
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
      required
    />

    {/* Language Toggle */}
    <div className="space-y-2">
      <Label className="text-neutral-ink-700">
        Language <span className="text-red-500">*</span>
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
                  <h3 className="text-neutral-ink-900 font-medium">Residence & Unit Assignment</h3>
                </div>

                <div
                  className={`grid gap-4 ${
                    assignmentVisibility.showUnit
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:max-w-md'
                  }`}
                >
                  {assignmentVisibility.showResidence ? (
                    <div>
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
                        required
                      />
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
                        required
                      />
                      {errors.unit_id ? (
                        <p className="text-xs text-red-500 mt-1">{errors.unit_id}</p>
                      ) : null}
                      {selectedResidenceId && units.length === 0 && !loadingUnits ? (
                        <p className="text-xs text-neutral-ink-500 italic mt-1">
                          No units found for this residence
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">Basic Information</h3>
              
              {/* User Name */}
              <div className="space-y-2">
                <Label htmlFor="user_name" className="text-neutral-ink-700">
                  {t('fullName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user_name"
                  type="text"
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
                    type="email"
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
                    type="tel"
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
                <h3 className="text-neutral-ink-900 font-medium">Password</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-neutral-ink-700">
                      {t('password')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
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
                      type="password"
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
              <h3 className="text-neutral-ink-900 font-medium">Notification Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Notifications */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_document_notify" className="text-neutral-ink-700 cursor-pointer">
                      Document Notifications
                    </Label>
                    <p className="text-xs text-neutral-ink-500">Receive document updates</p>
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
                      Maintenance Notifications
                    </Label>
                    <p className="text-xs text-neutral-ink-500">Receive maintenance updates</p>
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
                      Chat Notifications
                    </Label>
                    <p className="text-xs text-neutral-ink-500">Receive chat messages</p>
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
                      Support Ticket Notifications
                    </Label>
                    <p className="text-xs text-neutral-ink-500">Receive support updates</p>
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
              <h3 className="text-neutral-ink-900 font-medium">Account Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password Set by Admin */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-line-200 hover:border-[#6A8F7B]/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <Label htmlFor="is_password_set_by_admin" className="text-neutral-ink-700 cursor-pointer">
                      Password Set by Admin
                    </Label>
                    <p className="text-xs text-neutral-ink-500">User must reset password</p>
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
                      Account Status
                    </Label>
                    <p className="text-xs text-neutral-ink-500">Active or inactive account</p>
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