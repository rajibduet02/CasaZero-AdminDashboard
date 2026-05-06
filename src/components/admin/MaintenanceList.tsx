import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Wrench, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Building2,
  Settings,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, formatDate, safeJsonParse } from '../../utils/api';
import { isSuperAdmin, readSessionUser } from '../../utils/rbac';

type AdminOverviewResponse = {
  status: boolean;
  data?: { total_maintenances?: number };
};

const MAINTENANCE_LIST_API_URL = 'https://smarthome.attoexasolutions.com/api/maintenance/list';

// Maintenance Category interface
interface MaintenanceCategory {
  id: number;
  name_en: string;
  name_it: string;
  description_en?: string;
  description_it?: string;
}

// Maintenance Item interface
interface MaintenanceItem {
  id: number;
  name_en: string;
  name_it: string;
  description_en?: string;
  description_it?: string;
  maintenance_property_id?: number;
}

// Maintenance interface - matches /api/all_maintenance/admin response
interface Maintenance {
  id: number;
  maintenance_title: string;
  maintenance_note?: string | null;
  maintenance_status: 'pending' | 'completed' | 'overdue' | 'inprogress' | 'hidden';
  due_date: string;
  last_maintenance_date?: string | null;
  // API response structure
  category?: {
    id: number;
    name_en: string;
    name_it: string;
  } | null;
  item?: {
    id: number;
    item_name_en: string;
    item_name_it: string;
  } | null;
  maintenance_frequency?: {
    id: number;
    name_en: string;
    name_it: string;
  } | null;
  residence?: {
    id: number;
    residence_name: string;
    residence_photo?: string;
  } | null;
  maintenance_priority?: {
    id: number;
    name: string;
    priority_type?: string;
  } | null;
  company?: {
    id: number;
    name: string;
    phone: string;
  } | null;
  // Support legacy format for backward compatibility
  maintenance_category?: {
    id: number;
    name_en: string;
    name_it: string;
  } | null;
  maintenance_item?: {
    id: number;
    item_name_en: string;
    item_name_it: string;
  } | null;
  maintenance_category_id?: number;
  maintenance_item_id?: number;
  maintenance_priority_id?: number;
  residence_id?: number;
  created_at?: string;
  updated_at?: string;
  unit?: {
    id: number;
    unit_name: string;
  } | null;
  assigned_user?: {
    id: number;
    name: string;
  } | null;
}

interface MaintenanceListProps {
  onEditMaintenance?: (maintenance: Maintenance) => void;
  onCreateMaintenance?: () => void;
  refreshKey?: number;
  filterByResidenceId?: number | null;
}

export function MaintenanceList({ onEditMaintenance, onCreateMaintenance, refreshKey, filterByResidenceId }: MaintenanceListProps) {
  const { t, language } = useLanguage();
  const canCreateMaintenance = useMemo(() => isSuperAdmin(readSessionUser()), []);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  /** When not filtering by residence, synced from admin-dashboard/overview so the total card updates with refreshKey without stale browser cache. */
  const [overviewTotalMaintenances, setOverviewTotalMaintenances] = useState<number | null>(null);
  const [filteredMaintenances, setFilteredMaintenances] = useState<Maintenance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Track deletion in progress

  // Category management state - from API
  const [maintenanceCategories, setMaintenanceCategories] = useState<MaintenanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCategoryAction, setLoadingCategoryAction] = useState(false);
  
  // Maintenance Items state - from API
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loadingMaintenanceItems, setLoadingMaintenanceItems] = useState(false);
  
  // Category form state
  const [categoryNameEn, setCategoryNameEn] = useState('');
  const [categoryNameIt, setCategoryNameIt] = useState('');
  const [categoryDescriptionEn, setCategoryDescriptionEn] = useState('');
  const [categoryDescriptionIt, setCategoryDescriptionIt] = useState('');
  
  // Separate dialog states for each action
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  
  // Form state for Add/Edit
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<number | null>(null);
  const [selectedCategoryForDelete, setSelectedCategoryForDelete] = useState<number | null>(null);

  const formatDateDisplay = (dateString: string | null | undefined) =>
    formatDate(dateString, { language });

  // Reusable function to fetch categories
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

      console.log('📡 [MAINTENANCE-LIST] Fetching categories...');
      const response = await fetch(`${API_BASE}/maintenance_categories/list`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log('📥 [MAINTENANCE-LIST] Categories response:', data);

      if (data.status === true && Array.isArray(data.data)) {
        setMaintenanceCategories(data.data);
        console.log('✅ [MAINTENANCE-LIST] Loaded', data.data.length, 'categories');
      } else {
        console.warn('⚠️ [MAINTENANCE-LIST] Invalid categories response format:', data);
        setMaintenanceCategories([]);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-LIST] Failed to fetch categories:', error);
      setMaintenanceCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Reusable function to fetch maintenance items
  const fetchMaintenanceItems = async () => {
    setLoadingMaintenanceItems(true);
    try {
      const token = localStorage.getItem('casazero_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('📡 [MAINTENANCE-LIST] Fetching maintenance items...');
      const response = await fetch(`${API_BASE}/maintenance_item/list`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log('📥 [MAINTENANCE-LIST] Maintenance items response:', data);

      if (data.status === true && Array.isArray(data.data)) {
        setMaintenanceItems(data.data);
        console.log('✅ [MAINTENANCE-LIST] Loaded', data.data.length, 'maintenance items');
      } else {
        console.warn('⚠️ [MAINTENANCE-LIST] Invalid maintenance items response format:', data);
        setMaintenanceItems([]);
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-LIST] Failed to fetch maintenance items:', error);
      setMaintenanceItems([]);
    } finally {
      setLoadingMaintenanceItems(false);
    }
  };

  // Fetch maintenance categories from API on mount
  useEffect(() => {
    fetchCategories();
    fetchMaintenanceItems();
  }, []);

  // Fetch maintenances from API - ADMIN endpoint or RESIDENCE-WISE endpoint
  const fetchMaintenances = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiToken = localStorage.getItem('casazero_token') || '';
      if (!apiToken) {
        setMaintenances([]);
        setError('Missing API token. Please login again.');
        return;
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };

      console.log('📡 [MAINTENANCE-LIST] Fetching maintenances with login API token...');
      const response = await fetch(`${MAINTENANCE_LIST_API_URL}?_=${Date.now()}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_token: apiToken }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 [MAINTENANCE-LIST] API response:', data);
      
      // Debug: Log the data structure
      if (data.data) {
        console.log('📊 [MAINTENANCE-LIST] Maintenance list:', data.data);
        console.log('📊 [MAINTENANCE-LIST] Is array?', Array.isArray(data.data));
        console.log('📊 [MAINTENANCE-LIST] Length:', data.data?.length);
      }

      if (data.status === true && Array.isArray(data.data)) {
        const fetchedMaintenances: Maintenance[] = data.data;
        const roleAndResidenceFiltered =
          filterByResidenceId != null
            ? fetchedMaintenances.filter((m) => m.residence?.id === filterByResidenceId || m.residence_id === filterByResidenceId)
            : fetchedMaintenances;

        setMaintenances(roleAndResidenceFiltered);
        setError(null);
        console.log('✅ [MAINTENANCE-LIST] Loaded', roleAndResidenceFiltered.length, 'maintenances');
      } else {
        console.warn('⚠️ [MAINTENANCE-LIST] Invalid response format:', data);
        setMaintenances([]); // Always set to empty array, never null
        setError(data.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('❌ [MAINTENANCE-LIST] Failed to fetch maintenances:', error);
      setMaintenances([]); // Always set to empty array, never null
      setError(error instanceof Error ? error.message : 'Failed to fetch maintenances');
    } finally {
      setLoading(false);
    }
  };

  // Fetch maintenances on mount and when refreshKey or filterByResidenceId changes
  useEffect(() => {
    fetchMaintenances();
  }, [refreshKey, filterByResidenceId]);

  // Total-maintenance card (global count): same overview API as AdminDashboard; residence filter uses list length only
  useEffect(() => {
    if (filterByResidenceId != null) {
      setOverviewTotalMaintenances(null);
      return;
    }

    let cancelled = false;
    const loadOverviewTotal = async () => {
      const api_token = localStorage.getItem('casazero_token') || '';
      if (!api_token) return;

      try {
        const response = await fetch(`${API_BASE}/admin-dashboard/overview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ api_token }),
        });
        const json = await safeJsonParse<AdminOverviewResponse>(response);
        if (
          !cancelled &&
          json.status === true &&
          json.data &&
          typeof json.data.total_maintenances === 'number'
        ) {
          setOverviewTotalMaintenances(json.data.total_maintenances);
        }
      } catch {
        /* keep previous overviewTotalMaintenances; card falls back to maintenances.length */
      }
    };

    void loadOverviewTotal();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, filterByResidenceId]);

  // Helper function to normalize status values (handle variations like inprogress, in-progress, in_progress)
  const normalizeStatus = (status: string | undefined): string => {
    if (!status) return 'pending';
    const normalized = status.toLowerCase();
    if (normalized === 'in-progress' || normalized === 'in_progress') {
      return 'inprogress';
    }
    return normalized;
  };

  // Filter maintenances based on search query, category, and status
  useEffect(() => {
    let filtered = maintenances;
    
    // Apply search query first
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.maintenance_title.toLowerCase().includes(query) ||
          m.maintenance_note?.toLowerCase().includes(query) ||
          getCategoryNameFromMaintenance(m).toLowerCase().includes(query) ||
          getItemName(m).toLowerCase().includes(query) ||
          getFrequencyName(m).toLowerCase().includes(query) ||
          m.maintenance_note?.toLowerCase().includes(query) ||
          m.residence?.residence_name?.toLowerCase().includes(query) ||
          m.maintenance_status?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter second (by category ID or category object)
    if (selectedCategoryId !== null) {
      filtered = filtered.filter(
        (m) => {
          const category = m.maintenance_category || m.category;
          return m.maintenance_category_id === selectedCategoryId || category?.id === selectedCategoryId;
        }
      );
    }
    
    // Apply status filter third
    if (selectedStatusFilter !== null) {
      filtered = filtered.filter(
        (m) => normalizeStatus(m.maintenance_status) === selectedStatusFilter
      );
    }
    
    setFilteredMaintenances(filtered);
  }, [maintenances, searchQuery, selectedCategoryId, selectedStatusFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setSelectedStatusFilter(null);
  };

  // Handle status card click
  const handleStatusCardClick = (status: string | null) => {
    setSelectedStatusFilter(status);
  };

  // Handle category selection by ID
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
  };

  // Get category name based on current language
  const getCategoryName = (category: MaintenanceCategory): string => {
    return language === 'it' ? category.name_it : category.name_en;
  };

  // Get maintenance item name based on current language
  const getMaintenanceItemName = (item: MaintenanceItem): string => {
    return language === 'it' ? item.name_it : item.name_en;
  };

  // Helper function to get item name from maintenance (API response)
  const getItemName = (maintenance: Maintenance): string => {
    const item = maintenance.maintenance_item || maintenance.item;
    if (!item) return '—';
    return language === 'it'
      ? item.item_name_it || item.item_name_en
      : item.item_name_en;
  };

  // Helper function to get category name from maintenance (API response)
  const getCategoryNameFromMaintenance = (maintenance: Maintenance): string => {
    const category = maintenance.maintenance_category || maintenance.category;
    if (!category) return '—';
    return language === 'it'
      ? category.name_it || category.name_en
      : category.name_en;
  };

  // Helper function to get priority badge colors based on priority name
  const getPriorityBadgeColors = (priorityName: string): { bg: string; text: string; border: string } => {
    const normalized = priorityName?.toUpperCase();
    switch (normalized) {
      case 'N1':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200'
        };
      case 'N2':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200'
        };
      case 'N3':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200'
        };
    }
  };

  // Helper function to get frequency name from maintenance
  const getFrequencyName = (maintenance: Maintenance): string => {
    const frequency = maintenance.maintenance_frequency;
    if (!frequency) return '—';
    
    if (typeof frequency === 'string') {
      return frequency;
    }
    
    if (typeof frequency === 'object' && frequency) {
      return language === 'it'
        ? (frequency.name_it || frequency.name_en || '—')
        : (frequency.name_en || '—');
    }
    
    return '—';
  };

  const handleDelete = (maintenance: Maintenance) => {
    // STEP 1: Capture delete context
    console.log('🗑️ [DELETE-INIT] Preparing to delete maintenance:', {
      maintenance_id: maintenance.id,
      maintenance_item_id: maintenance.maintenance_item_id || maintenance.item?.id,
      maintenance_title: maintenance.maintenance_title,
    });
    
    setDeletingMaintenance(maintenance);
    setDeleteDialogOpen(true);
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

  // STEP 3: Delete Maintenance API
  const deleteMaintenance = async (maintenanceId: number): Promise<boolean> => {
    console.log('🗑️ [STEP 1] Deleting maintenance ID:', maintenanceId);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: maintenanceId }),
      });
      
      const result = await response.json();
      console.log('📥 [DELETE-MAINTENANCE] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [DELETE-MAINTENANCE] Deleted successfully');
        return true;
      } else {
        const errorMessage = result.message || t('failedToDeleteMaintenance');
        console.error('❌ [DELETE-MAINTENANCE] Failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [DELETE-MAINTENANCE] Error:', error);
      throw error;
    }
  };

  // STEP 4: Delete Maintenance Item API (Conditional)
  const deleteMaintenanceItem = async (itemId: number): Promise<boolean> => {
    console.log('🗑️ [STEP 2] Deleting maintenance item ID:', itemId);
    
    try {
      const response = await fetch(`${API_BASE}/maintenance_item/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: itemId }),
      });
      
      const result = await response.json();
      console.log('📥 [DELETE-ITEM] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [DELETE-ITEM] Deleted successfully');
        return true;
      } else {
        // Log but don't throw - item deletion failure shouldn't affect maintenance deletion
        console.warn('⚠️ [DELETE-ITEM] Failed:', result.message);
        return false;
      }
    } catch (error) {
      // Log but don't throw - item deletion failure shouldn't rollback maintenance deletion
      console.warn('⚠️ [DELETE-ITEM] Error (non-fatal):', error);
      return false;
    }
  };

  // Check if maintenance item is used by other maintenances
  const isItemUsedElsewhere = (itemId: number, currentMaintenanceId: number): boolean => {
    // Check if any other maintenance uses this item
    const otherUsages = maintenances.filter(m => 
      m.id !== currentMaintenanceId && 
      (m.maintenance_item_id === itemId || m.item?.id === itemId)
    );
    
    const isUsed = otherUsages.length > 0;
    console.log('🔍 [CHECK-ITEM] Item ID:', itemId, 'Used elsewhere:', isUsed, 'Other usages:', otherUsages.length);
    
    return isUsed;
  };

  const handleConfirmDelete = async () => {
    if (!deletingMaintenance || isDeleting) return;

    const maintenanceId = deletingMaintenance.id;
    
    console.log('🗑️ [DELETE-MAINTENANCE] Starting delete for maintenance ID:', maintenanceId);

    // Start loading state
    setIsDeleting(true);

    try {
      // Call maintenance/delete API
      const response = await fetch(`${API_BASE}/maintenance/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: maintenanceId }),
      });
      
      const result = await response.json();
      console.log('📥 [DELETE-MAINTENANCE] API Response:', result);
      
      if (result.status === true) {
        console.log('✅ [DELETE-MAINTENANCE] Deleted successfully');
        
        // Refresh maintenance list by re-fetching from API (REQUIRED)
        try {
          await fetchMaintenances();
          console.log('🔄 [DELETE-MAINTENANCE] List refreshed successfully');
          
          // Show success toast after refresh completes
          toast.success(t('success') || 'Success', {
            description: t('maintenanceDeletedSuccess') || 'Maintenance deleted successfully',
          });
          
          // Close dialog only after successful refresh
          setDeleteDialogOpen(false);
          setDeletingMaintenance(null);
        } catch (refreshError) {
          console.error('❌ [DELETE-MAINTENANCE] Failed to refresh list:', refreshError);
          
          // Fallback: Remove from state if refresh fails
          setMaintenances(prev => prev.filter(item => item.id !== maintenanceId));
          console.log('🔄 [DELETE-MAINTENANCE] Removed from state as fallback');
          
          // Show success toast (delete was successful, even if refresh failed)
          toast.success(t('success') || 'Success', {
            description: t('maintenanceDeletedSuccess') || 'Maintenance deleted successfully',
          });
          
          // Close dialog
          setDeleteDialogOpen(false);
          setDeletingMaintenance(null);
        }
      } else {
        const errorMessage = result.message || t('failedToDeleteMaintenance') || 'Failed to delete maintenance';
        console.error('❌ [DELETE-MAINTENANCE] Failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('❌ [DELETE-MAINTENANCE] Error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as any).message)
          : t('failedToDeleteMaintenance') || 'Failed to delete maintenance';
      
      toast.error(t('error') || 'Error', {
        description: errorMessage,
      });
    } finally {
      // Always reset loading state
      setIsDeleting(false);
    }
  };

  const handleEdit = (maintenance: Maintenance) => {
    console.log('📝 [EDIT-MAINTENANCE] Edit initiated for maintenance ID:', maintenance.id);
    onEditMaintenance?.(maintenance);
  };

  // Category management handlers - API implementation
  const handleAddCategory = async () => {
    // Validation
    if (!categoryNameEn.trim() || !categoryNameIt.trim()) {
      toast.error(t('error') || 'Error', {
        description: t('categoryNameRequired') || 'Category name in both languages is required',
      });
      return;
    }

    setLoadingCategoryAction(true);
    try {
      const response = await fetch(`${API_BASE}/maintenance_categories/store`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name_en: categoryNameEn.trim(),
          name_it: categoryNameIt.trim(),
          description_en: categoryDescriptionEn.trim() || undefined,
          description_it: categoryDescriptionIt.trim() || undefined,
        }),
      });

      const result = await response.json();
      console.log('📥 [ADD-CATEGORY] API Response:', result);

      if (result.status === true) {
        toast.success(t('success') || 'Success', {
          description: t('categoryAdded') || 'Category added successfully',
        });
        
        // Reset form
        setCategoryNameEn('');
        setCategoryNameIt('');
        setCategoryDescriptionEn('');
        setCategoryDescriptionIt('');
        setShowAddCategoryDialog(false);
        
        // Refresh categories list
        await fetchCategories();
      } else {
        const errorMessage = result.message || t('failedToAddCategory') || 'Failed to add category';
        toast.error(t('error') || 'Error', {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('❌ [ADD-CATEGORY] Error:', error);
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToAddCategory') || 'Failed to add category',
      });
    } finally {
      setLoadingCategoryAction(false);
    }
  };

  const handleUpdateCategory = async () => {
    // Validation
    if (!categoryNameEn.trim() || !categoryNameIt.trim() || !selectedCategoryForEdit) {
      toast.error(t('error') || 'Error', {
        description: t('categoryNameRequired') || 'Category name in both languages is required',
      });
      return;
    }

    setLoadingCategoryAction(true);
    try {
      const response = await fetch(`${API_BASE}/maintenance_categories/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: selectedCategoryForEdit,
          name_en: categoryNameEn.trim(),
          name_it: categoryNameIt.trim(),
          description_en: categoryDescriptionEn.trim() || undefined,
          description_it: categoryDescriptionIt.trim() || undefined,
        }),
      });

      const result = await response.json();
      console.log('📥 [UPDATE-CATEGORY] API Response:', result);

      if (result.status === true) {
        toast.success(t('success') || 'Success', {
          description: t('categoryUpdated') || 'Category updated successfully',
        });
        
        // Reset form
        setCategoryNameEn('');
        setCategoryNameIt('');
        setCategoryDescriptionEn('');
        setCategoryDescriptionIt('');
        setSelectedCategoryForEdit(null);
        setShowEditCategoryDialog(false);
        
        // Refresh categories list
        await fetchCategories();
      } else {
        const errorMessage = result.message || t('failedToUpdateCategory') || 'Failed to update category';
        toast.error(t('error') || 'Error', {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('❌ [UPDATE-CATEGORY] Error:', error);
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToUpdateCategory') || 'Failed to update category',
      });
    } finally {
      setLoadingCategoryAction(false);
    }
  };

  const handleDeleteCategory = async () => {
    // Local validation
    if (!selectedCategoryForDelete) {
      return;
    }

    setLoadingCategoryAction(true);
    try {
      const response = await fetch(`${API_BASE}/maintenance_categories/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: selectedCategoryForDelete,
        }),
      });

      const result = await response.json();
      console.log('📥 [DELETE-CATEGORY] API Response:', result);

      if (result.status === true) {
        toast.success(t('success') || 'Success', {
          description: t('categoryDeleted') || 'Category deleted successfully',
        });
        
        // Reset to null if deleted category was selected in filter
        if (selectedCategoryId === selectedCategoryForDelete) {
          setSelectedCategoryId(null);
        }

        setSelectedCategoryForDelete(null);
        setShowDeleteCategoryDialog(false);
        
        // Refresh categories list
        await fetchCategories();
      } else {
        const errorMessage = result.message || t('failedToDeleteCategory') || 'Failed to delete category';
        toast.error(t('error') || 'Error', {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('❌ [DELETE-CATEGORY] Error:', error);
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToDeleteCategory') || 'Failed to delete category',
      });
    } finally {
      setLoadingCategoryAction(false);
    }
  };

  // Helper to open Add dialog with form reset
  const handleOpenAddCategoryDialog = () => {
    setCategoryNameEn('');
    setCategoryNameIt('');
    setCategoryDescriptionEn('');
    setCategoryDescriptionIt('');
    setShowAddCategoryDialog(true);
  };

  // Helper to open Edit dialog with category selection
  const handleOpenEditCategoryDialog = () => {
    setSelectedCategoryForEdit(null);
    setCategoryNameEn('');
    setCategoryNameIt('');
    setCategoryDescriptionEn('');
    setCategoryDescriptionIt('');
    setShowEditCategoryDialog(true);
  };

  // Helper to open Delete dialog with category selection
  const handleOpenDeleteCategoryDialog = () => {
    setSelectedCategoryForDelete(null);
    setShowDeleteCategoryDialog(true);
  };

  // Helper to fetch and load category data for editing
  const handleEditCategorySelect = async (categoryIdString: string) => {
    const categoryId = parseInt(categoryIdString, 10);
    setSelectedCategoryForEdit(categoryId);
    
    // Fetch category details from API
    setLoadingCategoryAction(true);
    try {
      const response = await fetch(`${API_BASE}/maintenance_categories/show`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: categoryId }),
      });

      const result = await response.json();
      console.log('📥 [SHOW-CATEGORY] API Response:', result);

      if (result.status === true && result.data) {
        const category = result.data;
        setCategoryNameEn(category.name_en || '');
        setCategoryNameIt(category.name_it || '');
        setCategoryDescriptionEn(category.description_en || '');
        setCategoryDescriptionIt(category.description_it || '');
      } else {
        toast.error(t('error') || 'Error', {
          description: result.message || t('failedToLoadCategory') || 'Failed to load category',
        });
      }
    } catch (error) {
      console.error('❌ [SHOW-CATEGORY] Error:', error);
      toast.error(t('error') || 'Error', {
        description: error instanceof Error ? error.message : t('failedToLoadCategory') || 'Failed to load category',
      });
    } finally {
      setLoadingCategoryAction(false);
    }
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'completed':
        return {
          bgClass: 'bg-green-50 text-green-700',
          icon: <CheckCircle className="w-3 h-3" />,
          label: t('completed') || 'Completed'
        };
      case 'overdue':
        return {
          bgClass: 'bg-red-50 text-red-700',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: t('overdue') || 'Overdue'
        };
      case 'inprogress':
        return {
          bgClass: 'bg-blue-50 text-blue-700',
          icon: <Loader2 className="w-3 h-3" />,
          label: t('inProgress') || 'In Progress'
        };
      case 'hidden':
        return {
          bgClass: 'bg-gray-50 text-gray-700',
          icon: <Settings className="w-3 h-3" />,
          label: t('hidden') || 'Hidden'
        };
      case 'pending':
      default:
        return {
          bgClass: 'bg-yellow-50 text-yellow-700',
          icon: <Clock className="w-3 h-3" />,
          label: t('pending') || 'Pending'
        };
    }
  };

  // Calculate stats - using normalized status for consistency
  const totalMaintenances = maintenances.length;
  const totalMaintenancesCard =
    filterByResidenceId != null
      ? totalMaintenances
      : overviewTotalMaintenances ?? totalMaintenances;
  const pendingMaintenances = maintenances.filter(m => normalizeStatus(m.maintenance_status) === 'pending').length;
  const overdueMaintenances = maintenances.filter(m => normalizeStatus(m.maintenance_status) === 'overdue').length;
  const inProgressMaintenances = maintenances.filter(m => normalizeStatus(m.maintenance_status) === 'inprogress').length;
  const completedMaintenances = maintenances.filter(m => normalizeStatus(m.maintenance_status) === 'completed').length;
  const hiddenMaintenances = maintenances.filter(m => normalizeStatus(m.maintenance_status) === 'hidden').length;

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
          <h1 className="text-neutral-ink-900 mb-2">{t('maintenanceManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageMaintenances')}</p>
        </div>

        {canCreateMaintenance && (
          <Button
            onClick={onCreateMaintenance}
            className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('addMaintenance')}
          </Button>
        )}
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        // className="flex justify-end "
      >
        

        {/* Pending Maintenances Card */}
        {/* <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'pending' ? 'ring-2 ring-amber-500' : ''
          }`}
          onClick={() => handleStatusCardClick('pending')}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex-shrink-0 p-3 rounded-xl"
              style={{ background: 'linear-gradient(to bottom right, #F59E0B, #D97706)' }}
            >
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{pendingMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('pendingMaintenances')}</p>
            </div>
          </div>
        </Card> */}

        {/* Overdue Maintenances Card */}
        {/* <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'overdue' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => handleStatusCardClick('overdue')}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex-shrink-0 p-3 rounded-xl"
              style={{ background: 'linear-gradient(to bottom right, #EF4444, #DC2626)' }}
            >
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{overdueMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('overdueMaintenances')}</p>
            </div>
          </div>
        </Card> */}

        {/* In Progress Maintenances Card */}
        {/* <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'inprogress' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleStatusCardClick('inprogress')}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex-shrink-0 p-3 rounded-xl"
              style={{ background: 'linear-gradient(to bottom right, #3B82F6, #2563EB)' }}
            >
              <Loader2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{inProgressMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('inProgressMaintenances') || 'In Progress'}</p>
            </div>
          </div>
        </Card> */}

        {/* Completed Maintenances Card */}
        {/* <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'completed' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => handleStatusCardClick('completed')}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex-shrink-0 p-3 rounded-xl"
              style={{ background: 'linear-gradient(to bottom right, #10B981, #059669)' }}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{completedMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('completedMaintenances') || 'Completed'}</p>
            </div>
          </div>
        </Card> */}

        {/* Hidden Maintenances Card */}
        {/* <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'hidden' ? 'ring-2 ring-gray-500' : ''
          }`}
          onClick={() => handleStatusCardClick('hidden')}
        >
          <div className="flex items-center gap-4">
            <div 
              className="flex-shrink-0 p-3 rounded-xl"
              style={{ background: 'linear-gradient(to bottom right, #6B7280, #4B5563)' }}
            >
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{hiddenMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('hiddenMaintenances') || 'Hidden'}</p>
            </div>
          </div>
        </Card> */}

        {/* Total Maintenances Card */}
        <Card 
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === null ? 'ring-2 ring-[#6A8F7B]' : ''
          }`}
          onClick={() => handleStatusCardClick(null)}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalMaintenancesCard}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalMaintenances')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Category Filter Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            {/* Category Filter */}
            <div className="flex items-center gap-3 flex-1">
              <Wrench className="w-5 h-5 text-neutral-ink-400" />
              <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategoryPopover}
                    className="w-full justify-between rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                    disabled={loadingCategories}
                  >
                    <span className="text-neutral-ink-600">
                      {loadingCategories ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('loading') || 'Loading...'}
                        </span>
                      ) : selectedCategoryId !== null ? (
                        maintenanceCategories.find((c) => c.id === selectedCategoryId)
                          ? getCategoryName(maintenanceCategories.find((c) => c.id === selectedCategoryId)!)
                          : t('all') || 'All'
                      ) : (
                        language === 'it' ? 'Filtra per categoria' : 'Filter by Category'
                      )}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchCategory') || 'Search category...'} className="h-9" />
                    <CommandList>
                      {loadingCategories ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-[#6A8F7B] animate-spin" />
                        </div>
                      ) : maintenanceCategories.length === 0 ? (
                        <CommandEmpty>
                          {t('noCategoriesAvailable') || 'No categories available'}
                        </CommandEmpty>
                      ) : (
                        <>
                          <CommandEmpty>
                            {t('noCategoryFound') || 'No category found'}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all-categories"
                              onSelect={() => {
                                handleCategorySelect(null);
                                setOpenCategoryPopover(false);
                              }}
                              className="cursor-pointer rounded-lg"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedCategoryId === null ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              {t('allCategories') || 'All Categories'}
                            </CommandItem>
                            {maintenanceCategories.map((category) => (
                              <CommandItem
                                key={category.id}
                                value={getCategoryName(category)}
                                onSelect={() => {
                                  handleCategorySelect(category.id);
                                  setOpenCategoryPopover(false);
                                }}
                                className="cursor-pointer rounded-lg"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <Wrench className="w-4 h-4 mr-2 text-[#6A8F7B]" />
                                {getCategoryName(category)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCategoryId !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleCategorySelect(null);
                  }}
                  className="rounded-lg hover:bg-neutral-line-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Settings Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 rounded-xl border-neutral-line-200 hover:bg-neutral-line-100"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="bottom"
                align="end"
                sideOffset={8}
                className="w-48 rounded-xl"
              >
                <DropdownMenuItem
                  onClick={handleOpenAddCategoryDialog}
                  className="cursor-pointer rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addCategory') || 'Add Category'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleOpenEditCategoryDialog}
                  className="cursor-pointer rounded-lg"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('editCategory') || 'Edit Category'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleOpenDeleteCategoryDialog}
                  className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('deleteCategory') || 'Delete Category'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Bar */}
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder={t('searchMaintenances') || 'Search Maintenances'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Maintenances Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200 relative overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingMaintenances') || 'Loading maintenances...'}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-neutral-ink-600 mb-2">{t('error') || 'Error'}</p>
              <p className="text-neutral-ink-500 text-sm">{error}</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto divide-y divide-neutral-line-200" style={{ minWidth: '100%' }}>
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '14%', minWidth: '180px' }}>
                      {t('maintenanceTitle') || 'Maintenance Title'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '12%', minWidth: '150px' }}>
                      {t('maintenanceNote') || 'Maintenance Note'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '7%', minWidth: '80px' }}>
                      {t('priority') || 'Priority'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '10%', minWidth: '120px' }}>
                      {t('category') || 'Category'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '8%', minWidth: '100px' }}>
                      {t('frequency') || 'Frequency'}
                    </th>
                    {/* <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '8%', minWidth: '90px' }}>
                      {t('status') || 'Status'}
                    </th> */}
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '8%', minWidth: '100px' }}>
                      {t('dueDate') || 'Due Date'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '8%', minWidth: '120px' }}>
                      {t('lastMaintenanceDate') || 'Last Maintenance Date'}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider" style={{ width: '3%', minWidth: '60px' }}>
                      {t('actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                  <AnimatePresence>
                    {filteredMaintenances.map((maintenance, index) => {
                      const statusBadge = getStatusBadge(maintenance.maintenance_status);
                      return (
                        <motion.tr
                          key={maintenance.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: 0.05 * index, duration: 0.3 }}
                          className="hover:bg-neutral-line-100 transition-colors duration-200"
                        >
                          {/* 1. Maintenance Title */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center flex-shrink-0">
                                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-neutral-ink-900 break-words whitespace-normal">
                                  {maintenance.maintenance_title?.trim() || '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* 2. Maintenance Note */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            <span className="break-words whitespace-normal block">{maintenance.maintenance_note || '—'}</span>
                          </td>
                          {/* 3. Priority */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            {maintenance.maintenance_priority?.name ? (
                              <div className="flex flex-col items-start gap-1">
                                {/* Priority Name Badge */}
                                {(() => {
                                  const priorityName = maintenance.maintenance_priority.name;
                                  const colors = getPriorityBadgeColors(priorityName);
                                  return (
                                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} whitespace-nowrap`}>
                                      {priorityName}
                                    </span>
                                  );
                                })()}
                                {/* Priority Type */}
                                {maintenance.maintenance_priority.priority_type ? (
                                  <span className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">
                                    {maintenance.maintenance_priority.priority_type}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs sm:text-sm text-neutral-ink-400">—</span>
                            )}
                          </td>
                          {/* 4. Category */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            <div className="max-w-full">
                              {(() => {
                                const category = maintenance.maintenance_category || maintenance.category;
                                if (!category) return <span className="text-xs sm:text-sm text-neutral-ink-400">—</span>;
                                const categoryName = language === 'it' 
                                  ? (category.name_it || category.name_en || '—')
                                  : (category.name_en || '—');
                                return (
                                  <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 break-words whitespace-normal max-w-full">
                                    {categoryName}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          {/* 5. Frequency */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            {(() => {
                              const frequency = maintenance.maintenance_frequency;
                              if (!frequency) return <span className="text-neutral-ink-400">—</span>;
                              if (typeof frequency === 'string') {
                                return <span className="break-words whitespace-normal block">{frequency}</span>;
                              }
                              if (typeof frequency === 'object' && frequency) {
                                const freqName = language === 'it'
                                  ? (frequency.name_it || frequency.name_en || '—')
                                  : (frequency.name_en || '—');
                                return <span className="break-words whitespace-normal block">{freqName}</span>;
                              }
                              return <span className="text-neutral-ink-400">—</span>;
                            })()}
                          </td>
                          {/* 8. Status */}
                          {/* <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            <div className="max-w-full">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${statusBadge.bgClass} break-words whitespace-normal`}>
                                {statusBadge.icon}
                                <span>{statusBadge.label}</span>
                              </span>
                            </div>
                          </td> */}
                          {/* 6. Due Date */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            <span className="break-words whitespace-normal block">{formatDateDisplay(maintenance.due_date)}</span>
                          </td>
                          {/* 7. Last Maintenance Date */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            <span className="break-words whitespace-normal block">
                              {maintenance.last_maintenance_date ? formatDateDisplay(maintenance.last_maintenance_date) : '—'}
                            </span>
                          </td>
                          {/* 8. Actions */}
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-line-200 flex-shrink-0"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  side="left"
                                  align="start"
                                  sideOffset={8}
                                  collisionPadding={12}
                                  avoidCollisions
                                  className="w-48 rounded-xl"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(maintenance)}
                                    className="cursor-pointer rounded-lg"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    {t('edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(maintenance)}
                                    className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Empty State */}
              {filteredMaintenances.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Wrench className="w-12 h-12 text-neutral-ink-300" />
                    <p className="text-neutral-ink-600">
                      {(searchQuery || selectedCategoryId !== null || selectedStatusFilter !== null)
                        ? t('noMaintenancesFiltered') || 'No maintenance found matching filters'
                        : t('noMaintenancesYet') || 'No maintenances found'}
                    </p>
                    {(searchQuery || selectedCategoryId !== null || selectedStatusFilter !== null) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-2 rounded-lg hover:bg-neutral-line-100"
                      >
                        {t('clearFilters')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Bottom padding to ensure dropdown menu visibility */}
              {filteredMaintenances.length > 0 && (
                <div className="h-24" />
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMaintenance') || 'Delete Maintenance'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMaintenanceConfirm')?.replace('{name}', `"${deletingMaintenance?.maintenance_title}"`) || 'Are you sure you want to delete this maintenance?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="rounded-xl"
              disabled={isDeleting}
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={(open) => {
        if (!open && !loadingCategoryAction) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setCategoryNameEn('');
          setCategoryNameIt('');
          setCategoryDescriptionEn('');
          setCategoryDescriptionIt('');
        }
        setShowAddCategoryDialog(open);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('addCategory') || 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {t('addNewCategory') || 'Add a new maintenance category'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-category-name-en" className="text-neutral-ink-700">
                {t('categoryName') || 'Category Name'} (English) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-category-name-en"
                type="text"
                value={categoryNameEn}
                onChange={(e) => setCategoryNameEn(e.target.value)}
                placeholder={t('enterCategoryName') || 'Enter category name in English'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={loadingCategoryAction}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category-name-it" className="text-neutral-ink-700">
                {t('categoryName') || 'Category Name'} (Italian) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-category-name-it"
                type="text"
                value={categoryNameIt}
                onChange={(e) => setCategoryNameIt(e.target.value)}
                placeholder={t('enterCategoryName') || 'Enter category name in Italian'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={loadingCategoryAction}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category-desc-en" className="text-neutral-ink-700">
                {t('description') || 'Description'} (English)
              </Label>
              <Input
                id="add-category-desc-en"
                type="text"
                value={categoryDescriptionEn}
                onChange={(e) => setCategoryDescriptionEn(e.target.value)}
                placeholder={t('enterDescription') || 'Enter description in English (optional)'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={loadingCategoryAction}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category-desc-it" className="text-neutral-ink-700">
                {t('description') || 'Description'} (Italian)
              </Label>
              <Input
                id="add-category-desc-it"
                type="text"
                value={categoryDescriptionIt}
                onChange={(e) => setCategoryDescriptionIt(e.target.value)}
                placeholder={t('enterDescription') || 'Enter description in Italian (optional)'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={loadingCategoryAction}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCategoryDialog(false);
                setCategoryNameEn('');
                setCategoryNameIt('');
                setCategoryDescriptionEn('');
                setCategoryDescriptionIt('');
              }}
              className="rounded-xl"
              disabled={loadingCategoryAction}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={!categoryNameEn.trim() || !categoryNameIt.trim() || loadingCategoryAction}
              className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingCategoryAction ? (
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
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={(open) => {
        if (!open && !loadingCategoryAction) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setSelectedCategoryForEdit(null);
          setCategoryNameEn('');
          setCategoryNameIt('');
          setCategoryDescriptionEn('');
          setCategoryDescriptionIt('');
        }
        setShowEditCategoryDialog(open);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('editCategory') || 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              {t('updateCategoryInfo') || 'Select a category and update its information'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Category Selector */}
            <div className="space-y-2">
              <Label htmlFor="edit-category-select" className="text-neutral-ink-700">
                {t('selectCategory') || 'Select Category'} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedCategoryForEdit?.toString() || ''}
                onValueChange={handleEditCategorySelect}
                disabled={loadingCategoryAction}
              >
                <SelectTrigger id="edit-category-select" className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectCategoryToEdit') || 'Select category to edit'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {maintenanceCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                      className="rounded-lg"
                    >
                      {getCategoryName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Form Fields */}
            {selectedCategoryForEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-category-name-en" className="text-neutral-ink-700">
                    {t('categoryName') || 'Category Name'} (English) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-category-name-en"
                    type="text"
                    value={categoryNameEn}
                    onChange={(e) => setCategoryNameEn(e.target.value)}
                    placeholder={t('enterCategoryName') || 'Enter category name in English'}
                    className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                    disabled={loadingCategoryAction}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category-name-it" className="text-neutral-ink-700">
                    {t('categoryName') || 'Category Name'} (Italian) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-category-name-it"
                    type="text"
                    value={categoryNameIt}
                    onChange={(e) => setCategoryNameIt(e.target.value)}
                    placeholder={t('enterCategoryName') || 'Enter category name in Italian'}
                    className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                    disabled={loadingCategoryAction}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category-desc-en" className="text-neutral-ink-700">
                    {t('description') || 'Description'} (English)
                  </Label>
                  <Input
                    id="edit-category-desc-en"
                    type="text"
                    value={categoryDescriptionEn}
                    onChange={(e) => setCategoryDescriptionEn(e.target.value)}
                    placeholder={t('enterDescription') || 'Enter description in English (optional)'}
                    className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                    disabled={loadingCategoryAction}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category-desc-it" className="text-neutral-ink-700">
                    {t('description') || 'Description'} (Italian)
                  </Label>
                  <Input
                    id="edit-category-desc-it"
                    type="text"
                    value={categoryDescriptionIt}
                    onChange={(e) => setCategoryDescriptionIt(e.target.value)}
                    placeholder={t('enterDescription') || 'Enter description in Italian (optional)'}
                    className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                    disabled={loadingCategoryAction}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditCategoryDialog(false);
                setSelectedCategoryForEdit(null);
                setCategoryNameEn('');
                setCategoryNameIt('');
                setCategoryDescriptionEn('');
                setCategoryDescriptionIt('');
              }}
              className="rounded-xl"
              disabled={loadingCategoryAction}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={!selectedCategoryForEdit || !categoryNameEn.trim() || !categoryNameIt.trim() || loadingCategoryAction}
              className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingCategoryAction ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('updating') || 'Updating...'}
                </>
              ) : (
                t('update') || 'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteCategoryDialog} onOpenChange={(open) => {
        if (!open && !loadingCategoryAction) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setSelectedCategoryForDelete(null);
        }
        setShowDeleteCategoryDialog(open);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('deleteCategory') || 'Delete Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategoryForDelete
                ? t('deleteCategoryConfirm')?.replace('{name}', `"${maintenanceCategories.find(c => c.id === selectedCategoryForDelete) ? getCategoryName(maintenanceCategories.find(c => c.id === selectedCategoryForDelete)!) : ''}"`) || 
                   `Are you sure you want to delete "${maintenanceCategories.find(c => c.id === selectedCategoryForDelete) ? getCategoryName(maintenanceCategories.find(c => c.id === selectedCategoryForDelete)!) : ''}"? This action cannot be undone.`
                : t('selectCategoryToDelete') || 'Select a category to delete'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!selectedCategoryForDelete ? (
              <div className="space-y-2">
                <Label htmlFor="delete-category-select" className="text-neutral-ink-700">
                  {t('selectCategory') || 'Select Category'} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedCategoryForDelete?.toString() || ''}
                  onValueChange={(value) => setSelectedCategoryForDelete(parseInt(value, 10))}
                  disabled={loadingCategoryAction}
                >
                  <SelectTrigger id="delete-category-select" className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectCategoryToDelete') || 'Select category to delete'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {maintenanceCategories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                        className="rounded-lg"
                      >
                        {getCategoryName(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-neutral-ink-700">
                  <strong>{maintenanceCategories.find(c => c.id === selectedCategoryForDelete) ? getCategoryName(maintenanceCategories.find(c => c.id === selectedCategoryForDelete)!) : ''}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCategoryDialog(false);
                setSelectedCategoryForDelete(null);
              }}
              className="rounded-xl"
              disabled={loadingCategoryAction}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleDeleteCategory}
              disabled={!selectedCategoryForDelete || loadingCategoryAction}
              className="bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingCategoryAction ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                t('delete') || 'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
