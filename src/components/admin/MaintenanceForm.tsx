import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { X, Wrench, Loader2, AlertCircle, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useLanguage } from '../../utils/LanguageContext';

interface MaintenanceFormProps {
  maintenance?: any;
  onClose: () => void;
  onSave: (maintenance: any) => void;
  loading?: boolean;
}

// Mock data for dropdowns (categories remain mock for now)
const mockCategories = [
  { id: 1, name: 'HVAC' },
  { id: 2, name: 'Safety' },
  { id: 3, name: 'Mechanical' },
  { id: 4, name: 'Plumbing' },
  { id: 5, name: 'Access Control' },
  { id: 6, name: 'Cleaning' },
  { id: 7, name: 'Electrical' },
  { id: 8, name: 'Structural' },
];

const mockUsers = [
  { id: 1, name: 'Marco Rossi' },
  { id: 2, name: 'Luigi Bianchi' },
  { id: 3, name: 'Giuseppe Verdi' },
  { id: 4, name: 'Anna Romano' },
  { id: 5, name: 'Sofia Colombo' },
];

// Residence interface for API data
interface Residence {
  id: number;
  residence_name: string;
}

// Unit interface for API data
interface Unit {
  id: number;
  unit_name: string;
  residence_id: number;
}

// Frequency options - values are stored as-is, labels are translated in the UI
const frequencyOptions = [
  { value: 'Weekly', labelKey: 'weekly' },
  { value: 'Monthly', labelKey: 'monthly' },
  { value: 'Quarterly', labelKey: 'quarterly' },
  { value: 'Bi-annually', labelKey: 'biannually' },
  { value: 'Annually', labelKey: 'annually' },
];

export function MaintenanceForm({ maintenance, onClose, onSave, loading: externalLoading }: MaintenanceFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!maintenance;

  // Form state - includes item_name and item_description for creating new items
  const [formData, setFormData] = useState({
    maintenance_title: '',
    maintenance_note: '',
    category_id: '',
    // New fields for creating maintenance item
    item_name: '',
    item_description: '',
    maintenance_frequency: '',
    due_date: '',
    residence_id: '',
    unit_id: '',
    assigned_user_id: '',
  });

  // Dropdown data
  const [categories] = useState(mockCategories);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users] = useState(mockUsers);

  // Internal loading state for the 2-step API flow
  const [submitting, setSubmitting] = useState(false);

  // Fetch residences from API
  useEffect(() => {
    const fetchResidences = async () => {
      setLoadingResidences(true);
      try {
        const token = localStorage.getItem('casazero_token');
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('🏢 [MAINTENANCE-FORM] Fetching residences...');
        const response = await fetch('https://smarthome.attoexasolutions.com/api/residences', {
          method: 'GET',
          headers,
        });

        const data = await response.json();
        console.log('📥 [MAINTENANCE-FORM] Residences response:', data);

        if (data.status === true && Array.isArray(data.data)) {
          const residenceList = data.data.map((item: any) => ({
            id: item.id,
            residence_name: item.residence_name,
          }));
          setResidences(residenceList);
          console.log('✅ [MAINTENANCE-FORM] Loaded', residenceList.length, 'residences');
        } else {
          console.warn('⚠️ [MAINTENANCE-FORM] Invalid residences response:', data);
          setResidences([]);
        }
      } catch (error) {
        console.error('❌ [MAINTENANCE-FORM] Failed to fetch residences:', error);
        setResidences([]);
      } finally {
        setLoadingResidences(false);
      }
    };

    fetchResidences();
  }, []);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Combined loading state
  const loading = externalLoading || submitting;

  // Load maintenance data if editing
  useEffect(() => {
    if (maintenance) {
      console.log('📝 [MAINTENANCE-FORM] Loading maintenance for editing:', maintenance);
      setFormData({
        maintenance_title: maintenance.maintenance_title || '',
        maintenance_note: maintenance.maintenance_note || '',
        category_id: maintenance.category?.id?.toString() || '',
        item_name: maintenance.item?.name || '',
        item_description: maintenance.item?.description || '',
        maintenance_frequency: maintenance.maintenance_frequency || '',
        due_date: maintenance.due_date || '',
        residence_id: maintenance.residence?.id?.toString() || '',
        unit_id: maintenance.unit?.id?.toString() || '',
        assigned_user_id: maintenance.assigned_user?.id?.toString() || '',
      });
    }
  }, [maintenance]);

  // Clear units when residence changes (units can be fetched separately if needed)
  useEffect(() => {
    if (formData.residence_id) {
      // For now, clear units when residence changes
      // Units can be fetched from API in a future iteration
      setUnits([]);
      setFormData(prev => ({ ...prev, unit_id: '' }));
    } else {
      setUnits([]);
    }
  }, [formData.residence_id]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 [FORM-CHANGE] Field: ${field}, Value:`, value);
    
    // Clear unit selection when residence changes
    if (field === 'residence_id') {
      setFormData(prev => ({ 
        ...prev, 
        residence_id: value,
        unit_id: '' // Clear unit when residence changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form - matches API required fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.maintenance_title.trim()) {
      newErrors.maintenance_title = t('maintenanceTitleRequired');
    }

    if (!formData.category_id) {
      newErrors.category_id = t('categoryRequired');
    }

    // Item name is required for creating maintenance item
    if (!formData.item_name.trim()) {
      newErrors.item_name = t('itemNameRequired');
    }

    if (!formData.maintenance_frequency) {
      newErrors.maintenance_frequency = t('frequencyRequired');
    }

    if (!formData.due_date) {
      newErrors.due_date = t('dueDateRequired');
    }

    if (!formData.residence_id) {
      newErrors.residence_id = t('residenceRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get auth headers for API calls
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('casazero_token');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // STEP 1: Create Maintenance Item via API
  const createMaintenanceItem = async (): Promise<number | null> => {
    console.log('📦 [STEP 1] Creating maintenance item...');
    
    const requestBody = {
      name: formData.item_name.trim(),
      description: formData.item_description.trim() || '',
    };
    
    console.log('📤 [MAINTENANCE-ITEM] Request body:', requestBody);
    
    try {
      const response = await fetch('https://smarthome.attoexasolutions.com/api/maintenance_item/store', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] API Response:', result);
      
      if (result.status === true && result.data?.id) {
        console.log('✅ [MAINTENANCE-ITEM] Created successfully with ID:', result.data.id);
        return result.data.id;
      } else {
        // Handle validation errors
        let errorMessage = result.message || t('failedToCreateItem');
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-ITEM] Failed to create:', error);
      throw error;
    }
  };

  // STEP 2: Create Maintenance via API
  const createMaintenance = async (maintenanceItemId: number): Promise<any> => {
    console.log('🔧 [STEP 2] Creating maintenance with item ID:', maintenanceItemId);
    
    const requestBody = {
      maintenance_title: formData.maintenance_title.trim(),
      maintenance_frequency: formData.maintenance_frequency,
      maintenance_note: formData.maintenance_note.trim() || '',
      maintenance_status: 'pending',
      due_date: formData.due_date,
      last_maintenance_date: null,
      maintenance_category_id: parseInt(formData.category_id),
      maintenance_item_id: maintenanceItemId,
      residence_id: parseInt(formData.residence_id),
    };
    
    console.log('📤 [MAINTENANCE] Request body:', requestBody);
    
    try {
      const response = await fetch('https://smarthome.attoexasolutions.com/api/maintenance/store', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [MAINTENANCE] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [MAINTENANCE] Created successfully:', result.data);
        return result.data;
      } else {
        // Handle validation errors
        let errorMessage = result.message || t('failedToCreateMaintenance');
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE] Failed to create:', error);
      throw error;
    }
  };

  // Handle form submit - Complete 2-step API flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== MAINTENANCE FORM SUBMIT ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Form Data:', formData);

    if (!validateForm()) {
      console.log('❌ Validation failed:', errors);
      return;
    }

    // For edit mode, use the existing flow
    if (isEditMode) {
      const maintenanceData = {
        ...formData,
        id: maintenance?.id,
        category_id: parseInt(formData.category_id) || null,
        residence_id: formData.residence_id ? parseInt(formData.residence_id) : null,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        assigned_user_id: formData.assigned_user_id ? parseInt(formData.assigned_user_id) : null,
        category: formData.category_id ? categories.find(c => c.id === parseInt(formData.category_id)) : null,
        residence: formData.residence_id ? residences.find(r => r.id === parseInt(formData.residence_id)) : null,
        unit: formData.unit_id ? units.find(u => u.id === parseInt(formData.unit_id)) : null,
        assigned_user: formData.assigned_user_id ? users.find(u => u.id === parseInt(formData.assigned_user_id)) : null,
        maintenance_status: maintenance?.maintenance_status || 'pending',
      };
      console.log('📤 Submitting maintenance data for update:', maintenanceData);
      onSave(maintenanceData);
      return;
    }

    // Create mode - Complete 2-step API flow
    setSubmitting(true);
    
    try {
      // STEP 1: Create maintenance item first
      console.log('🚀 Starting 2-step maintenance creation flow...');
      const maintenanceItemId = await createMaintenanceItem();
      
      if (!maintenanceItemId) {
        throw new Error(t('failedToCreateItem'));
      }
      
      // STEP 2: Create maintenance using the new item ID
      const createdMaintenance = await createMaintenance(maintenanceItemId);
      
      // Success!
      console.log('🎉 Maintenance creation completed successfully!');
      toast.success(t('success'), {
        description: t('maintenanceCreatedSuccess'),
      });
      
      // Notify parent to refresh list and close dialog
      onSave({
        ...createdMaintenance,
        _created: true, // Flag to indicate successful creation
      });
      
    } catch (error) {
      console.error('❌ [FORM-SUBMIT] Error in creation flow:', error);
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToCreateMaintenance'),
      });
      
      // Keep form open and preserve user input
      // Do NOT call onSave or onClose
    } finally {
      setSubmitting(false);
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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8 rounded-3xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-neutral-ink-900 mb-1">
                {isEditMode ? t('editMaintenance') : t('createMaintenance')}
              </h2>
              <p className="text-sm text-neutral-ink-500">
                {isEditMode ? t('updateMaintenanceInfo') : t('addNewMaintenance')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full w-10 h-10 p-0 hover:bg-neutral-line-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Maintenance Title */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_title" className="text-neutral-ink-700">
                {t('maintenanceTitle')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Wrench className="w-5 h-5 text-neutral-ink-400" />
                </div>
                <Input
                  id="maintenance_title"
                  type="text"
                  value={formData.maintenance_title}
                  onChange={(e) => handleInputChange('maintenance_title', e.target.value)}
                  placeholder={t('enterMaintenanceTitle')}
                  className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div>
              {errors.maintenance_title && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.maintenance_title}</span>
                </div>
              )}
            </div>

            {/* Maintenance Note */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_note" className="text-neutral-ink-700">
                {t('maintenanceNote')}
              </Label>
              <Textarea
                id="maintenance_note"
                value={formData.maintenance_note}
                onChange={(e) => handleInputChange('maintenance_note', e.target.value)}
                placeholder={t('enterMaintenanceNote')}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[100px]"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category_id" className="text-neutral-ink-700">
                {t('category')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleInputChange('category_id', value)}
              >
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                      className="rounded-lg"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.category_id}</span>
                </div>
              )}
            </div>

            {/* Maintenance Item Name and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="item_name" className="text-neutral-ink-700">
                  {t('itemName')} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Package className="w-5 h-5 text-neutral-ink-400" />
                  </div>
                  <Input
                    id="item_name"
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => handleInputChange('item_name', e.target.value)}
                    placeholder={t('enterItemName')}
                    className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  />
                </div>
                {errors.item_name && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.item_name}</span>
                  </div>
                )}
              </div>

              {/* Item Description */}
              <div className="space-y-2">
                <Label htmlFor="item_description" className="text-neutral-ink-700">
                  {t('itemDescription')}
                </Label>
                <Input
                  id="item_description"
                  type="text"
                  value={formData.item_description}
                  onChange={(e) => handleInputChange('item_description', e.target.value)}
                  placeholder={t('enterItemDescription')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div>
            </div>

            {/* Frequency and Due Date - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="maintenance_frequency" className="text-neutral-ink-700">
                  {t('frequency')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.maintenance_frequency}
                  onValueChange={(value) => handleInputChange('maintenance_frequency', value)}
                >
                  <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectFrequency')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {frequencyOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="rounded-lg"
                      >
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.maintenance_frequency && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.maintenance_frequency}</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-neutral-ink-700">
                  {t('dueDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
                {errors.due_date && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.due_date}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Residence and Unit - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Residence */}
              <div className="space-y-2">
                <Label htmlFor="residence_id" className="text-neutral-ink-700">
                  {t('residence')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.residence_id}
                  onValueChange={(value) => handleInputChange('residence_id', value)}
                  disabled={loadingResidences}
                >
                  <SelectTrigger className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${loadingResidences ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={
                      loadingResidences 
                        ? t('loadingResidences')
                        : residences.length === 0 
                          ? t('noResidencesFound')
                          : t('selectResidence')
                    } />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {loadingResidences ? (
                      <div className="flex items-center justify-center py-4 px-2 text-sm text-neutral-ink-500">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('loading')}
                      </div>
                    ) : residences.length === 0 ? (
                      <div className="py-4 px-2 text-sm text-neutral-ink-500 text-center">
                        {t('noResidencesFound')}
                      </div>
                    ) : (
                      residences.map((residence) => (
                        <SelectItem
                          key={residence.id}
                          value={residence.id.toString()}
                          className="rounded-lg"
                        >
                          {residence.residence_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.residence_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.residence_id}</span>
                  </div>
                )}
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit_id" className="text-neutral-ink-700">
                  {t('unit')}
                </Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => handleInputChange('unit_id', value)}
                  disabled={!formData.residence_id || units.length === 0}
                >
                  <SelectTrigger className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${!formData.residence_id ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={formData.residence_id ? t('selectUnit') : t('selectResidenceFirst')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {units.length === 0 ? (
                      <div className="py-4 px-2 text-sm text-neutral-ink-500 text-center">
                        {t('noUnitsAvailable')}
                      </div>
                    ) : (
                      units.map((unit) => (
                        <SelectItem
                          key={unit.id}
                          value={unit.id.toString()}
                          className="rounded-lg"
                        >
                          {unit.unit_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned User */}
            <div className="space-y-2">
              <Label htmlFor="assigned_user_id" className="text-neutral-ink-700">
                {t('assignedTo')}
              </Label>
              <Select
                value={formData.assigned_user_id}
                onValueChange={(value) => handleInputChange('assigned_user_id', value)}
              >
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectAssignedUser')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {users.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id.toString()}
                      className="rounded-lg"
                    >
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-neutral-line-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border-neutral-line-200 hover:bg-neutral-line-100"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>{isEditMode ? t('updateMaintenance') : t('createMaintenance')}</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

