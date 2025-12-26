import React, { useState, useEffect } from 'react';
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

// Maintenance interface - updated to match API response
interface Maintenance {
  id: number;
  maintenance_title: string;
  maintenance_note?: string;
  maintenance_status: 'pending' | 'completed' | 'overdue';
  maintenance_frequency: string;
  due_date: string;
  last_maintenance_date?: string;
  maintenance_category_id?: number;
  maintenance_item_id?: number;
  residence_id?: number;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: number;
    name: string;
  } | null;
  item?: {
    id: number;
    name: string;
  } | null;
  residence?: {
    id: number;
    residence_name: string;
    residence_photo?: string;
  } | null;
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
}

export function MaintenanceList({ onEditMaintenance, onCreateMaintenance, refreshKey }: MaintenanceListProps) {
  const { t } = useLanguage();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<Maintenance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Track deletion in progress

  // Category management state
  const [categoryFilters, setCategoryFilters] = useState([
    { value: 'all', label: t('all') || 'All' },
    { value: 'Roofing & coverings', label: 'Roofing & coverings' },
    { value: 'Heating & air conditioning', label: 'Heating & air conditioning' },
    { value: 'Electrical system (unit & condominium)', label: 'Electrical system (unit & condominium)' },
    { value: 'Photovoltaic system', label: 'Photovoltaic system' },
    { value: 'Ventilation & aeration', label: 'Ventilation & aeration' },
    { value: 'Finishes & windows / doors', label: 'Finishes & windows / doors' },
    { value: 'Roof safety', label: 'Roof safety' },
    { value: 'Drainage & waste systems', label: 'Drainage & waste systems' },
  ]);
  
  // Separate dialog states for each action
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  
  // Form state for Add/Edit
  const [categoryName, setCategoryName] = useState('');
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<string>('');
  const [selectedCategoryForDelete, setSelectedCategoryForDelete] = useState<string>('');

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Fetch maintenances from API
  useEffect(() => {
    const fetchMaintenances = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('casazero_token');
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('📡 [MAINTENANCE-LIST] Fetching maintenances...');
        const response = await fetch('https://smarthome.attoexasolutions.com/api/maintenance/list', {
          method: 'GET',
          headers,
        });

        const data = await response.json();
        console.log('📥 [MAINTENANCE-LIST] Maintenances response:', data);

        if (data.status === true && Array.isArray(data.data)) {
          setMaintenances(data.data);
          console.log('✅ [MAINTENANCE-LIST] Loaded', data.data.length, 'maintenances');
        } else {
          console.warn('⚠️ [MAINTENANCE-LIST] Invalid response format:', data);
          setMaintenances([]);
        }
      } catch (error) {
        console.error('❌ [MAINTENANCE-LIST] Failed to fetch maintenances:', error);
        setMaintenances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenances();
  }, [refreshKey]);

  // Filter maintenances based on search query and category
  useEffect(() => {
    let filtered = maintenances;
    
    // Apply search query first
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.maintenance_title.toLowerCase().includes(query) ||
          m.maintenance_note?.toLowerCase().includes(query) ||
          m.category?.name?.toLowerCase().includes(query) ||
          m.item?.name?.toLowerCase().includes(query) ||
          m.assigned_user?.name?.toLowerCase().includes(query) ||
          m.residence?.residence_name?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter second
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (m) => m.category?.name === selectedCategory
      );
    }
    
    setFilteredMaintenances(filtered);
  }, [maintenances, searchQuery, selectedCategory]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  // Handle category selection (mirrors handleResidenceSelect from Units)
  const handleCategorySelect = (categoryValue: string | null) => {
    if (categoryValue === null) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(categoryValue);
    }
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
      const response = await fetch('https://smarthome.attoexasolutions.com/api/maintenance/delete', {
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
      const response = await fetch('https://smarthome.attoexasolutions.com/api/maintenance_item/delete', {
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
    const maintenanceItemId = deletingMaintenance.maintenance_item_id || deletingMaintenance.item?.id;
    
    console.log('=== MAINTENANCE DELETE FLOW STARTED ===');
    console.log('Maintenance ID:', maintenanceId);
    console.log('Maintenance Item ID:', maintenanceItemId);

    // STEP 2: Start loading state
    setIsDeleting(true);

    try {
      // STEP 3: Delete Maintenance FIRST
      await deleteMaintenance(maintenanceId);
      
      // STEP 4: Conditionally delete Maintenance Item
      if (maintenanceItemId) {
        // Check if item is used by other maintenances
        const itemUsedElsewhere = isItemUsedElsewhere(maintenanceItemId, maintenanceId);
        
        if (!itemUsedElsewhere) {
          console.log('📦 [CONDITIONAL] Item is NOT used elsewhere - attempting to delete...');
          // Try to delete item, but don't fail if it doesn't work
          const itemDeleted = await deleteMaintenanceItem(maintenanceItemId);
          if (itemDeleted) {
            console.log('✅ [DELETE-FLOW] Both maintenance and item deleted successfully');
          } else {
            console.log('⚠️ [DELETE-FLOW] Maintenance deleted, but item deletion failed (non-fatal)');
          }
        } else {
          console.log('📦 [CONDITIONAL] Item is used by other maintenances - skipping item deletion');
        }
      } else {
        console.log('📦 [CONDITIONAL] No maintenance item ID - skipping item deletion');
      }

      // STEP 5: Update UI
      console.log('🔄 [UI-UPDATE] Removing maintenance from local state...');
      setMaintenances(prev => prev.filter(m => m.id !== maintenanceId));
      
      // Show success toast
      toast.success(t('success'), {
        description: t('maintenanceDeletedSuccess'),
      });
      
      console.log('🎉 Maintenance delete flow completed successfully!');
      
    } catch (error) {
      // STEP 6: Error handling
      console.error('❌ [DELETE-FLOW] Error:', error);
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToDeleteMaintenance'),
      });
      
      // UI remains unchanged on error
    } finally {
      // Reset state
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingMaintenance(null);
      console.log('=== MAINTENANCE DELETE FLOW ENDED ===');
    }
  };

  const handleEdit = (maintenance: Maintenance) => {
    console.log('📝 [EDIT-MAINTENANCE] Edit initiated for maintenance ID:', maintenance.id);
    onEditMaintenance?.(maintenance);
  };

  // Category management handlers - API-ready structure
  const handleAddCategory = async () => {
    // Local validation
    if (!categoryName.trim()) {
      toast.error(t('error') || 'Error', {
        description: t('categoryNameRequired') || 'Category name is required',
      });
      return;
    }

    // Check if category already exists
    const exists = categoryFilters.some(
      cat => cat.value.toLowerCase() === categoryName.trim().toLowerCase() && cat.value !== 'all'
    );
    if (exists) {
      toast.error(t('error') || 'Error', {
        description: t('categoryExists') || 'Category already exists',
      });
      return;
    }

    // TODO: API call to add category
    // Example structure:
    // try {
    //   const response = await fetch('API_ENDPOINT', {
    //     method: 'POST',
    //     headers: getAuthHeaders(),
    //     body: JSON.stringify({ name: categoryName.trim() }),
    //   });
    //   const result = await response.json();
    //   if (result.status === true) {
    //     // Update local state with API response
    //   }
    // } catch (error) {
    //   // Handle error
    // }

    // Optimistic UI update (will be replaced with API response)
    const newCategory = {
      value: categoryName.trim(),
      label: categoryName.trim(),
    };

    // Add new category while preserving "all" at the end
    setCategoryFilters(prev => {
      const allCategory = prev.find(c => c.value === 'all');
      const otherCategories = prev.filter(c => c.value !== 'all');
      return [...otherCategories, newCategory, ...(allCategory ? [allCategory] : [{ value: 'all', label: t('all') || 'All' }])];
    });
    setCategoryName('');
    setShowAddCategoryDialog(false);
    
    toast.success(t('success') || 'Success', {
      description: t('categoryAdded') || 'Category added successfully',
    });
  };

  const handleUpdateCategory = async () => {
    // Local validation
    if (!categoryName.trim() || !selectedCategoryForEdit) {
      toast.error(t('error') || 'Error', {
        description: t('categoryNameRequired') || 'Category name is required',
      });
      return;
    }

    const editingCategory = categoryFilters.find(cat => cat.value === selectedCategoryForEdit);
    if (!editingCategory) {
      toast.error(t('error') || 'Error', {
        description: t('categoryNotFound') || 'Category not found',
      });
      return;
    }

    if (editingCategory.value === 'all') {
      toast.error(t('error') || 'Error', {
        description: t('cannotEditAll') || 'Cannot edit "All" category',
      });
      return;
    }

    // Check if new name conflicts with existing category
    const exists = categoryFilters.some(
      cat => cat.value.toLowerCase() === categoryName.trim().toLowerCase() && cat.value !== editingCategory.value && cat.value !== 'all'
    );
    if (exists) {
      toast.error(t('error') || 'Error', {
        description: t('categoryExists') || 'Category already exists',
      });
      return;
    }

    // TODO: API call to update category
    // Example structure:
    // try {
    //   const response = await fetch('API_ENDPOINT', {
    //     method: 'POST',
    //     headers: getAuthHeaders(),
    //     body: JSON.stringify({ 
    //       id: editingCategory.id, // if available
    //       name: categoryName.trim() 
    //     }),
    //   });
    //   const result = await response.json();
    //   if (result.status === true) {
    //     // Update local state with API response
    //   }
    // } catch (error) {
    //   // Handle error
    // }

    // Optimistic UI update (will be replaced with API response)
    setCategoryFilters(prev => 
      prev.map(cat => 
        cat.value === editingCategory.value 
          ? { value: categoryName.trim(), label: categoryName.trim() }
          : cat
      )
    );

    // Update selected category if it was the one being edited
    if (selectedCategory === editingCategory.value) {
      setSelectedCategory(categoryName.trim());
    }

    setCategoryName('');
    setSelectedCategoryForEdit('');
    setShowEditCategoryDialog(false);
    
    toast.success(t('success') || 'Success', {
      description: t('categoryUpdated') || 'Category updated successfully',
    });
  };

  const handleDeleteCategory = async () => {
    // Local validation
    if (!selectedCategoryForDelete) {
      return;
    }

    if (selectedCategoryForDelete === 'all') {
      toast.error(t('error') || 'Error', {
        description: t('cannotDeleteAll') || 'Cannot delete "All" category',
      });
      return;
    }

    // Check if category is in use
    const isInUse = maintenances.some(m => m.category?.name === selectedCategoryForDelete);
    if (isInUse) {
      toast.error(t('error') || 'Error', {
        description: t('categoryInUse') || 'Cannot delete category that is in use',
      });
      return;
    }

    // TODO: API call to delete category
    // Example structure:
    // try {
    //   const response = await fetch('API_ENDPOINT', {
    //     method: 'POST',
    //     headers: getAuthHeaders(),
    //     body: JSON.stringify({ 
    //       id: categoryToDelete.id, // if available
    //       name: selectedCategoryForDelete 
    //     }),
    //   });
    //   const result = await response.json();
    //   if (result.status === true) {
    //     // Update local state
    //   }
    // } catch (error) {
    //   // Handle error
    // }

    // Optimistic UI update (will be replaced with API response)
    setCategoryFilters(prev => prev.filter(cat => cat.value !== selectedCategoryForDelete));
    
    // Reset to 'all' if deleted category was selected
    if (selectedCategory === selectedCategoryForDelete) {
      setSelectedCategory('all');
    }

    setSelectedCategoryForDelete('');
    setShowDeleteCategoryDialog(false);
    
    toast.success(t('success') || 'Success', {
      description: t('categoryDeleted') || 'Category deleted successfully',
    });
  };

  // Helper to open Edit dialog with category selection
  const handleOpenEditCategoryDialog = () => {
    setSelectedCategoryForEdit('');
    setCategoryName('');
    setShowEditCategoryDialog(true);
  };

  // Helper to open Delete dialog with category selection
  const handleOpenDeleteCategoryDialog = () => {
    setSelectedCategoryForDelete('');
    setShowDeleteCategoryDialog(true);
  };

  // Helper to handle category selection for edit (pre-fills name)
  const handleEditCategorySelect = (categoryValue: string) => {
    setSelectedCategoryForEdit(categoryValue);
    const category = categoryFilters.find(cat => cat.value === categoryValue);
    if (category) {
      setCategoryName(category.label);
    }
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bgClass: 'bg-green-50 text-green-700',
          icon: <CheckCircle className="w-3 h-3" />,
          label: t('completed')
        };
      case 'overdue':
        return {
          bgClass: 'bg-red-50 text-red-700',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: t('overdue')
        };
      case 'pending':
      default:
        return {
          bgClass: 'bg-yellow-50 text-yellow-700',
          icon: <Clock className="w-3 h-3" />,
          label: t('pending')
        };
    }
  };

  // Calculate stats
  const totalMaintenances = maintenances.length;
  const pendingMaintenances = maintenances.filter(m => m.maintenance_status === 'pending').length;
  const overdueMaintenances = maintenances.filter(m => m.maintenance_status === 'overdue').length;

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

        <Button
          onClick={onCreateMaintenance}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addMaintenance')}
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Total Maintenances Card */}
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalMaintenances}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalMaintenances')}</p>
            </div>
          </div>
        </Card>

        {/* Pending Maintenances Card */}
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
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
        </Card>

        {/* Overdue Maintenances Card */}
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
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
                  >
                    <span className="text-neutral-ink-600">
                      {selectedCategory !== 'all'
                        ? categoryFilters.find((c) => c.value === selectedCategory)?.label
                        : 'Filter by Category'}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Search category..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
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
                              selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          All Categories
                        </CommandItem>
                        {categoryFilters.filter(c => c.value !== 'all').map((category) => (
                          <CommandItem
                            key={category.value}
                            value={category.label}
                            onSelect={() => {
                              handleCategorySelect(category.value);
                              setOpenCategoryPopover(false);
                            }}
                            className="cursor-pointer rounded-lg"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCategory === category.value ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <Wrench className="w-4 h-4 mr-2 text-[#6A8F7B]" />
                            {category.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCategory !== 'all' && (
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
                  onClick={() => {
                    setCategoryName('');
                    setShowAddCategoryDialog(true);
                  }}
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
        <Card className="rounded-2xl border border-neutral-line-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingMaintenances')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[15%]">
                      {t('maintenanceTitle')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[8%]">
                      {t('categoryId')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[9%]">
                      {t('item')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[8%]">
                      {t('frequency')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[10%]">
                      {t('assignedTo')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[12%]">
                      {t('residence')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[8%]">
                      {t('unit')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[10%]">
                      {t('dueDate')}
                    </th>
                    <th className="px-3 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider w-[10%]">
                      {t('status')}
                    </th>
                    <th className="px-3 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider w-[6%]">
                      {t('actions')}
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
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center flex-shrink-0">
                                <Wrench className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-neutral-ink-900 truncate">{maintenance.maintenance_title}</p>
                                {maintenance.maintenance_note && (
                                  <p className="text-xs text-neutral-ink-500 truncate">
                                    {maintenance.maintenance_note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 truncate max-w-full">
                              {maintenance.category?.name || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 truncate max-w-full">
                              {maintenance.item?.name || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            <span className="truncate block">{maintenance.maintenance_frequency}</span>
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{maintenance.assigned_user?.name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {maintenance.residence?.residence_name || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            {maintenance.unit?.unit_name ? (
                              <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-green-50 text-green-700 truncate max-w-full">
                                {maintenance.unit.unit_name}
                              </span>
                            ) : (
                              <span className="text-neutral-ink-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            <span className="truncate block">{formatDate(maintenance.due_date)}</span>
                          </td>
                          <td className="px-3 py-4 text-sm text-neutral-ink-600">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${statusBadge.bgClass}`}>
                              {statusBadge.icon}
                              <span className="truncate">{statusBadge.label}</span>
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-line-200"
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
                      {(searchQuery || selectedCategory !== 'all')
                        ? t('noMaintenancesFiltered')
                        : t('noMaintenancesYet')}
                    </p>
                    {(searchQuery || selectedCategory !== 'all') && (
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
            <AlertDialogTitle>{t('deleteMaintenance')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMaintenanceConfirm').replace('{name}', `"${deletingMaintenance?.maintenance_title}"`)}
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
        if (!open) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setCategoryName('');
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
              <Label htmlFor="add-category-name" className="text-neutral-ink-700">
                {t('categoryName') || 'Category Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-category-name"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t('enterCategoryName') || 'Enter category name'}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCategoryDialog(false);
                setCategoryName('');
              }}
              className="rounded-xl"
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={!categoryName.trim()}
              className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add') || 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={(open) => {
        if (!open) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setSelectedCategoryForEdit('');
          setCategoryName('');
        }
        setShowEditCategoryDialog(open);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('editCategory') || 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              {t('updateCategoryInfo') || 'Select a category and update its name'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Category Selector */}
            <div className="space-y-2">
              <Label htmlFor="edit-category-select" className="text-neutral-ink-700">
                {t('selectCategory') || 'Select Category'} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedCategoryForEdit}
                onValueChange={handleEditCategorySelect}
              >
                <SelectTrigger id="edit-category-select" className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectCategoryToEdit') || 'Select category to edit'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categoryFilters
                    .filter(cat => cat.value !== 'all')
                    .map((category) => (
                      <SelectItem
                        key={category.value}
                        value={category.value}
                        className="rounded-lg"
                      >
                        {category.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Name Input */}
            {selectedCategoryForEdit && (
              <div className="space-y-2">
                <Label htmlFor="edit-category-name" className="text-neutral-ink-700">
                  {t('categoryName') || 'Category Name'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-category-name"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t('enterCategoryName') || 'Enter category name'}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateCategory();
                    }
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditCategoryDialog(false);
                setSelectedCategoryForEdit('');
                setCategoryName('');
              }}
              className="rounded-xl"
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={!selectedCategoryForEdit || !categoryName.trim()}
              className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl"
            >
              {t('update') || 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteCategoryDialog} onOpenChange={(open) => {
        if (!open) {
          // Close dialog and reset state when dialog is closed (via X button or cancel)
          setSelectedCategoryForDelete('');
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
                ? t('deleteCategoryConfirm')?.replace('{name}', `"${categoryFilters.find(c => c.value === selectedCategoryForDelete)?.label || selectedCategoryForDelete}"`) || 
                   `Are you sure you want to delete "${categoryFilters.find(c => c.value === selectedCategoryForDelete)?.label || selectedCategoryForDelete}"? This action cannot be undone.`
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
                  value={selectedCategoryForDelete}
                  onValueChange={setSelectedCategoryForDelete}
                >
                  <SelectTrigger id="delete-category-select" className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectCategoryToDelete') || 'Select category to delete'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categoryFilters
                      .filter(cat => cat.value !== 'all')
                      .map((category) => (
                        <SelectItem
                          key={category.value}
                          value={category.value}
                          className="rounded-lg"
                        >
                          {category.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-neutral-ink-700">
                  <strong>{categoryFilters.find(c => c.value === selectedCategoryForDelete)?.label}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCategoryDialog(false);
                setSelectedCategoryForDelete('');
              }}
              className="rounded-xl"
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleDeleteCategory}
              disabled={!selectedCategoryForDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
