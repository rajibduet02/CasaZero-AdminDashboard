import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { API_BASE } from '../../utils/api';
import { X, Wrench, Loader2, AlertCircle, Package, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import {
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectViewport,
} from '../ui/app-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useLanguage } from '../../utils/LanguageContext';

interface MaintenanceFormProps {
  maintenance?: any;
  onClose: () => void;
  onSave: (maintenance: any) => void;
  loading?: boolean;
}

// Maintenance Category interface for API data
interface MaintenanceCategory {
  id: number;
  name_en: string;
  name_it: string;
  description_en?: string;
  description_it?: string;
}

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

// Maintenance Item interface for API data (raw API response)
interface MaintenanceItem {
  id: number;
  item_name_en: string;
  item_name_it: string;
  // Support both old format (string) and new format (object)
  frequency_en?: string;
  frequency_it?: string;
  maintenance_frequency?: {
    id: number;
    name_en: string;
    name_it: string;
  };
  maintenance_priority?: {
    id: number;
    name: string;
  };
  maintenance_category?: {
    id: number;
    name_en: string;
    name_it: string;
  };
  company?: {
    id?: number;
    name: string;
    phone: string;
  } | null;
  company_id?: number;
}

// Frequency options - values are stored as-is, labels are translated in the UI
const frequencyOptions = [
  { value: 'Weekly', labelKey: 'weekly' },
  { value: 'Monthly', labelKey: 'monthly' },
  { value: 'Quarterly', labelKey: 'quarterly' },
  { value: 'Bi-annually', labelKey: 'biannually' },
  { value: 'Annually', labelKey: 'annually' },
];

// Mock data for maintenance items (temporary - replace with API response later)
interface MockMaintenanceItem {
  id: number;
  name: string;
  category: string;
  frequency: string;
}

const MOCK_MAINTENANCE_ITEMS: MockMaintenanceItem[] = [
  {
    id: 1,
    name: 'Item A',
    category: 'Electrical system',
    frequency: 'Monthly',
  },
  {
    id: 2,
    name: 'Item B',
    category: 'Heating & air conditioning',
    frequency: 'Yearly',
  },
];

// Helper function to get maintenance item label (MANDATORY)
const getMaintenanceItemLabel = (item: MaintenanceItem | null, language: string): string => {
  if (!item) return "";

  return language === "it"
    ? item.item_name_it || item.item_name_en
    : item.item_name_en;
};

// Label resolver functions (REQUIRED)
const getItemName = (item: MaintenanceItem | null, lang: string): string => {
  if (!item) return "";
  return lang === "it" ? item.item_name_it : item.item_name_en;
};

const getItemCategoryName = (item: MaintenanceItem | null, lang: string): string => {
  if (!item || !item.maintenance_category) return "";
  return lang === "it"
    ? item.maintenance_category.name_it || item.maintenance_category.name_en || ""
    : item.maintenance_category.name_en || "";
};

const getItemFrequency = (item: MaintenanceItem | null, lang: string): string => {
  if (!item) return "";
  // Support new API format (object)
  if (item.maintenance_frequency && typeof item.maintenance_frequency === 'object') {
    return lang === "it" 
      ? item.maintenance_frequency.name_it || item.maintenance_frequency.name_en || ""
      : item.maintenance_frequency.name_en || "";
  }
  // Support old format (string) for backward compatibility
  return lang === "it" 
    ? item.frequency_it || "" 
    : item.frequency_en || "";
};

const getItemPriority = (item: MaintenanceItem | null): string => {
  if (!item || !item.maintenance_priority) return "";
  return item.maintenance_priority.name || "";
};

export function MaintenanceForm({ maintenance, onClose, onSave, loading: externalLoading }: MaintenanceFormProps) {
  const { t, language } = useLanguage();
  const isEditMode = !!maintenance;

  // Form state - standardized maintenance data model
  // Note: item_name and item_description are kept for maintenance item creation API flow
  const [formData, setFormData] = useState({
    // Standardized model fields
    id: 0,
    title: '',
    category: '',
    frequency: '',
    classification: 'N1' as 'N1' | 'N2' | 'N3',
    recommended_company: null as string | null,
    phone: null as string | null,
    due_date: '',
    status: 'in_progress' as 'in_progress' | 'completed',
    managed_by: 'administrator' as 'user' | 'administrator',
    // Fields for maintenance item creation (API requirement)
    item_id: '', // Selected item ID from dropdown
    item_name: '', // Legacy - kept for display
    item_description: '', // Legacy - kept for display
    // Bilingual fields for creating new maintenance items
    item_name_en: '',
    item_name_it: '',
    item_description_en: '',
    item_description_it: '',
    maintenance_property_id: '',
    // Legacy fields for API compatibility (mapped from standardized fields)
    maintenance_title: '',
    maintenance_note: '',
    category_id: '',
    maintenance_frequency: '',
    residence_id: '',
    unit_id: '',
    assigned_user_id: '',
  });

  // STEP 1 — Track original item state for edit mode (to detect changes)
  const [originalItem, setOriginalItem] = useState<{
    id: number | null;
    name: string;
    description: string;
  }>({
    id: null,
    name: '',
    description: '',
  });

  // Dropdown data
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users] = useState(mockUsers);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedPriorityId, setSelectedPriorityId] = useState<number | null>(null);
  const [selectedFrequencyId, setSelectedFrequencyId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  
  // Dialog states for Maintenance Item CRUD
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [itemActionLoading, setItemActionLoading] = useState(false);

  // Form state for Add/Edit Item dialogs
  const [itemFormData, setItemFormData] = useState({
    name_en: '',
    name_it: '',
    description_en: '',
    description_it: '',
    maintenance_property_id: '',
  });
  const [itemFormErrors, setItemFormErrors] = useState<Record<string, string>>({});

  // Helper function to get maintenance item name
  const getMaintenanceItemName = (item: MaintenanceItem): string => {
    return getMaintenanceItemLabel(item, language);
  };

  // Helper function to get category name based on current language
  const getCategoryName = (category: MaintenanceCategory): string => {
    return language === 'it' ? category.name_it : category.name_en;
  };

  // Internal loading state for the 2-step API flow
  const [submitting, setSubmitting] = useState(false);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const token = localStorage.getItem('casazero_token');
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('📡 [MAINTENANCE-FORM] Fetching categories...');
        const response = await fetch(`${API_BASE}/maintenance_categories/list`, {
          method: 'GET',
          headers,
        });

        const data = await response.json();
        console.log('📥 [MAINTENANCE-FORM] Categories response:', data);

        if (data.status === true && Array.isArray(data.data)) {
          setCategories(data.data);
          console.log('✅ [MAINTENANCE-FORM] Loaded', data.data.length, 'categories');
        } else {
          console.warn('⚠️ [MAINTENANCE-FORM] Invalid categories response format:', data);
          setCategories([]);
        }
      } catch (error) {
        console.error('❌ [MAINTENANCE-FORM] Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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
        const response = await fetch(`${API_BASE}/residences`, {
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

  // Reusable function to fetch maintenance items
  const fetchMaintenanceItems = async () => {
    setLoadingItems(true);
    try {
      const token = localStorage.getItem('casazero_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('📦 [MAINTENANCE-FORM] Fetching maintenance items...');
      const response = await fetch(`${API_BASE}/maintenance_item/list`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log('📥 [MAINTENANCE-FORM] Maintenance items response:', data);

      if (data.status === true && Array.isArray(data.data)) {
        // Store raw API response - do NOT transform or rename fields
        setMaintenanceItems(data.data);
        console.log('✅ [MAINTENANCE-FORM] Loaded', data.data.length, 'maintenance items');
      } else {
        console.warn('⚠️ [MAINTENANCE-FORM] Invalid maintenance items response:', data);
        setMaintenanceItems([]);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-FORM] Failed to fetch maintenance items:', error);
      setMaintenanceItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch maintenance items from API on mount
  useEffect(() => {
    fetchMaintenanceItems();
  }, []);

  // Sync selectedItemId when formData.item_id changes (e.g., when loading existing maintenance)
  useEffect(() => {
    if (formData.item_id && formData.item_id !== '__create_new__') {
      const itemId = parseInt(formData.item_id);
      if (!isNaN(itemId)) {
        setSelectedItemId(itemId);
      } else {
        setSelectedItemId(null);
      }
    } else {
      setSelectedItemId(null);
    }
  }, [formData.item_id]);

  // Sync selectedCategoryId, selectedPriorityId, selectedFrequencyId, selectedCompanyId from item when item is selected
  useEffect(() => {
    if (selectedItemId && maintenanceItems.length > 0) {
      const selectedItem = maintenanceItems.find(item => item.id === selectedItemId);
      if (selectedItem) {
        // Update category if not already set
        if (!selectedCategoryId && selectedItem.maintenance_category?.id) {
          setSelectedCategoryId(selectedItem.maintenance_category.id);
        }
        // Update priority if not already set
        if (!selectedPriorityId && selectedItem.maintenance_priority?.id) {
          setSelectedPriorityId(selectedItem.maintenance_priority.id);
          console.log('✅ [SYNC] Priority ID set from item:', selectedItem.maintenance_priority.id);
        }
        // Update frequency if not already set
        if (!selectedFrequencyId && selectedItem.maintenance_frequency?.id) {
          setSelectedFrequencyId(selectedItem.maintenance_frequency.id);
        }
        // Update company_id if not already set (check both company.id and company_id fields)
        if (!selectedCompanyId) {
          const companyId = selectedItem.company_id || selectedItem.company?.id;
          if (companyId) {
            setSelectedCompanyId(companyId);
            console.log('✅ [SYNC] Company ID set from item:', companyId);
          }
        }
      }
    }
  }, [selectedItemId, maintenanceItems, selectedCategoryId, selectedPriorityId, selectedFrequencyId, selectedCompanyId]);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Combined loading state
  const loading = externalLoading || submitting;

  // Load maintenance data if editing - ALWAYS call maintenance/show API
  useEffect(() => {
    if (maintenance && isEditMode && maintenance.id) {
      console.log('📝 [MAINTENANCE-FORM] Edit mode detected, calling maintenance/show API for ID:', maintenance.id);
      
      const fetchMaintenanceData = async () => {
        try {
          const token = localStorage.getItem('casazero_token');
          const response = await fetch(`${API_BASE}/maintenance/show`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({ id: maintenance.id }),
          });

          const result = await response.json();
          console.log('📥 [MAINTENANCE-FORM] maintenance/show API Response:', result);

          if (result.status === true && result.data) {
            console.log('✅ [MAINTENANCE-FORM] Maintenance data loaded successfully');
            const fullMaintenance = result.data;
              
              // Store original item values for change detection during update
              const itemId = fullMaintenance.item?.id || fullMaintenance.maintenance_item_id || null;
              const itemName = fullMaintenance.item?.item_name_en || fullMaintenance.item?.item_name_it || '';
              const itemDescription = '';
              
              setOriginalItem({
                id: itemId,
                name: itemName,
                description: itemDescription,
              });
              
              // Map maintenance status to new standardized status
              const mapStatus = (status: string): 'in_progress' | 'completed' => {
                if (status === 'completed') return 'completed';
                // Map all other statuses (pending, overdue, in-progress, inprogress, due, hidden) to in_progress
                return 'in_progress';
              };
              
              const maintenanceTitle = fullMaintenance.maintenance_title || '';
              const categoryId = fullMaintenance.category?.id || fullMaintenance.maintenance_category_id || null;
              let priorityId = fullMaintenance.maintenance_priority?.id || fullMaintenance.maintenance_priority_id || null;
              const frequencyId = fullMaintenance.maintenance_frequency?.id || null;
              
              // If priority is not in maintenance response, try to get it from the item
              if (!priorityId && itemId && maintenanceItems.length > 0) {
                const foundItem = maintenanceItems.find(item => item.id === itemId);
                if (foundItem?.maintenance_priority?.id) {
                  priorityId = foundItem.maintenance_priority.id;
                  console.log('📋 [EDIT-MODE] Priority ID obtained from item:', priorityId);
                }
              }
              
              // Extract frequency string (support both object and string formats)
              let maintenanceFrequency = '';
              if (typeof fullMaintenance.maintenance_frequency === 'object' && fullMaintenance.maintenance_frequency) {
                maintenanceFrequency = language === 'it' 
                  ? fullMaintenance.maintenance_frequency.name_it || fullMaintenance.maintenance_frequency.name_en || ''
                  : fullMaintenance.maintenance_frequency.name_en || '';
              } else if (typeof fullMaintenance.maintenance_frequency === 'string') {
                maintenanceFrequency = fullMaintenance.maintenance_frequency;
              }
              
              // Get language-aware category name if category exists in our list
              let categoryName = '';
              if (fullMaintenance.category) {
                categoryName = language === 'it' 
                  ? fullMaintenance.category.name_it || fullMaintenance.category.name_en || ''
                  : fullMaintenance.category.name_en || '';
              }
              if (categoryId && categories.length > 0) {
                const foundCategory = categories.find(cat => cat.id === categoryId);
                if (foundCategory) {
                  categoryName = getCategoryName(foundCategory);
                }
              }
              
              setFormData({
                // Standardized model fields
                id: fullMaintenance.id || 0,
                title: maintenanceTitle,
                category: categoryName,
                frequency: maintenanceFrequency,
                classification: (fullMaintenance as any).classification || 'N1' as 'N1' | 'N2' | 'N3',
                recommended_company: (fullMaintenance as any).recommended_company || null,
                phone: (fullMaintenance as any).phone || null,
                due_date: fullMaintenance.due_date || '',
                status: mapStatus(fullMaintenance.maintenance_status || 'pending'),
                managed_by: (fullMaintenance as any).managed_by || 'administrator' as 'user' | 'administrator',
                // Maintenance item fields
                item_id: itemId?.toString() || '',
                item_name: itemName || '',
                item_description: itemDescription || '',
                // Bilingual fields for creating new items
                item_name_en: '',
                item_name_it: '',
                item_description_en: '',
                item_description_it: '',
                maintenance_property_id: '',
                // Legacy fields for API compatibility
                maintenance_title: maintenanceTitle,
                maintenance_note: fullMaintenance.maintenance_note || '',
                category_id: categoryId?.toString() || '',
                maintenance_frequency: maintenanceFrequency,
                residence_id: fullMaintenance.residence?.id?.toString() || fullMaintenance.residence_id?.toString() || '',
                unit_id: fullMaintenance.unit?.id?.toString() || '',
                assigned_user_id: fullMaintenance.assigned_user?.id?.toString() || '',
              });
              
              // Set selected IDs for dropdowns and form state
              if (itemId) {
                setSelectedItemId(itemId);
              }
              if (categoryId) {
                setSelectedCategoryId(categoryId);
              }
              if (priorityId) {
                setSelectedPriorityId(priorityId);
                console.log('✅ [EDIT-MODE] Priority ID set:', priorityId);
              } else {
                console.warn('⚠️ [EDIT-MODE] Priority ID not found in API response or item');
              }
              if (frequencyId) {
                setSelectedFrequencyId(frequencyId);
              }
              // Sync company_id from maintenance or item
              const companyId = (fullMaintenance as any).company_id || 
                                (fullMaintenance as any).company?.id ||
                                (itemId && maintenanceItems.length > 0 ? 
                                  (maintenanceItems.find(item => item.id === itemId)?.company_id || 
                                   maintenanceItems.find(item => item.id === itemId)?.company?.id) : null);
              if (companyId) {
                setSelectedCompanyId(companyId);
                console.log('✅ [EDIT-MODE] Company ID set:', companyId);
              }
            } else {
              console.error('❌ [MAINTENANCE-FORM] Failed to load maintenance data:', result);
              toast.error(t('error') || 'Error', {
                description: result.message || t('failedToLoadMaintenance') || 'Failed to load maintenance data',
              });
            }
          } catch (error) {
            console.error('❌ [MAINTENANCE-FORM] Error loading maintenance data:', error);
            toast.error(t('error') || 'Error', {
              description: t('failedToLoadMaintenance') || 'Failed to load maintenance data',
            });
          }
        };
        
        fetchMaintenanceData();
      }
  }, [maintenance, isEditMode]);

  // Update category name when categories are loaded (for edit mode)
  useEffect(() => {
    if (isEditMode && formData.category_id && categories.length > 0) {
      const foundCategory = categories.find(cat => cat.id.toString() === formData.category_id);
      if (foundCategory) {
        setFormData(prev => ({
          ...prev,
          category: getCategoryName(foundCategory),
        }));
      }
    }
  }, [categories, isEditMode, formData.category_id, language]);

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

  // Handle input changes - sync standardized and legacy fields
  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 [FORM-CHANGE] Field: ${field}, Value:`, value);
    
    // Clear unit selection when residence changes
    if (field === 'residence_id') {
      setFormData(prev => ({ 
        ...prev, 
        residence_id: value,
        unit_id: '' // Clear unit when residence changes
      }));
      return;
    }
    
    // Update the field and sync standardized/legacy fields
    setFormData(prev => {
      const updates: any = { [field]: value };
      
      // Sync standardized fields with legacy fields for API compatibility
      if (field === 'title') {
        updates.maintenance_title = value;
      } else if (field === 'frequency') {
        updates.maintenance_frequency = value;
      } else if (field === 'category_id') {
        // When category_id changes, also update category string with language-aware name
        const selectedCategory = categories.find(cat => cat.id.toString() === value);
        if (selectedCategory) {
          updates.category = getCategoryName(selectedCategory);
        }
      } else if (field === 'maintenance_title') {
        // Also update title when legacy field changes
        updates.title = value;
      } else if (field === 'maintenance_frequency') {
        // Also update frequency when legacy field changes
        updates.frequency = value;
      } else if (field === 'item_id') {
        // When item_id is selected from dropdown
        if (value === '__create_new__') {
          // User wants to create a new item - clear any existing item selection
          updates.item_name = '';
          updates.item_description = '';
          setSelectedItemId(null);
        } else {
          // User selected an existing item
          const itemId = parseInt(value);
          if (!isNaN(itemId)) {
            setSelectedItemId(itemId);
            const selectedItem = maintenanceItems.find(item => item.id === itemId);
            if (selectedItem) {
              // Use current language version for display (but API will use ID)
              updates.item_name = getItemName(selectedItem, language);
              updates.item_description = '';
              // Clear create new item fields
              updates.item_name_en = '';
              updates.item_name_it = '';
              updates.item_description_en = '';
              updates.item_description_it = '';
              updates.maintenance_property_id = '';
            }
          } else {
            setSelectedItemId(null);
          }
        }
      }
      
      return { ...prev, ...updates };
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form - using standardized field names
  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    // Validate maintenance_title (required)
    if (!formData.maintenance_title.trim() && !formData.title.trim()) {
      newErrors.maintenance_title = t('maintenanceTitleRequired') || 'Title is required';
    }

    // Item is required (either selected from dropdown or provided as bilingual names)
    if (!formData.item_id || formData.item_id === '__create_new__') {
      if (!formData.item_name_en.trim()) {
        newErrors.item_name_en = t('itemNameEnRequired') || 'Item name (English) is required';
      }
      if (!formData.item_name_it.trim()) {
        newErrors.item_name_it = t('itemNameItRequired') || 'Item name (Italian) is required';
      }
      if (!formData.maintenance_property_id) {
        newErrors.maintenance_property_id = t('maintenancePropertyIdRequired') || 'Maintenance property ID is required';
      }
    } else {
      // If item is selected, validate that it has category, priority, and frequency
      // Use selectedItemId if available, otherwise parse from formData.item_id
      const itemIdToFind = selectedItemId || (formData.item_id ? parseInt(formData.item_id) : null);
      const selectedItem = itemIdToFind 
        ? maintenanceItems.find(item => item.id === itemIdToFind)
        : null;
      if (!selectedItem) {
        newErrors.item_id = t('itemNameRequired') || 'Selected maintenance item not found';
      } else {
        // Validate category from selected item
        if (!selectedItem.maintenance_category?.id) {
          newErrors.category_id = t('categoryRequired') || 'Maintenance item category is missing';
        }
        // Validate priority from selected item
        if (!selectedItem.maintenance_priority?.id) {
          newErrors.maintenance_priority_id = t('priorityRequired') || 'Maintenance item priority is missing';
        }
        // Validate frequency from selected item (support both old and new format)
        if (!selectedItem.maintenance_frequency?.id) {
          newErrors.maintenance_frequency_id = t('frequencyRequired') || 'Maintenance item frequency is missing';
        }
      }
    }

    // Validate residence_id (required)
    if (!formData.residence_id) {
      newErrors.residence_id = t('residenceRequired') || 'Residence is required';
    }

    // Validate selectedCategoryId (required if item is selected)
    if (formData.item_id && formData.item_id !== '__create_new__' && !selectedCategoryId) {
      newErrors.category_id = t('categoryRequired') || 'Category is required';
    }

    // Validate selectedItemId (required if item is selected)
    if (formData.item_id && formData.item_id !== '__create_new__' && !selectedItemId) {
      newErrors.item_id = t('itemNameRequired') || 'Maintenance item is required';
    }

    // Validate selectedPriorityId (required if item is selected)
    if (formData.item_id && formData.item_id !== '__create_new__' && !selectedPriorityId) {
      newErrors.maintenance_priority_id = t('priorityRequired') || 'Priority is required';
    }

    // Validate selectedFrequencyId (required if item is selected)
    if (formData.item_id && formData.item_id !== '__create_new__' && !selectedFrequencyId) {
      newErrors.maintenance_frequency_id = t('frequencyRequired') || 'Frequency is required';
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
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

  // GET: Fetch single maintenance item
  const fetchMaintenanceItem = async (itemId: number): Promise<MaintenanceItem | null> => {
    try {
      console.log('📦 [MAINTENANCE-ITEM] Fetching item ID:', itemId);
      const response = await fetch(`${API_BASE}/maintenance_item/show`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: itemId }),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] Show response:', result);

      if (result.status === true && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch maintenance item');
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-ITEM] Failed to fetch:', error);
      throw error;
    }
  };

  // UPDATE: Update maintenance item
  const updateMaintenanceItemAPI = async (itemId: number, itemData: {
    name_en: string;
    name_it: string;
    description_en?: string;
    description_it?: string;
    maintenance_property_id?: number;
  }): Promise<MaintenanceItem> => {
    try {
      console.log('📦 [MAINTENANCE-ITEM] Updating item ID:', itemId);
      const response = await fetch(`${API_BASE}/maintenance_item/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: itemId,
          name_en: itemData.name_en.trim(),
          name_it: itemData.name_it.trim(),
          description_en: itemData.description_en?.trim() || undefined,
          description_it: itemData.description_it?.trim() || undefined,
          maintenance_property_id: itemData.maintenance_property_id,
        }),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] Update response:', result);

      if (result.status === true && result.data) {
        return result.data;
      } else {
        let errorMessage = result.message || 'Failed to update maintenance item';
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-ITEM] Failed to update:', error);
      throw error;
    }
  };

  // DELETE: Delete maintenance item
  const deleteMaintenanceItemAPI = async (itemId: number): Promise<boolean> => {
    try {
      console.log('📦 [MAINTENANCE-ITEM] Deleting item ID:', itemId);
      const response = await fetch(`${API_BASE}/maintenance_item/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: itemId }),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] Delete response:', result);

      if (result.status === true) {
        return true;
      } else {
        throw new Error(result.message || 'Failed to delete maintenance item');
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-ITEM] Failed to delete:', error);
      throw error;
    }
  };

  // Handlers for Item CRUD dialogs
  const handleOpenAddItem = () => {
    setItemFormData({
      name_en: '',
      name_it: '',
      description_en: '',
      description_it: '',
      maintenance_property_id: '',
    });
    setItemFormErrors({});
    setIsAddItemOpen(true);
    // Close Select dropdown if open
    const selectTrigger = document.querySelector('[data-select-root] button');
    if (selectTrigger) {
      (selectTrigger as HTMLElement).blur();
    }
  };

  const handleOpenEditItem = async (itemId?: number) => {
    const targetItemId = itemId || (formData.item_id && formData.item_id !== '__create_new__' ? parseInt(formData.item_id) : null);
    
    if (!targetItemId) {
      toast.error(t('error') || 'Error', {
        description: t('selectItemToEdit') || 'Please select an item to edit',
      });
      return;
    }

    setItemActionLoading(true);
    try {
      const item = await fetchMaintenanceItem(targetItemId);
      if (item) {
        setEditingItem(item);
        setItemFormData({
          name_en: item.item_name_en || '',
          name_it: item.item_name_it || '',
          description_en: '', // API response doesn't include description fields
          description_it: '', // API response doesn't include description fields
          maintenance_property_id: '', // Not in current API response structure
        });
        setItemFormErrors({});
        setIsEditItemOpen(true);
        // Close Select dropdown if open
        const selectTrigger = document.querySelector('[data-select-root] button');
        if (selectTrigger) {
          (selectTrigger as HTMLElement).blur();
        }
      }
    } catch (error) {
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToLoadItem') || 'Failed to load item',
      });
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleOpenDeleteItem = (itemId?: number) => {
    const targetItemId = itemId || (formData.item_id && formData.item_id !== '__create_new__' ? parseInt(formData.item_id) : null);
    
    if (!targetItemId) {
      toast.error(t('error') || 'Error', {
        description: t('selectItemToDelete') || 'Please select an item to delete',
      });
      return;
    }
    setDeletingItemId(targetItemId);
    setIsDeleteItemOpen(true);
    // Close Select dropdown if open
    const selectTrigger = document.querySelector('[data-select-root] button');
    if (selectTrigger) {
      (selectTrigger as HTMLElement).blur();
    }
  };

  // Centralized close handlers for dialogs
  const handleCloseAddDialog = () => {
    setIsAddItemOpen(false);
    setItemFormData({
      name_en: '',
      name_it: '',
      description_en: '',
      description_it: '',
      maintenance_property_id: '',
    });
    setItemFormErrors({});
  };

  const handleCloseEditDialog = () => {
    setIsEditItemOpen(false);
    setEditingItem(null);
    setItemFormData({
      name_en: '',
      name_it: '',
      description_en: '',
      description_it: '',
      maintenance_property_id: '',
    });
    setItemFormErrors({});
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteItemOpen(false);
    setDeletingItemId(null);
  };

  const handleAddItem = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!itemFormData.name_en.trim()) {
      newErrors.name_en = t('itemNameEnRequired') || 'Item name (English) is required';
    }
    if (!itemFormData.name_it.trim()) {
      newErrors.name_it = t('itemNameItRequired') || 'Item name (Italian) is required';
    }
    if (!itemFormData.maintenance_property_id) {
      newErrors.maintenance_property_id = t('maintenancePropertyIdRequired') || 'Maintenance property ID is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setItemFormErrors(newErrors);
      return;
    }

    setItemActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/maintenance_item/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name_en: itemFormData.name_en.trim(),
          name_it: itemFormData.name_it.trim(),
          description_en: itemFormData.description_en.trim() || undefined,
          description_it: itemFormData.description_it.trim() || undefined,
          maintenance_property_id: parseInt(itemFormData.maintenance_property_id),
        }),
      });

      const result = await response.json();

      if (result.status === true && result.data?.id) {
        toast.success(t('success') || 'Success', {
          description: result.message || t('maintenanceItemCreatedSuccess') || 'Maintenance item created successfully',
        });
        
        await fetchMaintenanceItems();
        setFormData(prev => ({ ...prev, item_id: result.data.id.toString() }));
        setIsAddItemOpen(false);
        setItemFormData({
          name_en: '',
          name_it: '',
          description_en: '',
          description_it: '',
          maintenance_property_id: '',
        });
      } else {
        let errorMessage = result.message || 'Failed to create maintenance item';
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToCreateItem') || 'Failed to create item',
      });
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    // Validate
    const newErrors: Record<string, string> = {};
    if (!itemFormData.name_en.trim()) {
      newErrors.name_en = t('itemNameEnRequired') || 'Item name (English) is required';
    }
    if (!itemFormData.name_it.trim()) {
      newErrors.name_it = t('itemNameItRequired') || 'Item name (Italian) is required';
    }
    if (!itemFormData.maintenance_property_id) {
      newErrors.maintenance_property_id = t('maintenancePropertyIdRequired') || 'Maintenance property ID is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setItemFormErrors(newErrors);
      return;
    }

    setItemActionLoading(true);
    try {
      const updatedItem = await updateMaintenanceItemAPI(editingItem.id, {
        name_en: itemFormData.name_en.trim(),
        name_it: itemFormData.name_it.trim(),
        description_en: itemFormData.description_en.trim() || undefined,
        description_it: itemFormData.description_it.trim() || undefined,
        maintenance_property_id: itemFormData.maintenance_property_id ? parseInt(itemFormData.maintenance_property_id) : editingItem.maintenance_property_id,
      });

      toast.success(t('success') || 'Success', {
        description: t('maintenanceItemUpdatedSuccess') || 'Maintenance item updated successfully',
      });

      await fetchMaintenanceItems();
      setIsEditItemOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToUpdateItem') || 'Failed to update item',
      });
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;

    setItemActionLoading(true);
    try {
      await deleteMaintenanceItemAPI(deletingItemId);
      
      toast.success(t('success') || 'Success', {
        description: t('maintenanceItemDeletedSuccess') || 'Maintenance item deleted successfully',
      });

      await fetchMaintenanceItems();
      setFormData(prev => ({ ...prev, item_id: '' }));
      setIsDeleteItemOpen(false);
      setDeletingItemId(null);
    } catch (error) {
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToDeleteItem') || 'Failed to delete item',
      });
    } finally {
      setItemActionLoading(false);
    }
  };

  // STEP 1: Create Maintenance Item via API (or return existing item ID)
  const createMaintenanceItem = async (): Promise<number | null> => {
    console.log('📦 [STEP 1] Processing maintenance item...');
    
    // If item_id is selected from dropdown, use it directly
    if (formData.item_id) {
      console.log('✅ [MAINTENANCE-ITEM] Using existing item ID:', formData.item_id);
      return parseInt(formData.item_id);
    }
    
    // Otherwise, create new item with bilingual fields
    console.log('📦 [STEP 1] Creating new maintenance item...');
    
    // Validate required fields
    if (!formData.item_name_en.trim() || !formData.item_name_it.trim()) {
      throw new Error(t('itemNameRequired') || 'Item name in both languages is required');
    }
    
    if (!formData.maintenance_property_id) {
      throw new Error(t('maintenancePropertyIdRequired') || 'Maintenance property ID is required');
    }
    
    const requestBody = {
      name_en: formData.item_name_en.trim(),
      name_it: formData.item_name_it.trim(),
      description_en: formData.item_description_en.trim() || undefined,
      description_it: formData.item_description_it.trim() || undefined,
      maintenance_property_id: parseInt(formData.maintenance_property_id),
    };
    
    console.log('📤 [MAINTENANCE-ITEM] Request body:', requestBody);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance_item/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] API Response:', result);
      
      if (result.status === true && result.data?.id) {
        console.log('✅ [MAINTENANCE-ITEM] Created successfully with ID:', result.data.id);
        
        // Show success toast for item creation
        toast.success(t('success') || 'Success', {
          description: result.message || t('maintenanceItemCreatedSuccess') || 'Maintenance item created successfully',
        });
        
        // Refresh maintenance items list
        await fetchMaintenanceItems();
        
        // Auto-select the newly created item
        setFormData(prev => ({
          ...prev,
          item_id: result.data.id.toString(),
          item_name_en: '',
          item_name_it: '',
          item_description_en: '',
          item_description_it: '',
          maintenance_property_id: '',
        }));
        
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

  // Create Maintenance via API
  const createMaintenance = async (): Promise<any> => {
    console.log('🔧 [MAINTENANCE] Creating maintenance record...');
    
    // Validate required fields
    const maintenanceTitle = (formData.maintenance_title || formData.title || '').trim();
    if (!maintenanceTitle) {
      throw new Error(t('maintenanceTitleRequired') || 'Maintenance title is required');
    }
    
    if (!selectedItemId) {
      throw new Error(t('itemNameRequired') || 'Maintenance item is required');
    }
    
    if (!selectedCategoryId) {
      throw new Error(t('categoryRequired') || 'Category is required');
    }
    
    if (!selectedPriorityId) {
      throw new Error(t('priorityRequired') || 'Priority is required');
    }
    
    if (!selectedFrequencyId) {
      throw new Error(t('frequencyRequired') || 'Frequency is required');
    }
    
    if (!formData.residence_id) {
      throw new Error(t('residenceRequired') || 'Residence is required');
    }
    
    // Build request body exactly as API expects (include company_id from selected maintenance item)
    const payload: {
      maintenance_title: string;
      maintenance_note: string | null;
      maintenance_category_id: number;
      maintenance_item_id: number;
      residence_id: number;
      maintenance_priority_id: number;
      maintenance_frequency_id: number;
      company_id: number | null;
    } = {
      maintenance_title: maintenanceTitle,
      maintenance_note: formData.maintenance_note?.trim() || null,
      maintenance_category_id: selectedCategoryId,
      maintenance_item_id: selectedItemId,
      residence_id: parseInt(formData.residence_id),
      maintenance_priority_id: selectedPriorityId,
      maintenance_frequency_id: selectedFrequencyId,
      company_id: selectedCompanyId || null,
    };
    
    console.log('📤 [MAINTENANCE] Request body:', payload);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      console.log('📥 [MAINTENANCE] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [MAINTENANCE] Created successfully:', result.data);
        return result.data;
      } else {
        // Handle validation errors
        let errorMessage = result.message || t('failedToCreateMaintenance') || 'Failed to create maintenance';
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

  // UPDATE API: Update Maintenance Item (only if name/description changed)
  const updateMaintenanceItem = async (itemId: number): Promise<boolean> => {
    console.log('📦 [UPDATE-ITEM] Updating maintenance item ID:', itemId);
    
    const requestBody = {
      id: itemId,
      name: formData.item_name.trim(),
      description: formData.item_description.trim() || '',
    };
    
    console.log('📤 [UPDATE-ITEM] Request body:', requestBody);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance_item/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [UPDATE-ITEM] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [UPDATE-ITEM] Updated successfully:', result.data);
        return true;
      } else {
        // Handle validation errors
        let errorMessage = result.message || t('failedToUpdateItem');
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [UPDATE-ITEM] Failed to update:', error);
      throw error;
    }
  };

  // UPDATE API: Update Maintenance
  const updateMaintenance = async (maintenanceId: number, maintenanceItemId: number, formStatus: string): Promise<any> => {
    console.log('🔧 [UPDATE-MAINTENANCE] Updating maintenance ID:', maintenanceId);
    
    // Map standardized model to API format
    const mapStatusToApi = (status: string): string => {
      // API accepts: pending, completed, overdue, inprogress
      if (status === 'completed') return 'completed';
      if (status === 'in_progress') return 'inprogress';
      return status; // Return as-is for other statuses
    };
    
    // Validate required fields
    const maintenanceTitle = (formData.maintenance_title || formData.title || '').trim();
    if (!maintenanceTitle) {
      throw new Error(t('maintenanceTitleRequired') || 'Maintenance title is required');
    }
    
    if (!selectedItemId) {
      throw new Error(t('itemNameRequired') || 'Maintenance item is required');
    }
    
    if (!selectedCategoryId) {
      throw new Error(t('categoryRequired') || 'Category is required');
    }
    
    if (!selectedPriorityId) {
      throw new Error(t('priorityRequired') || 'Priority is required');
    }
    
    if (!formData.residence_id) {
      throw new Error(t('residenceRequired') || 'Residence is required');
    }
    
    if (!formData.due_date) {
      throw new Error(t('dueDateRequired') || 'Due date is required');
    }
    
    // Get selected item from maintenanceItems to derive frequency string
    const selectedItem = maintenanceItems.find(item => item.id === maintenanceItemId);
    if (!selectedItem) {
      throw new Error(t('itemNameRequired') || 'Selected maintenance item not found');
    }
    
    // Extract frequency string (support both old and new format)
    let frequencyString = '';
    if (selectedItem.maintenance_frequency) {
      if (typeof selectedItem.maintenance_frequency === 'object') {
        frequencyString = language === "it"
          ? selectedItem.maintenance_frequency.name_it || selectedItem.maintenance_frequency.name_en || ''
          : selectedItem.maintenance_frequency.name_en || '';
      } else {
        frequencyString = selectedItem.maintenance_frequency;
      }
    } else {
      frequencyString = language === "it"
        ? selectedItem.frequency_it || selectedItem.frequency_en || ''
        : selectedItem.frequency_en || '';
    }
    
    if (!frequencyString) {
      throw new Error(t('frequencyRequired') || 'Maintenance item frequency is missing');
    }
    
    // Build request body exactly as API expects (include company_id from selected maintenance item)
    const requestBody: {
      id: number;
      maintenance_title: string;
      maintenance_frequency: string;
      maintenance_status: string;
      due_date: string;
      last_maintenance_date: string | null;
      maintenance_category_id: number;
      maintenance_item_id: number;
      maintenance_priority_id: number;
      residence_id: number;
      maintenance_note: string | null;
      company_id: number | null;
    } = {
      id: maintenanceId,
      maintenance_title: maintenanceTitle,
      maintenance_frequency: frequencyString,
      maintenance_status: mapStatusToApi(formStatus),
      due_date: formData.due_date,
      last_maintenance_date: maintenance?.last_maintenance_date || null,
      maintenance_category_id: selectedCategoryId,
      maintenance_item_id: selectedItemId,
      maintenance_priority_id: selectedPriorityId,
      residence_id: parseInt(formData.residence_id),
      maintenance_note: formData.maintenance_note?.trim() || null,
      company_id: selectedCompanyId || null,
    };
    
    console.log('📤 [UPDATE-MAINTENANCE] Request body:', requestBody);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [UPDATE-MAINTENANCE] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [UPDATE-MAINTENANCE] Updated successfully:', result.data);
        return result.data;
      } else {
        // Handle validation errors
        let errorMessage = result.message || t('failedToUpdateMaintenance') || 'Failed to update maintenance';
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [UPDATE-MAINTENANCE] Failed to update:', error);
      throw error;
    }
  };

  // Check if maintenance item has changed (for update flow)
  const hasItemChanged = (): boolean => {
    const currentName = formData.item_name.trim();
    const currentDescription = formData.item_description.trim();
    const originalName = originalItem.name.trim();
    const originalDescription = originalItem.description.trim();
    
    const nameChanged = currentName !== originalName;
    const descriptionChanged = currentDescription !== originalDescription;
    
    console.log('🔍 [CHANGE-DETECTION] Checking if item has changed:');
    console.log('  - Original name:', originalName, '→ Current name:', currentName, '| Changed:', nameChanged);
    console.log('  - Original desc:', originalDescription, '→ Current desc:', currentDescription, '| Changed:', descriptionChanged);
    
    return nameChanged || descriptionChanged;
  };

  // Handle form submit - Complete API flow for Create and Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== MAINTENANCE FORM SUBMIT ===');
    console.log('Is Edit Mode:', isEditMode);
    console.log('Form Data:', formData);
    console.log('Original Item:', originalItem);

    const validation = validateForm();
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return;
    }

    setSubmitting(true);

    // EDIT MODE - Update flow with conditional item update
    if (isEditMode) {
      console.log('🔄 Starting maintenance UPDATE flow...');
      
      try {
        const maintenanceId = maintenance?.id;
        // Use selected item_id from dropdown if available, otherwise use original item ID
        const selectedItemId = formData.item_id ? parseInt(formData.item_id) : null;
        const maintenanceItemId = selectedItemId || originalItem.id;
        const currentStatus = maintenance?.maintenance_status || 'pending';
        
        if (!maintenanceId) {
          throw new Error('Maintenance ID is missing');
        }
        
        if (!maintenanceItemId) {
          throw new Error('Maintenance Item ID is missing');
        }
        
        console.log('📋 Update context:');
        console.log('  - Maintenance ID:', maintenanceId);
        console.log('  - Selected Item ID from dropdown:', selectedItemId);
        console.log('  - Original Item ID:', originalItem.id);
        console.log('  - Maintenance Item ID to use:', maintenanceItemId);
        console.log('  - Current Status:', currentStatus);
        
        // STEP 4 — Conditionally update maintenance item (only if changed and same item)
        // If a different item is selected from dropdown, skip item update
        const itemChanged = hasItemChanged();
        const isDifferentItem = selectedItemId && selectedItemId !== originalItem.id;
        
        if (itemChanged && !isDifferentItem) {
          console.log('📦 [CONDITIONAL] Item HAS changed (same item) - updating maintenance item...');
          
          try {
            await updateMaintenanceItem(maintenanceItemId);
            console.log('✅ [ITEM-UPDATE] Maintenance item updated successfully');
            
            toast.success(t('success'), {
              description: t('itemUpdatedSuccess'),
            });
          } catch (itemError) {
            console.error('❌ [ITEM-UPDATE] Failed to update maintenance item:', itemError);
            
            toast.error(t('error'), {
              description: itemError instanceof Error ? itemError.message : t('failedToUpdateItem'),
            });
            
            // STOP execution - do not update maintenance
            setSubmitting(false);
            return;
          }
        } else if (isDifferentItem) {
          console.log('📦 [CONDITIONAL] Different item selected from dropdown - skipping item update, using new item ID');
        } else {
          console.log('📦 [CONDITIONAL] Item has NOT changed - skipping item update');
        }
        
        // STEP 5 — Update maintenance
        console.log('🔧 [UPDATE] Updating maintenance record...');
        
        const updatedMaintenance = await updateMaintenance(maintenanceId, maintenanceItemId, formData.status);
        
        // Success!
        console.log('🎉 Maintenance update completed successfully!');
        toast.success(t('success') || 'Success', {
          description: 'Maintenance updated successfully',
        });
        
        // Refresh maintenance list by calling the list API
        try {
          const refreshResponse = await fetch(`${API_BASE}/maintenance/list`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          const refreshResult = await refreshResponse.json();
          console.log('✅ [MAINTENANCE] List refreshed:', refreshResult);
        } catch (refreshError) {
          console.error('⚠️ [MAINTENANCE] Failed to refresh list (non-critical):', refreshError);
        }
        
        // Notify parent to refresh list and close dialog
        // Include standardized model fields along with API response
        onSave({
          ...updatedMaintenance,
          // Standardized model fields
          id: updatedMaintenance.id || formData.id,
          title: formData.title,
          category: formData.category,
          frequency: formData.frequency,
          classification: formData.classification,
          recommended_company: formData.recommended_company,
          phone: formData.phone,
          due_date: formData.due_date,
          status: formData.status,
          managed_by: formData.managed_by,
          _updated: true, // Flag to indicate successful update
        });
        
      } catch (error) {
        console.error('❌ [FORM-SUBMIT] Error in update flow:', error);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : (typeof error === 'object' && error !== null && 'message' in error)
            ? String((error as any).message)
            : t('failedToUpdateMaintenance') || 'Failed to update maintenance';
        
        toast.error(t('error') || 'Error', {
          description: errorMessage,
        });
        
        // Keep form open and preserve user input
      } finally {
        setSubmitting(false);
      }
      
      return;
    }

    // CREATE MODE - Create Maintenance record
    try {
      console.log('🚀 Starting maintenance creation flow...');
      
      // If user selected "Create New Item", create the item first
      let finalItemId: string;
      if (formData.item_id === '__create_new__') {
        console.log('📦 Creating new maintenance item first...');
        const createdItemId = await createMaintenanceItem();
        if (!createdItemId) {
          throw new Error(t('failedToCreateItem') || 'Failed to create maintenance item');
        }
        finalItemId = createdItemId.toString();
        // Update formData with the newly created item ID and set selectedItemId
        setFormData(prev => ({ ...prev, item_id: finalItemId }));
        const parsedId = parseInt(finalItemId);
        if (!isNaN(parsedId)) {
          setSelectedItemId(parsedId);
          // Fetch the newly created item to get its category, priority, frequency
          const newItem = await fetchMaintenanceItem(parsedId);
          if (newItem) {
            setSelectedCategoryId(newItem.maintenance_category?.id || null);
            setSelectedPriorityId(newItem.maintenance_priority?.id || null);
            setSelectedFrequencyId(newItem.maintenance_frequency?.id || null);
            const companyId = newItem.company_id || newItem.company?.id;
            if (companyId) {
              setSelectedCompanyId(companyId);
            }
          }
        }
      } else if (formData.item_id && formData.item_id !== '__create_new__') {
        // Use existing item ID - ensure selectedItemId is set
        finalItemId = formData.item_id;
        const parsedId = parseInt(finalItemId);
        if (isNaN(parsedId)) {
          throw new Error(t('itemNameRequired') || 'Please select a maintenance item');
        }
        if (!selectedItemId) {
          setSelectedItemId(parsedId);
          const selectedItem = maintenanceItems.find(item => item.id === parsedId);
          if (selectedItem) {
            setSelectedCategoryId(selectedItem.maintenance_category?.id || null);
            setSelectedPriorityId(selectedItem.maintenance_priority?.id || null);
            setSelectedFrequencyId(selectedItem.maintenance_frequency?.id || null);
            const companyId = selectedItem.company_id || selectedItem.company?.id;
            if (companyId) {
              setSelectedCompanyId(companyId);
            }
          }
        }
      } else {
        throw new Error(t('itemNameRequired') || 'Please select a maintenance item');
      }
      
      // Create maintenance record using the correct API
      const createdMaintenance = await createMaintenance();
      
      // Success!
      console.log('🎉 Maintenance creation completed successfully!');
      toast.success(t('success') || 'Success', {
        description: 'Maintenance created successfully',
      });
      
      // Reset form fields
      setFormData({
        id: 0,
        title: '',
        category: '',
        item_id: '',
        item_name: '',
        item_description: '',
        item_name_en: '',
        item_name_it: '',
        item_description_en: '',
        item_description_it: '',
        maintenance_property_id: '',
        maintenance_title: '',
        maintenance_note: '',
        category_id: '',
        maintenance_frequency: '',
        residence_id: '',
        unit_id: '',
        assigned_user_id: '',
        classification: '',
        recommended_company: '',
        phone: '',
        due_date: '',
        status: 'in_progress',
        managed_by: '',
      });
      setSelectedItemId(null);
      setSelectedCategoryId(null);
      setSelectedPriorityId(null);
      setSelectedFrequencyId(null);
      setSelectedCompanyId(null);
      setErrors({});
      
      // Refresh maintenance list by calling the list API
      try {
        const refreshResponse = await fetch(`${API_BASE}/maintenance/list`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const refreshResult = await refreshResponse.json();
        console.log('✅ [MAINTENANCE] List refreshed:', refreshResult);
      } catch (refreshError) {
        console.error('⚠️ [MAINTENANCE] Failed to refresh list (non-critical):', refreshError);
      }
      
      // Close the form dialog and notify parent
      onSave({
        ...createdMaintenance,
        _created: true, // Flag to indicate successful creation
      });
      
    } catch (error) {
      console.error('❌ [FORM-SUBMIT] Error in creation flow:', error);
      
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToCreateMaintenance') || 'Failed to create maintenance',
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
        className="w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <div ref={modalContainerRef} className="w-full h-full flex flex-col min-h-0 max-h-[90vh]">
        <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
            <div>
              <h2 className="text-neutral-ink-900 font-medium">
                {isEditMode ? t('editMaintenance') : t('createMaintenance')}
              </h2>
              <p className="text-sm text-neutral-ink-500 mt-0.5">
                {isEditMode ? t('updateMaintenanceInfo') : t('addNewMaintenance')}
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
            {/* Maintenance Title */}
            {/* <div className="space-y-2">
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
                  value={formData.title || formData.maintenance_title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
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
            </div> */}

            {/* Residence */}
            <div className="space-y-2">
              <Label htmlFor="residence_id" className="text-neutral-ink-700">
                {t('residence')} <span className="text-red-500">*</span>
              </Label>
              <AppSelect
                containerRef={modalContainerRef}
                value={formData.residence_id != null && formData.residence_id !== '' ? String(formData.residence_id) : ''}
                onValueChange={(value) => handleInputChange('residence_id', value)}
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
                        ? t('loadingResidences')
                        : residences.length === 0
                          ? t('noResidencesFound')
                          : t('Select Residence')
                    }
                  />
                </AppSelectTrigger>
                <AppSelectContent>
                  <AppSelectViewport>
                    {residences.map((residence) => (
                      <AppSelectItem
                        key={residence.id}
                        value={String(residence.id)}
                        className="rounded-lg"
                      >
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
                <p className="text-xs text-red-500 mt-1">{errors.residence_id}</p>
              )}
            </div>

            {/* Item Name (Maintenance Title) */}
            <div className="space-y-2">
              <Label htmlFor="item_id" className="text-neutral-ink-700">
                {t('maintenanceTitle')} <span className="text-red-500">*</span>
              </Label>
              <AppSelect
                containerRef={modalContainerRef}
                value={formData.item_id != null && formData.item_id !== '' ? String(formData.item_id) : ''}
                onValueChange={(value) => {
                  if (value === '__create_new__') {
                    setSelectedItemId(null);
                    setSelectedCategoryId(null);
                    setSelectedPriorityId(null);
                    setSelectedFrequencyId(null);
                    setSelectedCompanyId(null);
                    handleInputChange('item_id', value);
                  } else {
                    const itemId = parseInt(value);
                    if (!isNaN(itemId)) {
                      setSelectedItemId(itemId);
                      handleInputChange('item_id', value);
                      const selectedItem = maintenanceItems.find(i => i.id === itemId);
                      if (selectedItem) {
                        setSelectedCategoryId(selectedItem.maintenance_category?.id || null);
                        setSelectedPriorityId(selectedItem.maintenance_priority?.id || null);
                        setSelectedFrequencyId(selectedItem.maintenance_frequency?.id || null);
                        const companyId = selectedItem.company_id || selectedItem.company?.id;
                        if (companyId) setSelectedCompanyId(companyId);
                        if (!formData.maintenance_title && !formData.title) {
                          const itemName = getItemName(selectedItem, language);
                          handleInputChange('maintenance_title', itemName);
                          handleInputChange('title', itemName);
                        }
                      }
                    } else {
                      setSelectedItemId(null);
                      setSelectedCategoryId(null);
                      setSelectedPriorityId(null);
                      setSelectedFrequencyId(null);
                      handleInputChange('item_id', value);
                    }
                  }
                }}
                disabled={loadingItems}
              >
                <AppSelectTrigger
                  id="item_id"
                  className={errors.item_id ? 'border-red-500 focus:border-red-500' : undefined}
                  disabled={loadingItems}
                >
                  <AppSelectValue
                    placeholder={
                      loadingItems
                        ? t('loading') || 'Loading items...'
                        : maintenanceItems.length === 0
                          ? t('noItemsAvailable') || 'No items available'
                          : t('selectItem') || 'Select item'
                    }
                  />
                </AppSelectTrigger>
                <AppSelectContent>
                  <AppSelectViewport>
                    {maintenanceItems.map((item) => (
                      <AppSelectItem
                        key={item.id}
                        value={String(item.id)}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#6A8F7B]" />
                          <span>{getItemName(item, language)}</span>
                        </div>
                      </AppSelectItem>
                    ))}
                  </AppSelectViewport>
                </AppSelectContent>
              </AppSelect>
              {errors.item_id && (
                <p className="text-xs text-red-500 mt-1">{errors.item_id}</p>
              )}
              {/* Display Category, Frequency, and Priority BELOW the field when item is selected */}
              {(() => {
                const selectedItem = maintenanceItems.find(i => i.id === selectedItemId);
                return selectedItem ? (
                  <div className="mt-2 text-sm text-neutral-ink-600 space-y-1">
                    {getItemCategoryName(selectedItem, language) && (
                      <div>
                        • <span className="font-medium">Category:</span>{" "}
                        {getItemCategoryName(selectedItem, language)}
                      </div>
                    )}
                    {getItemFrequency(selectedItem, language) && (
                      <div>
                        • <span className="font-medium">Frequency:</span>{" "}
                        {getItemFrequency(selectedItem, language)}
                      </div>
                    )}
                    {getItemPriority(selectedItem) && (
                      <div>
                        • <span className="font-medium">Priority:</span>{" "}
                        {getItemPriority(selectedItem)}
                      </div>
                    )}
                    {selectedItem.company?.name && (
                      <div>
                        • <span className="font-medium">Company:</span>{" "}
                        {selectedItem.company.name}
                      </div>
                    )}
                    {selectedItem.company?.phone && (
                      <div>
                        • <span className="font-medium">Phone:</span>{" "}
                        {selectedItem.company.phone}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              {errors.item_name && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.item_name}</span>
                </div>
              )}
            </div>

              {/* Create New Item Fields - Show when "Create New Item" is selected */}
              {formData.item_id === '__create_new__' && (
                <div className="col-span-2 space-y-4 p-4 bg-neutral-line-50 rounded-xl border border-neutral-line-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-[#6A8F7B]" />
                    <span className="text-sm font-medium text-neutral-ink-700">
                      {t('createNewMaintenanceItem') || 'Create New Maintenance Item'}
                    </span>
                  </div>
                  
                  {/* Item Name - Bilingual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item_name_en" className="text-neutral-ink-700">
                        {t('itemName')} (English) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="item_name_en"
                        type="text"
                        value={formData.item_name_en}
                        onChange={(e) => handleInputChange('item_name_en', e.target.value)}
                        placeholder={t('enterItemNameEn') || 'Enter item name in English'}
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                      />
                      {errors.item_name_en && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.item_name_en}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item_name_it" className="text-neutral-ink-700">
                        {t('itemName')} (Italian) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="item_name_it"
                        type="text"
                        value={formData.item_name_it}
                        onChange={(e) => handleInputChange('item_name_it', e.target.value)}
                        placeholder={t('enterItemNameIt') || 'Enter item name in Italian'}
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                      />
                      {errors.item_name_it && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.item_name_it}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Description - Bilingual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item_description_en" className="text-neutral-ink-700">
                        {t('itemDescription')} (English)
                      </Label>
                      <Textarea
                        id="item_description_en"
                        value={formData.item_description_en}
                        onChange={(e) => handleInputChange('item_description_en', e.target.value)}
                        placeholder={t('enterItemDescriptionEn') || 'Enter description in English (optional)'}
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item_description_it" className="text-neutral-ink-700">
                        {t('itemDescription')} (Italian)
                      </Label>
                      <Textarea
                        id="item_description_it"
                        value={formData.item_description_it}
                        onChange={(e) => handleInputChange('item_description_it', e.target.value)}
                        placeholder={t('enterItemDescriptionIt') || 'Enter description in Italian (optional)'}
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Maintenance Property ID */}
                  <div className="space-y-2">
                    <Label htmlFor="maintenance_property_id" className="text-neutral-ink-700">
                      {t('maintenancePropertyId') || 'Maintenance Property ID'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="maintenance_property_id"
                      type="number"
                      value={formData.maintenance_property_id}
                      onChange={(e) => handleInputChange('maintenance_property_id', e.target.value)}
                      placeholder={t('enterMaintenancePropertyId') || 'Enter maintenance property ID'}
                      className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                    />
                    {errors.maintenance_property_id && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.maintenance_property_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

            {/* Status */}
            {/* <div className="space-y-2">
                <Label htmlFor="status" className="text-neutral-ink-700">
                  {t('status') || 'Status'} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as 'in_progress' | 'completed')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectStatus') || 'Select status'} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="in_progress" className="rounded-lg">{t('inProgress') || 'In Progress'}</AppSelectItem>
                    <AppSelectItem value="completed" className="rounded-lg">{t('completed') || 'Completed'}</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
                {errors.status && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.status}</span>
                  </div>
                )}
              </div> */}


            

            {/* Maintenance Item Name and Description */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

              {/* Category */}
            {/* <div className="space-y-2">
              <Label htmlFor="category_id" className="text-neutral-ink-700">
                {t('category')} <span className="text-red-500">*</span>
              </Label>
              <AppSelect
                containerRef={modalContainerRef}
                value={formData.category_id}
                onValueChange={(value) => handleInputChange('category_id', value)}
                disabled={loadingCategories}
              >
                <AppSelectTrigger className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${loadingCategories ? 'opacity-50' : ''}`}>
                  <AppSelectValue placeholder={
                    loadingCategories 
                      ? t('loadingCategories') || 'Loading categories...'
                      : categories.length === 0 
                        ? t('noCategoriesAvailable') || 'No categories available'
                        : t('selectCategory')
                  } />
                </AppSelectTrigger>
                <AppSelectContent>
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-4 px-2 text-sm text-neutral-ink-500">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('loadingCategories') || 'Loading categories...'}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-4 px-2 text-sm text-neutral-ink-500 text-center">
                      {t('noCategoriesAvailable') || 'No categories available'}
                    </div>
                  ) : (
                    categories.map((category) => (
                      <AppSelectItem
                        key={category.id}
                        value={category.id.toString()}
                        className="rounded-lg"
                      >
                        {getCategoryName(category)}
                      </AppSelectItem>
                    ))
                  )}
                </AppSelectContent>
              </AppSelect>
              {errors.category_id && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.category_id}</span>
                </div>
              )}
            </div> */}

            {/* Maintenance Title */}
            {/* <div className="space-y-2">
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
                  value={formData.title || formData.maintenance_title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
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
            </div> */}

            


             
              {/* Item Description */}
              {/* <div className="space-y-2">
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
              </div> */}
            {/* </div>  */}

            {/* Frequency and Due Date - Side by Side */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frequency */}
              {/* <div className="space-y-2">
                <Label htmlFor="maintenance_frequency" className="text-neutral-ink-700">
                  {t('frequency')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.frequency || formData.maintenance_frequency}
                  onValueChange={(value) => handleInputChange('frequency', value)}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectFrequency')} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    {frequencyOptions.map((option) => (
                      <AppSelectItem
                        key={option.value}
                        value={option.value}
                        className="rounded-lg"
                      >
                        {t(option.labelKey)}
                      </AppSelectItem>
                    ))}
                  </AppSelectContent>
                </AppSelect>
                {errors.maintenance_frequency && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.maintenance_frequency}</span>
                  </div>
                )}
              </div> */}

              

              {/* Due Date */}
              {/* <div className="space-y-2">
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
              </div> */}
            {/* </div>  */}

            {/* Classification, Status, and Managed By - Required Fields */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Classification */}
              {/* <div className="space-y-2">
                <Label htmlFor="classification" className="text-neutral-ink-700">
                  {t('classification') || 'Classification'} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.classification}
                  onValueChange={(value) => handleInputChange('classification', value as 'N1' | 'N2' | 'N3')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectClassification') || 'Select classification'} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="N1" className="rounded-lg">N1</AppSelectItem>
                    <AppSelectItem value="N2" className="rounded-lg">N2</AppSelectItem>
                    <AppSelectItem value="N3" className="rounded-lg">N3</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
                {errors.classification && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.classification}</span>
                  </div>
                )}
              </div> */}

             

              {/* Managed By */}
              {/* <div className="space-y-2">
                <Label htmlFor="managed_by" className="text-neutral-ink-700">
                  {t('managedBy') || 'Managed By'} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.managed_by}
                  onValueChange={(value) => handleInputChange('managed_by', value as 'user' | 'administrator')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectManagedBy') || 'Select managed by'} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="user" className="rounded-lg">{t('user') || 'User'}</AppSelectItem>
                    <AppSelectItem value="administrator" className="rounded-lg">{t('administrator') || 'Administrator'}</AppSelectItem>
                  </AppSelectContent>
                </AppSelect>
                {errors.managed_by && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.managed_by}</span>
                  </div>
                )}
              </div> */}

               {/* Recommended Company */}
               {/* <div className="space-y-2">
                <Label htmlFor="recommended_company" className="text-neutral-ink-700">
                  {t('recommendedCompany') || 'Recommended Company'}
                </Label>
                <Input
                  id="recommended_company"
                  type="text"
                  value={formData.recommended_company || ''}
                  onChange={(e) => handleInputChange('recommended_company', e.target.value || null)}
                  placeholder={t('enterRecommendedCompany') || 'Enter recommended company'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div> */}

              {/* Phone */}
              {/* <div className="space-y-2">
                <Label htmlFor="phone" className="text-neutral-ink-700">
                  {t('phone') || 'Phone'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value || null)}
                  placeholder={t('enterPhone') || 'Enter phone number'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div> */}
            {/* </div> */}

            {/* Recommended Company and Phone - Optional Fields */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             
            </div> */}

            {/* Residence and Unit - Side by Side */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

              {/* Unit */}
              {/* <div className="space-y-2">
                <Label htmlFor="unit_id" className="text-neutral-ink-700">
                  {t('unit')}
                </Label>
                <AppSelect
                  value={formData.unit_id}
                  onValueChange={(value) => handleInputChange('unit_id', value)}
                  disabled={!formData.residence_id || units.length === 0}
                >
                  <AppSelectTrigger className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${!formData.residence_id ? 'opacity-50' : ''}`}>
                    <AppSelectValue placeholder={formData.residence_id ? t('selectUnit') : t('selectResidenceFirst')} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    {units.length === 0 ? (
                      <div className="py-4 px-2 text-sm text-neutral-ink-500 text-center">
                        {t('noUnitsAvailable')}
                      </div>
                    ) : (
                      units.map((unit) => (
                        <AppSelectItem
                          key={unit.id}
                          value={unit.id.toString()}
                          className="rounded-lg"
                        >
                          {unit.unit_name}
                        </AppSelectItem>
                      ))
                    )}
                  </AppSelectContent>
                </AppSelect>
              </div> */}

              {/* Assigned User */}
            {/* <div className="space-y-2">
              <Label htmlFor="assigned_user_id" className="text-neutral-ink-700">
                {t('assignedTo')}
              </Label>
              <AppSelect
                containerRef={modalContainerRef}
                value={formData.assigned_user_id}
                onValueChange={(value) => handleInputChange('assigned_user_id', value)}
              >
                <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <AppSelectValue placeholder={t('selectAssignedUser')} />
                </AppSelectTrigger>
                <AppSelectContent>
                  {users.map((user) => (
                    <AppSelectItem
                      key={user.id}
                      value={user.id.toString()}
                      className="rounded-lg"
                    >
                      {user.name}
                    </AppSelectItem>
                  ))}
                </AppSelectContent>
              </AppSelect>
            </div> */}
            {/* </div> */}

            

            {/* Action Buttons */}
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
                disabled={loading || submitting}
                className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-lg shadow-md"
              >
                {loading || submitting ? (
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
          </div>
        </Card>
        </div>
      </motion.div>

      {/* Add Maintenance Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseAddDialog();
        }
      }}>
        <DialogContent 
          className="max-w-2xl rounded-2xl"
          hideCloseButton={true}
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{t('addMaintenanceItem') || 'Add Maintenance Item'}</DialogTitle>
              <DialogDescription>
                {t('addNewMaintenanceItemDesc') || 'Create a new maintenance item that can be reused in maintenance records'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
            {/* Item Name - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-item-name-en" className="text-neutral-ink-700">
                  {t('itemName')} (English) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-item-name-en"
                  type="text"
                  value={itemFormData.name_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder={t('enterItemNameEn') || 'Enter item name in English'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  disabled={itemActionLoading}
                />
                {itemFormErrors.name_en && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{itemFormErrors.name_en}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-name-it" className="text-neutral-ink-700">
                  {t('itemName')} (Italian) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-item-name-it"
                  type="text"
                  value={itemFormData.name_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_it: e.target.value }))}
                  placeholder={t('enterItemNameIt') || 'Enter item name in Italian'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  disabled={itemActionLoading}
                />
                {itemFormErrors.name_it && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{itemFormErrors.name_it}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Item Description - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-item-description-en" className="text-neutral-ink-700">
                  {t('itemDescription')} (English)
                </Label>
                <Textarea
                  id="add-item-description-en"
                  value={itemFormData.description_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  placeholder={t('enterItemDescriptionEn') || 'Enter description in English (optional)'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-description-it" className="text-neutral-ink-700">
                  {t('itemDescription')} (Italian)
                </Label>
                <Textarea
                  id="add-item-description-it"
                  value={itemFormData.description_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_it: e.target.value }))}
                  placeholder={t('enterItemDescriptionIt') || 'Enter description in Italian (optional)'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
            </div>

            {/* Maintenance Property ID */}
            <div className="space-y-2">
              <Label htmlFor="add-maintenance-property-id" className="text-neutral-ink-700">
                {t('maintenancePropertyId') || 'Maintenance Property ID'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-maintenance-property-id"
                type="number"
                value={itemFormData.maintenance_property_id}
                onChange={(e) => setItemFormData(prev => ({ ...prev, maintenance_property_id: e.target.value }))}
                placeholder={t('enterMaintenancePropertyId') || 'Enter maintenance property ID'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={itemActionLoading}
              />
              {itemFormErrors.maintenance_property_id && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{itemFormErrors.maintenance_property_id}</span>
                </div>
              )}
            </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseAddDialog}
                disabled={itemActionLoading}
                className="rounded-xl"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={itemActionLoading}
                className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl disabled:opacity-50"
              >
                {itemActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('adding') || 'Adding...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add') || 'Add'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseEditDialog();
        }
      }}>
        <DialogContent 
          className="max-w-2xl rounded-2xl"
          hideCloseButton={true}
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{t('editMaintenanceItem') || 'Edit Maintenance Item'}</DialogTitle>
              <DialogDescription>
                {t('updateMaintenanceItemDesc') || 'Update the maintenance item information'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
            {/* Item Name - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-name-en" className="text-neutral-ink-700">
                  {t('itemName')} (English) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-item-name-en"
                  type="text"
                  value={itemFormData.name_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder={t('enterItemNameEn') || 'Enter item name in English'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  disabled={itemActionLoading}
                />
                {itemFormErrors.name_en && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{itemFormErrors.name_en}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-name-it" className="text-neutral-ink-700">
                  {t('itemName')} (Italian) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-item-name-it"
                  type="text"
                  value={itemFormData.name_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_it: e.target.value }))}
                  placeholder={t('enterItemNameIt') || 'Enter item name in Italian'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  disabled={itemActionLoading}
                />
                {itemFormErrors.name_it && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{itemFormErrors.name_it}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Item Description - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-description-en" className="text-neutral-ink-700">
                  {t('itemDescription')} (English)
                </Label>
                <Textarea
                  id="edit-item-description-en"
                  value={itemFormData.description_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  placeholder={t('enterItemDescriptionEn') || 'Enter description in English (optional)'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-description-it" className="text-neutral-ink-700">
                  {t('itemDescription')} (Italian)
                </Label>
                <Textarea
                  id="edit-item-description-it"
                  value={itemFormData.description_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_it: e.target.value }))}
                  placeholder={t('enterItemDescriptionIt') || 'Enter description in Italian (optional)'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
            </div>

            {/* Maintenance Property ID */}
            <div className="space-y-2">
              <Label htmlFor="edit-maintenance-property-id" className="text-neutral-ink-700">
                {t('maintenancePropertyId') || 'Maintenance Property ID'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-maintenance-property-id"
                type="number"
                value={itemFormData.maintenance_property_id}
                onChange={(e) => setItemFormData(prev => ({ ...prev, maintenance_property_id: e.target.value }))}
                placeholder={t('enterMaintenancePropertyId') || 'Enter maintenance property ID'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={itemActionLoading}
              />
              {itemFormErrors.maintenance_property_id && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{itemFormErrors.maintenance_property_id}</span>
                </div>
              )}
            </div>
          </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={itemActionLoading}
                className="rounded-xl"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleEditItem}
                disabled={itemActionLoading}
                className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl disabled:opacity-50"
              >
                {itemActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('updating') || 'Updating...'}
                  </>
                ) : (
                  t('update') || 'Update'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Maintenance Item Dialog */}
      <AlertDialog open={isDeleteItemOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseDeleteDialog();
        }
      }}>
        <AlertDialogContent 
          className="rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteMaintenanceItem') || 'Delete Maintenance Item'}</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingItemId && (() => {
                  const item = maintenanceItems.find(i => i.id === deletingItemId);
                  const itemName = item ? getMaintenanceItemName(item) : '';
                  return t('deleteMaintenanceItemConfirm')?.replace('{name}', `"${itemName}"`) || 
                    `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="rounded-xl"
                disabled={itemActionLoading}
                onClick={handleCloseDeleteDialog}
              >
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteItem}
                disabled={itemActionLoading}
                className="bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {itemActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('deleting') || 'Deleting...'}
                  </>
                ) : (
                  t('delete') || 'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

