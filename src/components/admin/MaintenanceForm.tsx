import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { API_BASE, fetchResidencesCatalog, apiFetch } from '../../utils/api';
import { X, Wrench, Loader2, AlertCircle, Package, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectViewport,
} from '../ui/app-select';
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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

// Residence interface for API data (residence field removed from form; kept for any legacy/API use)
interface Residence {
  id: number;
  residence_name: string;
}

// Priority option for dropdown (from API or derived from maintenance items)
interface PriorityOption {
  id: number;
  name: string;
}

// Frequency option for dropdown (from API or derived from maintenance items)
interface FrequencyOption {
  id: number;
  name_en: string;
  name_it: string;
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
    name_en?: string;
    name_it?: string;
    name?: string;
  };
  maintenance_priority?: {
    id: number;
    name?: string;
    priority_type?: string;
    name_en?: string;
    name_it?: string;
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
  const pr = item.maintenance_priority;
  return pr.name || pr.priority_type || pr.name_en || pr.name_it || "";
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
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);
  const [frequencies, setFrequencies] = useState<FrequencyOption[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [loadingFrequencies, setLoadingFrequencies] = useState(false);
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
        const response = await apiFetch(`${API_BASE}/maintenance_categories/list`, {
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
        console.log('🏢 [MAINTENANCE-FORM] Fetching residences (POST /residences)...');
        const response = await fetchResidencesCatalog();

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
      const response = await apiFetch(`${API_BASE}/maintenance_item/list`, {
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

  // Priority & frequency dropdowns: full lists from database (GET /all/maintenance_*)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingPriorities(true);
      setLoadingFrequencies(true);

      const token = localStorage.getItem('casazero_token');
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const fetchPriorities = async () => {
        try {
          const response = await apiFetch(`${API_BASE}/all/maintenance_priority`, {
            method: 'GET',
            headers,
          });
          const data = await response.json();
          if (cancelled) return;
          if (data.status === true && Array.isArray(data.data)) {
            const list: PriorityOption[] = data.data
              .filter((row: { id?: unknown }) => row != null && typeof row.id === 'number')
              .map((row: { id: number; name?: string; priority_type?: string }) => ({
                id: row.id,
                name: row.name || row.priority_type || `#${row.id}`,
              }))
              .sort((a: PriorityOption, b: PriorityOption) => a.id - b.id);
            setPriorities(list);
          } else {
            setPriorities([]);
          }
        } catch (error) {
          console.error('❌ [MAINTENANCE-FORM] Failed to fetch all/maintenance_priority:', error);
          if (!cancelled) setPriorities([]);
        }
      };

      const fetchFrequencies = async () => {
        try {
          const response = await apiFetch(`${API_BASE}/all/maintenance_frequency`, {
            method: 'GET',
            headers,
          });
          const data = await response.json();
          if (cancelled) return;
          if (data.status === true && Array.isArray(data.data)) {
            const list: FrequencyOption[] = data.data
              .filter((row: { id?: unknown }) => row != null && typeof row.id === 'number')
              .map((row: { id: number; name_en?: string; name_it?: string }) => ({
                id: row.id,
                name_en: row.name_en || '',
                name_it: row.name_it || '',
              }))
              .sort((a: FrequencyOption, b: FrequencyOption) => a.id - b.id);
            setFrequencies(list);
          } else {
            setFrequencies([]);
          }
        } catch (error) {
          console.error('❌ [MAINTENANCE-FORM] Failed to fetch all/maintenance_frequency:', error);
          if (!cancelled) setFrequencies([]);
        }
      };

      await Promise.all([fetchPriorities(), fetchFrequencies()]);

      if (!cancelled) {
        setLoadingPriorities(false);
        setLoadingFrequencies(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
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
          const response = await apiFetch(`${API_BASE}/maintenance/show`, {
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
              let priorityId =
                fullMaintenance.maintenance_priority?.id ||
                fullMaintenance.maintenance_priority_id ||
                maintenance?.maintenance_priority?.id ||
                maintenance?.maintenance_priority_id ||
                null;
              const frequencyId =
                fullMaintenance.maintenance_frequency?.id ||
                maintenance?.maintenance_frequency?.id ||
                null;
              
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
              toast.error(t('error'), {
                description: result.message || t('failedToLoadMaintenance'),
              });
            }
          } catch (error) {
            console.error('❌ [MAINTENANCE-FORM] Error loading maintenance data:', error);
            toast.error(t('error'), {
              description: t('failedToLoadMaintenance'),
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
      newErrors.maintenance_title = t('maintenanceTitleRequired');
    }

    // Validate category, priority, frequency (required)
    if (!selectedCategoryId) {
      newErrors.category_id = t('categoryRequired');
    }
    if (!selectedPriorityId) {
      newErrors.maintenance_priority_id = t('priorityRequired');
    }
    if (!selectedFrequencyId) {
      newErrors.maintenance_frequency_id = t('frequencyRequired');
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
      const response = await apiFetch(`${API_BASE}/maintenance_item/show`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: itemId }),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] Show response:', result);

      if (result.status === true && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || t('failedToFetchMaintenanceItem'));
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
      const response = await apiFetch(`${API_BASE}/maintenance_item/update`, {
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
        let errorMessage = result.message || t('failedToUpdateMaintenanceItem');
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
      const response = await apiFetch(`${API_BASE}/maintenance_item/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: itemId }),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] Delete response:', result);

      if (result.status === true) {
        return true;
      } else {
        throw new Error(result.message || t('failedToDeleteMaintenanceItem'));
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
      toast.error(t('error'), {
        description: t('selectItemToEdit'),
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
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToLoadItem'),
      });
    } finally {
      setItemActionLoading(false);
    }
  };

  const handleOpenDeleteItem = (itemId?: number) => {
    const targetItemId = itemId || (formData.item_id && formData.item_id !== '__create_new__' ? parseInt(formData.item_id) : null);
    
    if (!targetItemId) {
      toast.error(t('error'), {
        description: t('selectItemToDelete'),
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
      newErrors.name_en = t('itemNameEnRequired');
    }
    if (!itemFormData.name_it.trim()) {
      newErrors.name_it = t('itemNameItRequired');
    }
    if (!itemFormData.maintenance_property_id) {
      newErrors.maintenance_property_id = t('maintenancePropertyIdRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setItemFormErrors(newErrors);
      return;
    }

    setItemActionLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/maintenance_item/store`, {
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
        toast.success(t('success'), {
          description: result.message || t('maintenanceItemCreatedSuccess'),
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
        let errorMessage = result.message || t('failedToCreateMaintenanceItem');
        if (result.errors) {
          const errorList = Object.entries(result.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToCreateItem'),
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
      newErrors.name_en = t('itemNameEnRequired');
    }
    if (!itemFormData.name_it.trim()) {
      newErrors.name_it = t('itemNameItRequired');
    }
    if (!itemFormData.maintenance_property_id) {
      newErrors.maintenance_property_id = t('maintenancePropertyIdRequired');
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

      toast.success(t('success'), {
        description: t('maintenanceItemUpdatedSuccess'),
      });

      await fetchMaintenanceItems();
      setIsEditItemOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToUpdateItem'),
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
      
      toast.success(t('success'), {
        description: t('maintenanceItemDeletedSuccess'),
      });

      await fetchMaintenanceItems();
      setFormData(prev => ({ ...prev, item_id: '' }));
      setIsDeleteItemOpen(false);
      setDeletingItemId(null);
    } catch (error) {
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToDeleteItem'),
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
      throw new Error(t('itemNameBothLanguagesRequired'));
    }
    
    if (!formData.maintenance_property_id) {
      throw new Error(t('maintenancePropertyIdRequired'));
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
      const response = await apiFetch(`${API_BASE}/maintenance_item/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('📥 [MAINTENANCE-ITEM] API Response:', result);
      
      if (result.status === true && result.data?.id) {
        console.log('✅ [MAINTENANCE-ITEM] Created successfully with ID:', result.data.id);
        
        // Show success toast for item creation
        toast.success(t('success'), {
          description: result.message || t('maintenanceItemCreatedSuccess'),
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
      throw new Error(t('maintenanceTitleRequired'));
    }

    if (!selectedCategoryId) {
      throw new Error(t('categoryRequired'));
    }
    
    if (!selectedPriorityId) {
      throw new Error(t('priorityRequired'));
    }
    
    if (!selectedFrequencyId) {
      throw new Error(t('frequencyRequired'));
    }

    // POST /maintenance/store — payload matches API contract (no maintenance_item_id)
    const payload: {
      maintenance_title: string;
      maintenance_note: string | null;
      maintenance_category_id: number;
      maintenance_priority_id: number;
      maintenance_frequency_id: number;
    } = {
      maintenance_title: maintenanceTitle,
      maintenance_note: formData.maintenance_note?.trim() || null,
      maintenance_category_id: selectedCategoryId,
      maintenance_priority_id: selectedPriorityId,
      maintenance_frequency_id: selectedFrequencyId,
    };

    console.log('📤 [MAINTENANCE] Request body:', payload);

    try {
      const response = await apiFetch(`${API_BASE}/maintenance/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('📥 [MAINTENANCE] API Response:', result);

      // Response: { status: true, message: string, data: { id, maintenance_title, ... } }
      if (result.status === true && result.data) {
        console.log('✅ [MAINTENANCE] Created successfully:', result.data);
        return result.data;
      } else {
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
      const response = await apiFetch(`${API_BASE}/maintenance_item/update`, {
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
  // POST /maintenance/update (fetch uses API_BASE)
  const updateMaintenance = async (maintenanceId: number): Promise<any> => {
    console.log('🔧 [UPDATE-MAINTENANCE] Updating maintenance ID:', maintenanceId);

    const maintenanceTitle = (formData.maintenance_title || formData.title || '').trim();
    if (!maintenanceTitle) {
      throw new Error(t('maintenanceTitleRequired'));
    }
    if (!selectedCategoryId) {
      throw new Error(t('categoryRequired'));
    }
    if (!selectedPriorityId) {
      throw new Error(t('priorityRequired'));
    }
    if (!selectedFrequencyId) {
      throw new Error(t('frequencyRequired'));
    }

    const requestBody: {
      id: number;
      maintenance_title: string;
      maintenance_frequency_id: number;
      maintenance_category_id: number;
      maintenance_priority_id: number;
      maintenance_note: string | null;
    } = {
      id: maintenanceId,
      maintenance_title: maintenanceTitle,
      maintenance_frequency_id: selectedFrequencyId,
      maintenance_category_id: selectedCategoryId,
      maintenance_priority_id: selectedPriorityId,
      maintenance_note: formData.maintenance_note?.trim() || null,
    };

    console.log('📤 [UPDATE-MAINTENANCE] Request body:', requestBody);

    try {
      const response = await apiFetch(`${API_BASE}/maintenance/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('📥 [UPDATE-MAINTENANCE] API Response:', result);

      if (result.status === true && result.data) {
        console.log('✅ [UPDATE-MAINTENANCE] Updated successfully:', result.data);
        return result.data;
      } else {
        let errorMessage = result.message || t('failedToUpdateMaintenance');
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
        const currentStatus = maintenance?.maintenance_status || 'pending';

        if (!maintenanceId) {
          throw new Error(t('maintenanceIdMissing'));
        }

        console.log('📋 Update context:');
        console.log('  - Maintenance ID:', maintenanceId);
        console.log('  - Current Status:', currentStatus);

        // Update maintenance
        console.log('🔧 [UPDATE] Updating maintenance record...');
        
        const updatedMaintenance = await updateMaintenance(maintenanceId);
        
        // Success!
        console.log('🎉 Maintenance update completed successfully!');
        toast.success(t('success'), {
          description: t('maintenanceUpdatedSuccess'),
        });

        // Notify parent to refresh list (POST via MaintenanceList refreshKey) and close dialog
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
            : t('failedToUpdateMaintenance');
        
        toast.error(t('error'), {
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
      const createdMaintenance = await createMaintenance();
      
      // Success!
      console.log('🎉 Maintenance creation completed successfully!');
      toast.success(t('success'), {
        description: t('maintenanceCreatedSuccess'),
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

      // Close the form dialog; parent refreshes MaintenanceList via refreshKey (POST)
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

            

            {/* Maintenance Title - text input for user to type the title */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_title" className="text-neutral-ink-700">
                {t('maintenanceTitle')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="maintenance_title"
                type="text"
                value={formData.title || formData.maintenance_title}
                onChange={(e) => {
                  const v = e.target.value;
                  handleInputChange('title', v);
                  handleInputChange('maintenance_title', v);
                }}
                placeholder={t('enterMaintenanceTitle')}
                className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${
                  errors.maintenance_title ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.maintenance_title && (
                <p className="text-xs text-red-500 mt-1">{errors.maintenance_title}</p>
              )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="category_id" className="text-neutral-ink-700">
                  {t('category')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={selectedCategoryId != null ? String(selectedCategoryId) : ''}
                  onValueChange={(value) => setSelectedCategoryId(value === '' ? null : parseInt(value, 10))}
                  disabled={loadingCategories}
                >
                  <AppSelectTrigger
                    id="category_id"
                    className={errors.category_id ? 'border-red-500 focus:border-red-500 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]' : 'rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]'}
                    disabled={loadingCategories}
                  >
                    <AppSelectValue
                      placeholder={
                        loadingCategories
                          ? t('loadingCategories')
                          : categories.length === 0 
                            ? t('noCategoriesAvailable')
                            : t('selectCategory')
                      }
                    />
                  </AppSelectTrigger>
                  <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                    <AppSelectViewport>
                      {categories.map((category) => (
                        <AppSelectItem key={category.id} value={String(category.id)} className="rounded-lg">
                          {getCategoryName(category)}
                        </AppSelectItem>
                      ))}
                    </AppSelectViewport>
                  </AppSelectContent>
                </AppSelect>
                {errors.category_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>
                )}
              </div>

            {/* Category, Priority, Frequency - dropdowns (data from API) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="maintenance_priority_id" className="text-neutral-ink-700">
                  {t('priority')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={selectedPriorityId != null ? String(selectedPriorityId) : ''}
                  onValueChange={(value) => setSelectedPriorityId(value === '' ? null : parseInt(value, 10))}
                  disabled={loadingPriorities}
                >
                  <AppSelectTrigger
                    id="maintenance_priority_id"
                    className={errors.maintenance_priority_id ? 'border-red-500 focus:border-red-500 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]' : 'rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]'}
                    disabled={loadingPriorities}
                  >
                    <AppSelectValue
                      placeholder={
                        loadingPriorities
                          ? t('loading')
                          : priorities.length === 0 
                            ? t('noPrioritiesAvailable')
                            : t('selectPriority')
                      }
                    />
                  </AppSelectTrigger>
                  <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                    <AppSelectViewport>
                      {priorities.map((p) => (
                        <AppSelectItem key={p.id} value={String(p.id)} className="rounded-lg">
                          {p.name}
                        </AppSelectItem>
                      ))}
                    </AppSelectViewport>
                  </AppSelectContent>
                </AppSelect>
                {errors.maintenance_priority_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.maintenance_priority_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_frequency_id" className="text-neutral-ink-700">
                  {t('frequency')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={selectedFrequencyId != null ? String(selectedFrequencyId) : ''}
                  onValueChange={(value) => setSelectedFrequencyId(value === '' ? null : parseInt(value, 10))}
                  disabled={loadingFrequencies}
                >
                  <AppSelectTrigger
                    id="maintenance_frequency_id"
                    className={errors.maintenance_frequency_id ? 'border-red-500 focus:border-red-500 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]' : 'rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]'}
                    disabled={loadingFrequencies}
                  >
                    <AppSelectValue
                      placeholder={
                        loadingFrequencies
                          ? t('loading')
                          : frequencies.length === 0 
                            ? t('noFrequenciesAvailable')
                            : t('selectFrequency')
                      }
                    />
                  </AppSelectTrigger>
                  <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                    <AppSelectViewport>
                      {frequencies.map((f) => (
                        <AppSelectItem key={f.id} value={String(f.id)} className="rounded-lg">
                          {language === 'it' ? (f.name_it || f.name_en) : (f.name_en || f.name_it)}
                        </AppSelectItem>
                      ))}
                    </AppSelectViewport>
                  </AppSelectContent>
                </AppSelect>
                {errors.maintenance_frequency_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.maintenance_frequency_id}</p>
                )}
              </div>
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

            {/* Status */}
            {/* <div className="space-y-2">
                <Label htmlFor="status" className="text-neutral-ink-700">
                  {t('status')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as 'in_progress' | 'completed')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectStatus')} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="in_progress" className="rounded-lg">{t('inProgress')}</AppSelectItem>
                    <AppSelectItem value="completed" className="rounded-lg">{t('completed')}</AppSelectItem>
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
                      ? t('loadingCategories')
                      : categories.length === 0 
                        ? t('noCategoriesAvailable')
                        : t('selectCategory')
                  } />
                </AppSelectTrigger>
                <AppSelectContent>
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-4 px-2 text-sm text-neutral-ink-500">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('loadingCategories')}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-4 px-2 text-sm text-neutral-ink-500 text-center">
                      {t('noCategoriesAvailable')}
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
                  {t('classification')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.classification}
                  onValueChange={(value) => handleInputChange('classification', value as 'N1' | 'N2' | 'N3')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectClassification')} />
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
                  {t('managedBy')} <span className="text-red-500">*</span>
                </Label>
                <AppSelect
                  containerRef={modalContainerRef}
                  value={formData.managed_by}
                  onValueChange={(value) => handleInputChange('managed_by', value as 'user' | 'administrator')}
                >
                  <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <AppSelectValue placeholder={t('selectManagedBy')} />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="user" className="rounded-lg">{t('user')}</AppSelectItem>
                    <AppSelectItem value="administrator" className="rounded-lg">{t('administrator')}</AppSelectItem>
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
                  {t('recommendedCompany')}
                </Label>
                <Input
                  id="recommended_company"
                  type="text"
                  value={formData.recommended_company || ''}
                  onChange={(e) => handleInputChange('recommended_company', e.target.value || null)}
                  placeholder={t('enterRecommendedCompany')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                />
              </div> */}

              {/* Phone */}
              {/* <div className="space-y-2">
                <Label htmlFor="phone" className="text-neutral-ink-700">
                  {t('phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value || null)}
                  placeholder={t('enterPhone')}
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
              <DialogTitle>{t('addMaintenanceItem')}</DialogTitle>
              <DialogDescription>
                {t('addNewMaintenanceItemDesc')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
            {/* Item Name - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-item-name-en" className="text-neutral-ink-700">
                  {t('itemName')} ({t('languageLabelEnglish')}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-item-name-en"
                  type="text"
                  value={itemFormData.name_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder={t('enterItemNameEn')}
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
                  {t('itemName')} ({t('languageLabelItalian')}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-item-name-it"
                  type="text"
                  value={itemFormData.name_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_it: e.target.value }))}
                  placeholder={t('enterItemNameIt')}
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
                  {t('itemDescription')} ({t('languageLabelEnglish')})
                </Label>
                <Textarea
                  id="add-item-description-en"
                  value={itemFormData.description_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  placeholder={t('enterItemDescriptionEn')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-item-description-it" className="text-neutral-ink-700">
                  {t('itemDescription')} ({t('languageLabelItalian')})
                </Label>
                <Textarea
                  id="add-item-description-it"
                  value={itemFormData.description_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_it: e.target.value }))}
                  placeholder={t('enterItemDescriptionIt')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
            </div>

            {/* Maintenance Property ID */}
            <div className="space-y-2">
              <Label htmlFor="add-maintenance-property-id" className="text-neutral-ink-700">
                {t('maintenancePropertyId')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-maintenance-property-id"
                type="number"
                value={itemFormData.maintenance_property_id}
                onChange={(e) => setItemFormData(prev => ({ ...prev, maintenance_property_id: e.target.value }))}
                placeholder={t('enterMaintenancePropertyId')}
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
                    {t('adding')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add')}
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
              <DialogTitle>{t('editMaintenanceItem')}</DialogTitle>
              <DialogDescription>
                {t('updateMaintenanceItemDesc')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
            {/* Item Name - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-name-en" className="text-neutral-ink-700">
                  {t('itemName')} ({t('languageLabelEnglish')}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-item-name-en"
                  type="text"
                  value={itemFormData.name_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder={t('enterItemNameEn')}
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
                  {t('itemName')} ({t('languageLabelItalian')}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-item-name-it"
                  type="text"
                  value={itemFormData.name_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name_it: e.target.value }))}
                  placeholder={t('enterItemNameIt')}
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
                  {t('itemDescription')} ({t('languageLabelEnglish')})
                </Label>
                <Textarea
                  id="edit-item-description-en"
                  value={itemFormData.description_en}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  placeholder={t('enterItemDescriptionEn')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-description-it" className="text-neutral-ink-700">
                  {t('itemDescription')} ({t('languageLabelItalian')})
                </Label>
                <Textarea
                  id="edit-item-description-it"
                  value={itemFormData.description_it}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description_it: e.target.value }))}
                  placeholder={t('enterItemDescriptionIt')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[80px]"
                  disabled={itemActionLoading}
                />
              </div>
            </div>

            {/* Maintenance Property ID */}
            <div className="space-y-2">
              <Label htmlFor="edit-maintenance-property-id" className="text-neutral-ink-700">
                {t('maintenancePropertyId')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-maintenance-property-id"
                type="number"
                value={itemFormData.maintenance_property_id}
                onChange={(e) => setItemFormData(prev => ({ ...prev, maintenance_property_id: e.target.value }))}
                placeholder={t('enterMaintenancePropertyId')}
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
                    {t('updating')}
                  </>
                ) : (
                  t('update')
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
              <AlertDialogTitle>{t('deleteMaintenanceItem')}</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingItemId && (() => {
                  const item = maintenanceItems.find(i => i.id === deletingItemId);
                  const itemName = item ? getMaintenanceItemName(item) : '';
                  return t('deleteMaintenanceItemConfirm').replace(
                    '{name}',
                    itemName ? `"${itemName}"` : ''
                  );
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
                    {t('deleting')}
                  </>
                ) : (
                  t('delete')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

