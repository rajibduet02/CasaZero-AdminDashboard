import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Building2, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  User,
  MoreVertical,
  Loader2,
  CheckCircle2,
  Home,
  List,
  Wrench
} from 'lucide-react';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import { API_BASE, fetchResidencesCatalog, invalidateResidencesCatalog, safeJsonParse,
  apiFetch,
} from '../../utils/api';

interface AdminUser {
  id: number;
  user_name: string;
  profile_image: string | null;
  role: string;
}

interface Residence {
  id: number;
  residence_name: string;
  residence_address: string | null;
  residence_type: 'Condominium' | 'Apartment' | 'House';
  residence_status: string;
  residence_photo: string | null;
  residence_admin: number | null;
  number_of_units: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  admin: AdminUser | null;
}

interface ResidenceListProps {
  onEditResidence: (residence: Residence) => void;
  onCreateResidence: () => void;
  /** Super admin only — condominium admins cannot create residences from this screen. */
  showAddResidenceButton?: boolean;
  refreshKey?: number;
  onViewUnits?: (residenceId: number) => void;
  onViewMaintenance?: (residenceId: number) => void;
}

export function ResidenceList({
  onEditResidence,
  onCreateResidence,
  showAddResidenceButton = true,
  refreshKey,
  onViewUnits,
  onViewMaintenance,
}: ResidenceListProps) {
  const [residences, setResidences] = useState<Residence[]>([]);
  const [filteredResidences, setFilteredResidences] = useState<Residence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResidence, setDeletingResidence] = useState<Residence | null>(null);
  const { t } = useLanguage();

  // Fetch residences from API
  const fetchResidences = async () => {
    setLoading(true);
    try {
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      if (token) {
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      

      const response = await fetchResidencesCatalog();
      
      
      // Log response headers
      response.headers.forEach((value, key) => {
      });
      
      // Check content type
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        console.error('❌ [RESIDENCES] HTTP Error Response');
        console.error('❌ [RESIDENCES] Status Code:', response.status);
        console.error('❌ [RESIDENCES] Status Text:', response.statusText);
        
        // Try to get response body for error details
        const responseText = await response.text();
        console.error('❌ [RESIDENCES] Response Body Length:', responseText.length);
        console.error('❌ [RESIDENCES] Response Body Preview:', responseText.substring(0, 500));
        
        // Check if response is HTML (error page)
        if (contentType?.includes('text/html')) {
          console.error('❌ [RESIDENCES] Server returned HTML instead of JSON');
          console.error('❌ [RESIDENCES] This usually means:');
          console.error('   1. Authentication failed (invalid/expired token)');
          console.error('   2. API endpoint doesn\'t exist');
          console.error('   3. Server error (500)');
          console.error('   4. CORS or middleware issue');
          
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
        
        // Try to parse JSON error
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [RESIDENCES] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (parseError) {
          console.error('❌ [RESIDENCES] Could not parse error response as JSON');
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Parse successful response
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [RESIDENCES] JSON Parse Error:', parseError);
        console.error('❌ [RESIDENCES] Response Text:', responseText.substring(0, 1000));
        throw new Error('Failed to parse server response as JSON');
      }
      
      
      if (result.status && result.data) {
        
        if (result.data.length > 0) {
        }
        
        // Map the data to ensure we're only using residence info and admin (ignoring users array)
        const residencesData = result.data.map((item: any, index: number) => {
          
          return {
            id: item.id,
            residence_name: item.residence_name,
            residence_address: item.residence_address,
            residence_type: item.residence_type,
            residence_status: item.residence_status,
            residence_photo: item.residence_photo,
            residence_admin: item.residence_admin,
            number_of_units: item.number_of_units,
            created_by: item.created_by,
            created_at: item.created_at,
            updated_at: item.updated_at,
            admin: item.admin // Include admin object
            // Ignoring users array as requested
          };
        });
        
        
        setResidences(residencesData);
        setFilteredResidences(residencesData);
        
      } else {
        console.error('❌ [RESIDENCES] API returned unsuccessful status');
        console.error('❌ [RESIDENCES] Result status:', result.status);
        console.error('❌ [RESIDENCES] Result message:', result.message);
        console.error('❌ [RESIDENCES] Result data:', result.data);
        
        toast.error(t('error'), {
          description: result.message || t('failedToLoadResidences'),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [RESIDENCES] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        // Check for specific error types
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [RESIDENCES] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
          console.error('   4. Firewall blocking request');
        } else if (error.message.includes('JSON')) {
          console.error('❌ [RESIDENCES] JSON Parse Error - Server sent invalid JSON');
        } else if (error.message.includes('HTML')) {
          console.error('❌ [RESIDENCES] Server Error - Returned HTML instead of JSON');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: error instanceof Error ? error.message : t('failedToConnect'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Load residences on mount and when refreshKey changes
  useEffect(() => {
    fetchResidences();
  }, [refreshKey]);

  // Filter residences based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredResidences(residences);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = residences.filter(
        (residence) =>
          residence.residence_name.toLowerCase().includes(query) ||
          residence.residence_address?.toLowerCase().includes(query) ||
          residence.residence_type.toLowerCase().includes(query) ||
          residence.admin?.user_name?.toLowerCase().includes(query)
      );
      setFilteredResidences(filtered);
    }
  }, [searchQuery, residences]);

  const handleDelete = (residence: Residence) => {
    setDeletingResidence(residence);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingResidence) return;

    
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      if (token) {
      }
      
      const apiUrl = `${API_BASE}/residences/delete/${deletingResidence.id}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      
      const response = await apiFetch(apiUrl, {
        method: 'DELETE',
        headers,
      });

      
      // Log response headers
      response.headers.forEach((value, key) => {
      });
      
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        console.error('❌ [DELETE-RESIDENCE] HTTP Error Response');
        console.error('❌ [DELETE-RESIDENCE] Status Code:', response.status);
        
        const responseText = await response.text();
        console.error('❌ [DELETE-RESIDENCE] Response Body:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [DELETE-RESIDENCE] Server returned HTML instead of JSON');
          throw new Error(`Server error: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [DELETE-RESIDENCE] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await safeJsonParse(response);

      if (result.status) {
        
        toast.success(t('successExclaim'), {
          description: result.message || t('buildingDeletedSuccess'),
        });
        
        invalidateResidencesCatalog();
        await fetchResidences();
      } else {
        console.error('❌ [DELETE-RESIDENCE] Delete failed - API returned status: false');
        console.error('❌ [DELETE-RESIDENCE] Result:', result);
        toast.error(t('error'), {
          description: result.message || t('failedToDelete'),
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [DELETE-RESIDENCE] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [DELETE-RESIDENCE] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error(t('error'), {
        description: t('failedToDeleteBuildingRetry'),
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeletingResidence(null);
    }
  };

  // Handle view units for a residence
  const handleViewUnits = (residence: Residence) => {
    
    // Navigate to units page if handler is provided
    if (onViewUnits) {
      onViewUnits(residence.id);
    }
  };

  // Handle view maintenance for a residence
  const handleViewResidenceMaintenance = (residenceId: number) => {
    
    // Call handler if provided
    if (onViewMaintenance) {
      onViewMaintenance(residenceId);
    }
  };

  // Calculate stats
  const totalResidences = residences.length;
  const condominiums = residences.filter(r => r.residence_type === 'Condominium').length;
  const apartments = residences.filter(r => r.residence_type === 'Apartment').length;
  const houses = residences.filter(r => r.residence_type === 'House').length;

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
          <h1 className="text-neutral-ink-900 mb-2">{t('residenceManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageProperties')}</p>
        </div>

        {showAddResidenceButton ? (
          <Button
            onClick={onCreateResidence}
            className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('addBuilding')}
          </Button>
        ) : null}
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Card className="p-4 rounded-xl border border-neutral-line-200 inline-flex">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-neutral-ink-900">{totalResidences}</p>
              <p className="text-xs text-neutral-ink-500">{t('totalResidences')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-ink-400" />
            <Input
              type="text"
              placeholder={t('searchBuildings')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
            />
          </div>
        </Card>
      </motion.div>

      {/* Residences Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingBuildings')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('name')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('address')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('numberOfUnits')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('admin')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('units')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('maintenance') || 'Maintenance'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                  {filteredResidences.map((residence) => (
                      <tr
                        key={residence.id}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm text-neutral-ink-900">{residence.residence_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate max-w-xs">{residence.residence_address || t('noAddress')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs ${
                            residence.residence_status === 'Completed'
                              ? 'bg-green-50 text-green-700'
                              : residence.residence_status === 'Under Construction'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-gray-50 text-gray-700'
                          }`}>
                            {residence.residence_status === 'Under Construction' ? t('underConstruction') : residence.residence_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{residence.number_of_units || '0'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{residence.admin?.user_name || t('notAssigned')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button
                            onClick={() => handleViewUnits(residence)}
                            className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
                          >
                            <List className="w-5 h-5 mr-2" />
                            {t('units')}
                          </Button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewResidenceMaintenance(residence.id)}
                            className="h-9 w-9 p-0 rounded-lg hover:bg-[#6A8F7B]/10 hover:text-[#6A8F7B] transition-all"
                            title={t('maintenance') || 'Maintenance'}
                          >
                            <Wrench className="w-4 h-4" />
                          </Button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
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
                                onClick={() => handleViewUnits(residence)}
                                className="cursor-pointer rounded-lg"
                              >
                                <List className="w-4 h-4 mr-2" />
                                {t('units')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEditResidence(residence)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(residence)}
                                className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Empty State */}
              {filteredResidences.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-neutral-ink-500">{t('noBuildings')}</p>
                </motion.div>
              )}
              
              {/* Bottom padding to ensure dropdown menu visibility */}
              {filteredResidences.length > 0 && (
                <div className="h-24" />
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteBuilding')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteBuildingConfirm').replace('{name}', `\"${deletingResidence?.residence_name}\"`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}