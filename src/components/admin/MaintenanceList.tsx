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
  Building2
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
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Track deletion in progress

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

  // Filter maintenances based on search query
  useEffect(() => {
    let filtered = maintenances;
    
    // Apply search query
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
    
    setFilteredMaintenances(filtered);
  }, [maintenances, searchQuery]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
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
      console.error('❌ [DELETE-FLOW] Error:', error);npm 
      
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

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="p-4 rounded-lg border border-neutral-line-200 shadow-sm">
          {/* Search Input */}
          <div className="space-y-1.5">
            <Label htmlFor="search-filter" className="text-xs text-neutral-ink-600">
              {t('search')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-ink-400" />
              <Input
                id="search-filter"
                type="text"
                placeholder={t('searchMaintenances')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 rounded-lg border-neutral-line-200 bg-white focus:border-[#6A8F7B] transition-all duration-200"
              />
            </div>
          </div>

          {/* Filter Status & Clear Button */}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-line-200"
            >
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                    {t('search')}: &quot;{searchQuery}&quot;
                  </span>
                )}
                <span className="text-xs text-neutral-ink-500">
                  {filteredMaintenances.length} {filteredMaintenances.length === 1 ? t('result') : t('results')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 px-3 text-xs rounded-md hover:bg-neutral-line-100"
              >
                {t('clearFilters')}
              </Button>
            </motion.div>
          )}
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
                                alignOffset={0}
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
                      {searchQuery
                        ? t('noMaintenancesFiltered')
                        : t('noMaintenancesYet')}
                    </p>
                    {searchQuery && (
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
    </div>
  );
}
