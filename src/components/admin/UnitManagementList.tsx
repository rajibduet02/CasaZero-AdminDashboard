import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Home,
  X,
  ChevronDown,
  Upload,
  FileText,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
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
import { UnitForm } from './UnitForm';

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
  id: number;
  username: string;
  profile_image: string | null;
}

interface Unit {
  id: number;
  residence_id: number;
  unit_name: string;
  unit_description: string | null;
  created_at: string;
  updated_at: string;
  residence: Residence;
  user?: User | null;
}

interface UnitManagementListProps {
  onEditUnit: (unit: Unit) => void;
  onCreateUnit: () => void;
  refreshKey?: number;
  filteredResidenceId?: number | null;
  onUploadDocument?: (unit: Unit) => void;
  onViewDocuments?: (unit: Unit) => void;
  onClearFilter?: () => void;
  onFilterChange?: (residenceId: number | null) => void; // Callback to update parent's filteredResidenceId
}

export function UnitManagementList({ onEditUnit, onCreateUnit, refreshKey, filteredResidenceId, onUploadDocument, onViewDocuments, onClearFilter, onFilterChange }: UnitManagementListProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [residenceInfo, setResidenceInfo] = useState<{ residence_id: number; residence_name: string } | null>(null);
  
  // Residence filter dropdown state
  const [residences, setResidences] = useState<Residence[]>([]);
  // Initialize selectedResidenceId from filteredResidenceId prop to preserve filter state
  const [selectedResidenceId, setSelectedResidenceId] = useState<number | null>(filteredResidenceId || null);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [openResidencePopover, setOpenResidencePopover] = useState(false);

  const { t } = useLanguage();

  // Fetch residences for the dropdown filter
  const fetchResidences = async () => {
    setLoadingResidences(true);
    try {
      console.log('🏢 [RESIDENCES-DROPDOWN] Fetching residences for filter...');
      
      const token = localStorage.getItem('casazero_token');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      
      const response = await fetch('https://smarthome.attoexasolutions.com/api/residences', {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📥 [RESIDENCES-DROPDOWN] API Response:', result);
      
      if (result.status && result.data) {
        const residenceList = result.data.map((item: any) => ({
          id: item.id,
          residence_name: item.residence_name,
        }));
        setResidences(residenceList);
        console.log('✅ [RESIDENCES-DROPDOWN] Loaded', residenceList.length, 'residences');
      }
    } catch (error) {
      console.error('❌ [RESIDENCES-DROPDOWN] Error fetching residences:', error);
    } finally {
      setLoadingResidences(false);
    }
  };

  // Handle residence selection
  const handleResidenceSelect = async (residenceId: number | null) => {
    console.log('🏘️ [RESIDENCE-SELECT] Selected residence ID:', residenceId);
    setSelectedResidenceId(residenceId);
    
    // Update parent's filteredResidenceId if callback is provided
    if (onFilterChange) {
      console.log('🔄 [RESIDENCE-SELECT] Updating parent filteredResidenceId:', residenceId);
      onFilterChange(residenceId);
    }
    
    if (residenceId === null) {
      // Clear filter - show all units
      console.log('🔄 [RESIDENCE-SELECT] Clearing filter, loading all units');
      setResidenceInfo(null);
      await fetchUnits();
    } else {
      // Filter by selected residence
      console.log('🔄 [RESIDENCE-SELECT] Filtering by residence ID:', residenceId);
      setLoading(true);
      
      try {
        const requestBody = { residence_id: residenceId };
        console.log('📤 [RESIDENCE-SELECT] Request Body:', requestBody);
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/unit_by_residence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 [RESIDENCE-SELECT] API Response:', result);
        
        // Handle both result.data and result.units (for backward compatibility)
        const unitsData = result.data || result.units;
        
        if (result.status && unitsData) {
          console.log('✅ [RESIDENCE-SELECT] Loaded', unitsData.length, 'units for residence');
          
          // Store residence info
          if (result.residence) {
            setResidenceInfo({
              residence_id: result.residence.id || result.residence.residence_id,
              residence_name: result.residence.residence_name,
            });
          }
          
          // The unit_by_residence API now returns user objects directly in each unit
          // Transform units to match expected format, preserving user object with username
          const transformedUnits = await Promise.all(
            unitsData.map(async (unit: any) => {
              // User object is now included in the API response
              let normalizedUser: { id: number; username: string; profile_image: string | null } | null = null;
              
              if (unit.user && unit.user.id) {
                console.log('🔍 [RESIDENCE-SELECT] Unit', unit.id, '- User object from API:', JSON.stringify(unit.user, null, 2));
                
                // Extract username - check multiple possible field names
                let username = unit.user.username || unit.user.user_name || unit.user.name || '';
                
                // If username is still empty/null, fetch user details from API
                if (!username && unit.user.id) {
                  console.log('🔍 [RESIDENCE-SELECT] Unit', unit.id, '- Username missing, fetching user details for user ID:', unit.user.id);
                  try {
                    const token = localStorage.getItem('casazero_token');
                    const userResponse = await fetch(`https://smarthome.attoexasolutions.com/api/single/user/${unit.user.id}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` }),
                      },
                    });
                    
                    if (userResponse.ok) {
                      const userData = await userResponse.json();
                      console.log('📥 [RESIDENCE-SELECT] User details response for user', unit.user.id, ':', userData);
                      
                      if (userData.status && userData.user) {
                        username = userData.user.user_name || userData.user.username || userData.user.name || '';
                        console.log('✅ [RESIDENCE-SELECT] Fetched username for user', unit.user.id, ':', username);
                      }
                    }
                  } catch (error) {
                    console.error('❌ [RESIDENCE-SELECT] Error fetching user details for user', unit.user.id, ':', error);
                  }
                }
                
                normalizedUser = {
                  id: unit.user.id,
                  username: username || '',
                  profile_image: unit.user.profile_image || null,
                };
                
                console.log('✅ [RESIDENCE-SELECT] Unit', unit.id, '- Normalized user:', JSON.stringify(normalizedUser, null, 2));
              } else {
                console.log('ℹ️ [RESIDENCE-SELECT] Unit', unit.id, '- No user assigned');
              }
              
              return {
                id: unit.id,
                unit_name: unit.unit_name || unit.name,
                unit_description: unit.unit_description || unit.description || '',
                residence_id: unit.residence_id || result.residence?.id || result.residence?.residence_id || residenceId,
                residence: {
                  id: unit.residence?.id || result.residence?.id || result.residence?.residence_id || residenceId,
                  residence_name: unit.residence?.residence_name || result.residence?.residence_name || '',
                },
                created_at: unit.created_at || '',
                updated_at: unit.updated_at || '',
                user: normalizedUser,
              };
            })
          );
          
          setUnits(transformedUnits);
          setFilteredUnits(transformedUnits);
        } else {
          console.error('❌ [RESIDENCE-SELECT] Invalid response format:', result);
          setUnits([]);
          setFilteredUnits([]);
          toast.error('Error', {
            description: result.message || 'Failed to load units',
          });
        }
      } catch (error) {
        console.error('❌ [RESIDENCE-SELECT] Error:', error);
        toast.error('Error', {
          description: 'Failed to load units for selected residence',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch residences on mount
  useEffect(() => {
    fetchResidences();
  }, []);

  // Fetch units from API
  const fetchUnits = async () => {
    setLoading(true);
    try {
      // If filtered by residence, use unit_by_residence API
      if (filteredResidenceId) {
        console.log('🏘️ [UNITS-FILTERED] Fetching units for residence ID:', filteredResidenceId);
        console.log(' [UNITS-FILTERED] Endpoint:', 'https://smarthome.attoexasolutions.com/api/unit_by_residence');
        
        const requestBody = { residence_id: filteredResidenceId };
        console.log('📤 [UNITS-FILTERED] Request Body:', requestBody);
        
        const response = await fetch('https://smarthome.attoexasolutions.com/api/unit_by_residence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 [UNITS-FILTERED] Response Status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 [UNITS-FILTERED] API Response:', result);
        
        // Handle both result.data and result.units (for backward compatibility)
        const unitsData = result.data || result.units;
        
        if (result.status && unitsData) {
          console.log('✅ [UNITS-FILTERED] Loaded', unitsData.length, 'units for residence');
          
          // Store residence info
          if (result.residence) {
            setResidenceInfo({
              residence_id: result.residence.id || result.residence.residence_id,
              residence_name: result.residence.residence_name,
            });
          }
          
          // Transform units to match expected format, preserving user object with username
          // The unit_by_residence API now returns user objects directly in each unit
          const transformedUnits = await Promise.all(
            unitsData.map(async (unit: any) => {
              // User object is now included in the API response
              let normalizedUser: { id: number; username: string; profile_image: string | null } | null = null;
              
              if (unit.user && unit.user.id) {
                console.log('🔍 [UNITS-FILTERED] Unit', unit.id, '- User object from API:', JSON.stringify(unit.user, null, 2));
                
                // Extract username - check multiple possible field names
                let username = unit.user.username || unit.user.user_name || unit.user.name || '';
                
                // If username is still empty/null, fetch user details from API
                if (!username && unit.user.id) {
                  console.log('🔍 [UNITS-FILTERED] Unit', unit.id, '- Username missing, fetching user details for user ID:', unit.user.id);
                  try {
                    const token = localStorage.getItem('casazero_token');
                    const userResponse = await fetch(`https://smarthome.attoexasolutions.com/api/single/user/${unit.user.id}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` }),
                      },
                    });
                    
                    if (userResponse.ok) {
                      const userData = await userResponse.json();
                      console.log('📥 [UNITS-FILTERED] User details response for user', unit.user.id, ':', userData);
                      
                      if (userData.status && userData.user) {
                        username = userData.user.user_name || userData.user.username || userData.user.name || '';
                        console.log('✅ [UNITS-FILTERED] Fetched username for user', unit.user.id, ':', username);
                      }
                    }
                  } catch (error) {
                    console.error('❌ [UNITS-FILTERED] Error fetching user details for user', unit.user.id, ':', error);
                  }
                }
                
                normalizedUser = {
                  id: unit.user.id,
                  username: username || '',
                  profile_image: unit.user.profile_image || null,
                };
                
                console.log('✅ [UNITS-FILTERED] Unit', unit.id, '- Normalized user:', JSON.stringify(normalizedUser, null, 2));
              } else {
                console.log('ℹ️ [UNITS-FILTERED] Unit', unit.id, '- No user assigned');
              }
              
              return {
                id: unit.id,
                unit_name: unit.unit_name || unit.name,
                unit_description: unit.unit_description || unit.description || '',
                residence_id: unit.residence_id || result.residence?.id || result.residence?.residence_id || filteredResidenceId,
                residence: {
                  id: unit.residence?.id || result.residence?.id || result.residence?.residence_id || filteredResidenceId,
                  residence_name: unit.residence?.residence_name || result.residence?.residence_name || '',
                },
                created_at: unit.created_at || '',
                updated_at: unit.updated_at || '',
                user: normalizedUser,
              };
            })
          );
          
          setUnits(transformedUnits);
          setFilteredUnits(transformedUnits);
          console.log('✅ [UNITS-FILTERED] Units set successfully');
        } else {
          console.error('❌ [UNITS-FILTERED] Invalid response format:', result);
          setUnits([]);
          setFilteredUnits([]);
          setResidenceInfo(null);
          toast.error('Error', {
            description: result.message || 'Failed to load units',
          });
        }
        return;
      }
      
      // Otherwise, fetch all units
      console.log('🏠 [UNITS] Fetching all units from API...');
      console.log('🌐 [UNITS] Endpoint:', 'https://smarthome.attoexasolutions.com/api/unit_list');
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [UNITS] Auth token:', token ? 'Present ✓' : 'Missing ✗');
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      
      console.log('📤 [UNITS] Request Headers:', headers);
      console.log('📤 [UNITS] Request Method:', 'GET');
      console.log('⏰ [UNITS] Request Time:', new Date().toISOString());
      
      const response = await fetch('https://smarthome.attoexasolutions.com/api/unit_list', {
        method: 'GET',
        headers,
      });
      
      console.log('📥 [UNITS] Response received');
      console.log('📊 [UNITS] Response Status:', response.status);
      console.log('📊 [UNITS] Response Status Text:', response.statusText);
      console.log('📊 [UNITS] Response OK:', response.ok);
      
      // Log response headers
      console.log('📋 [UNITS] Response Headers:');
      response.headers.forEach((value, key) => {
        console.log(`   ${key}: ${value}`);
      });
      
      const contentType = response.headers.get('content-type');
      console.log('📄 [UNITS] Content-Type:', contentType);
      
      if (!response.ok) {
        console.error('❌ [UNITS] HTTP Error Response');
        console.error('❌ [UNITS] Status Code:', response.status);
        console.error('❌ [UNITS] Status Text:', response.statusText);
        
        const responseText = await response.text();
        console.error('❌ [UNITS] Response Body Preview:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [UNITS] Server returned HTML instead of JSON');
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [UNITS] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (parseError) {
          console.error('❌ [UNITS] Could not parse error response as JSON');
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const result = await safeJsonParse(response);
      
      console.log('📊 [UNITS] Response status field:', result.status);
      console.log('📊 [UNITS] Response message field:', result.message);
      console.log('📊 [UNITS] Response data type:', Array.isArray(result.data) ? 'Array' : typeof result.data);
      
      if (result.status && result.data) {
        console.log('✅ [UNITS] API Success');
        console.log('✅ [UNITS] Total units:', result.data.length);
        
        if (result.data.length > 0) {
          console.log('🏠 [UNITS] Sample unit data:');
          console.log('   ID:', result.data[0].id);
          console.log('   Unit Name:', result.data[0].unit_name);
          console.log('   Residence ID:', result.data[0].residence_id);
          console.log('   Residence Object:', result.data[0].residence);
          console.log('   Description:', result.data[0].unit_description);
          console.log('   User Object:', result.data[0].user);
          if (result.data[0].user) {
            console.log('   User ID:', result.data[0].user.id);
            console.log('   Username:', result.data[0].user.username);
            console.log('   Profile Image:', result.data[0].user.profile_image);
          }
        }
        
        // Preserve user object from API and fetch username if missing
        const unitsWithUser = await Promise.all(
          result.data.map(async (unit: any) => {
            // User object from API already has: { id, username, profile_image }
            // Preserve it as-is, just ensure structure is correct
            let normalizedUser: { id: number; username: string; profile_image: string | null } | null = null;
            
            if (unit.user && unit.user.id) {
              // Log the raw user object from API
              console.log('🔍 [UNITS] Unit', unit.id, '- Raw user object from API:', JSON.stringify(unit.user, null, 2));
              
              // Extract username - check multiple possible field names
              let username = unit.user.username || unit.user.user_name || unit.user.name || '';
              
              // If username is still empty/null, fetch user details from API
              if (!username && unit.user.id) {
                console.log('🔍 [UNITS] Unit', unit.id, '- Username missing, fetching user details for user ID:', unit.user.id);
                try {
                  const token = localStorage.getItem('casazero_token');
                  const userResponse = await fetch(`https://smarthome.attoexasolutions.com/api/single/user/${unit.user.id}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json',
                      ...(token && { 'Authorization': `Bearer ${token}` }),
                    },
                  });
                  
                  if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log('📥 [UNITS] User details response for user', unit.user.id, ':', userData);
                    
                    if (userData.status && userData.user) {
                      username = userData.user.user_name || userData.user.username || userData.user.name || '';
                      console.log('✅ [UNITS] Fetched username for user', unit.user.id, ':', username);
                    }
                  }
                } catch (error) {
                  console.error('❌ [UNITS] Error fetching user details for user', unit.user.id, ':', error);
                }
              }
              
              normalizedUser = {
                id: unit.user.id,
                username: username || '',
                profile_image: unit.user.profile_image || null,
              };
              
              console.log('✅ [UNITS] Unit', unit.id, '- Normalized user:', JSON.stringify(normalizedUser, null, 2));
              
              if (!username) {
                console.error('❌ [UNITS] Unit', unit.id, '- Username is still empty after fetch! Raw user object:', JSON.stringify(unit.user, null, 2));
              }
            } else {
              console.log('ℹ️ [UNITS] Unit', unit.id, '- No user assigned');
            }
            
            const transformedUnit = {
              ...unit,
              user: normalizedUser,
            };
            
            // Final verification
            if (transformedUnit.user) {
              console.log('🎯 [UNITS] Unit', unit.id, '- Final unit.user.username:', transformedUnit.user.username);
            }
            
            return transformedUnit;
          })
        );
        
        // Verify user objects before setting state
        console.log('🔍 [UNITS] Verifying user objects before setting state...');
        unitsWithUser.forEach((unit) => {
          if (unit.user) {
            console.log(`✅ [UNITS] Unit ${unit.id} - user.username:`, unit.user.username);
            if (!unit.user.username) {
              console.error(`❌ [UNITS] Unit ${unit.id} - username is missing! Full user object:`, JSON.stringify(unit.user, null, 2));
            }
          }
        });
        
        setUnits(unitsWithUser);
        setFilteredUnits(unitsWithUser);
        
        console.log('🎉 [UNITS] Fetch completed successfully');
      } else {
        console.error('❌ [UNITS] API returned unsuccessful status');
        console.error('❌ [UNITS] Result status:', result.status);
        console.error('❌ [UNITS] Result message:', result.message);
        
        toast.error('Error', {
          description: result.message || 'Failed to load units',
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [UNITS] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [UNITS] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
          console.error('   4. Firewall blocking request');
        } else if (error.message.includes('JSON')) {
          console.error(' [UNITS] JSON Parse Error - Server sent invalid JSON');
        } else if (error.message.includes('HTML')) {
          console.error('❌ [UNITS] Server Error - Returned HTML instead of JSON');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('══════════════════════════════════════');
      
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to connect to server',
      });
    } finally {
      setLoading(false);
      console.log('🏁 [UNITS] Fetch operation completed (success or failure)');
    }
  };

  // Sync selectedResidenceId with filteredResidenceId prop whenever it changes
  useEffect(() => {
    console.log('🔄 [SYNC] filteredResidenceId prop changed:', filteredResidenceId, 'current selectedResidenceId:', selectedResidenceId);
    if (filteredResidenceId !== null) {
      if (filteredResidenceId !== selectedResidenceId) {
        console.log('🔄 [SYNC] Syncing selectedResidenceId with filteredResidenceId prop:', filteredResidenceId);
        setSelectedResidenceId(filteredResidenceId);
      }
    } else {
      // Only clear if it's actually set
      if (selectedResidenceId !== null) {
        console.log('🔄 [SYNC] Clearing selectedResidenceId to match filteredResidenceId prop');
        setSelectedResidenceId(null);
        setResidenceInfo(null);
      }
    }
  }, [filteredResidenceId]); // Only depend on filteredResidenceId, not selectedResidenceId to avoid loops

  // Load units on mount and when refreshKey or filteredResidenceId changes
  useEffect(() => {
    console.log('🔄 [REFRESH] Refresh triggered - refreshKey:', refreshKey, 'filteredResidenceId prop:', filteredResidenceId, 'selectedResidenceId state:', selectedResidenceId);
    
    // fetchUnits() uses filteredResidenceId prop directly, so filtering will work correctly
    // We sync selectedResidenceId for UI display purposes (dropdown selection)
    if (filteredResidenceId !== null) {
      // If filteredResidenceId is set, ensure selectedResidenceId matches for UI
      if (filteredResidenceId !== selectedResidenceId) {
        console.log('🔄 [REFRESH] Syncing selectedResidenceId with filteredResidenceId for UI:', filteredResidenceId);
        setSelectedResidenceId(filteredResidenceId);
      }
    } else {
      // Clear local filter state when filteredResidenceId is cleared
      if (selectedResidenceId !== null || residenceInfo !== null) {
        console.log('🔄 [REFRESH] Clearing local filter state');
        setResidenceInfo(null);
        setSelectedResidenceId(null);
      }
    }
    
    // fetchUnits() will use filteredResidenceId prop to determine if filtering is needed
    fetchUnits();
  }, [refreshKey, filteredResidenceId]);

  // Filter units based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUnits(units);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = units.filter(
        (unit) =>
          unit.unit_name.toLowerCase().includes(query) ||
          unit.unit_description?.toLowerCase().includes(query) ||
          unit.residence?.residence_name?.toLowerCase().includes(query) ||
          unit.user?.username?.toLowerCase().includes(query)
      );
      setFilteredUnits(filtered);
    }
  }, [searchQuery, units]);

  const handleDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUnit) return;

    console.log('═══════════════════════════════════════');
    console.log('🗑️ [DELETE-UNIT] DELETE OPERATION STARTED');
    console.log('═══════════════════════════════════════');
    console.log('🗑️ [DELETE-UNIT] Unit ID:', deletingUnit.id);
    console.log('🗑️ [DELETE-UNIT] Unit Name:', deletingUnit.unit_name);
    console.log('🗑️ [DELETE-UNIT] Timestamp:', new Date().toISOString());
    
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [DELETE-UNIT] Auth token:', token ? 'Present ✓' : 'Missing ✗');
      
      const apiUrl = 'https://smarthome.attoexasolutions.com/api/unit_delete';
      const requestBody = { id: deletingUnit.id };
      
      console.log('🌐 [DELETE-UNIT] API Endpoint:', apiUrl);
      console.log('📤 [DELETE-UNIT] Request Method:', 'POST');
      console.log('📤 [DELETE-UNIT] Request Body:', requestBody);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      console.log('📤 [DELETE-UNIT] Request Headers:', headers);
      
      console.log('🔄 [DELETE-UNIT] Sending delete request...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('📥 [DELETE-UNIT] Response received');
      console.log('📊 [DELETE-UNIT] Response Status:', response.status);
      console.log('📊 [DELETE-UNIT] Response Status Text:', response.statusText);
      console.log('📊 [DELETE-UNIT] Response OK:', response.ok);
      
      const contentType = response.headers.get('content-type');
      console.log('📄 [DELETE-UNIT] Content-Type:', contentType);

      if (!response.ok) {
        console.error('❌ [DELETE-UNIT] HTTP Error Response');
        console.error('❌ [DELETE-UNIT] Status Code:', response.status);
        
        const responseText = await response.text();
        console.error('❌ [DELETE-UNIT] Response Body:', responseText.substring(0, 500));
        
        if (contentType?.includes('text/html')) {
          console.error('❌ [DELETE-UNIT] Server returned HTML instead of JSON');
          throw new Error(`Server error: ${response.status}`);
        }
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [DELETE-UNIT] Error Data:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await safeJsonParse(response);
      console.log('📥 [DELETE-UNIT] API Response:', result);
      console.log('📊 [DELETE-UNIT] Response status field:', result.status);
      console.log('📊 [DELETE-UNIT] Response message field:', result.message);

      if (result.status) {
        console.log('✅ [DELETE-UNIT] Unit deleted successfully');
        console.log('✅ [DELETE-UNIT] Success message:', result.message);
        
        toast.success('Success!', {
          description: result.message || `${deletingUnit.unit_name} has been deleted successfully`,
        });
        
        console.log('🔄 [DELETE-UNIT] Refreshing unit list...');
        await fetchUnits();
        console.log('✅ [DELETE-UNIT] Unit list refreshed');
      } else {
        console.error('❌ [DELETE-UNIT] Delete failed - API returned status: false');
        console.error('❌ [DELETE-UNIT] Result:', result);
        toast.error('Error', {
          description: result.message || 'Failed to delete unit',
        });
      }
    } catch (error) {
      console.error('═══════════════════════════════════════');
      console.error('❌ [DELETE-UNIT] EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error) {
        console.error('Error Stack:', error.stack);
        
        if (error.message.includes('Failed to fetch')) {
          console.error('❌ [DELETE-UNIT] Network Error - Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. API server is down');
          console.error('   3. CORS issue');
        }
      }
      
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════');
      
      toast.error('Error', {
        description: 'Failed to delete unit. Please try again.',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeletingUnit(null);
      console.log('🏁 [DELETE-UNIT] Delete operation completed');
      console.log('═══════════════════════════════════════');
    }
  };

  // Calculate stats
  const totalUnits = units.length;
  const residenceGroups = units.reduce((acc, unit) => {
    const residenceName = unit.residence?.residence_name || 'Unknown';
    acc[residenceName] = (acc[residenceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-neutral-ink-900 mb-2">{t('unitManagement')}</h1>
          <p className="text-neutral-ink-500">Manage all units across residences</p>
        </div>

        <Button
          onClick={onCreateUnit}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addUnit') || 'Add Unit'}
        </Button>
      </motion.div>

      {/* Filtered by Residence Badge */}
      {filteredResidenceId && residenceInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 rounded-xl border border-[#6A8F7B] bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-neutral-ink-600">{t('showingUnitsFor') || 'Showing units for'}</p>
                  <p className="text-neutral-ink-900">{residenceInfo.residence_name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onClearFilter) {
                    onClearFilter();
                  } else {
                    // Fallback: clear local state and fetch all units
                    setResidenceInfo(null);
                    setSelectedResidenceId(null);
                    fetchUnits();
                  }
                }}
                className="rounded-lg hover:bg-white/50"
              >
                <X className="w-4 h-4 mr-2" />
                {t('clearFilter') || 'Clear Filter'}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalUnits}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalUnits') || 'Total Units'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{Object.keys(residenceGroups).length}</p>
              <p className="text-sm text-neutral-ink-500">{t('residences') || 'Residences'}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Residence Filter Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            {/* Residence Filter */}
            <div className="flex items-center gap-3 flex-1">
              <Building2 className="w-5 h-5 text-neutral-ink-400" />
              <Popover open={openResidencePopover} onOpenChange={setOpenResidencePopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openResidencePopover}
                    className="w-full justify-between rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                    disabled={loadingResidences}
                  >
                    <span className="text-neutral-ink-600">
                      {(selectedResidenceId || filteredResidenceId)
                        ? residences.find((r) => r.id === (selectedResidenceId || filteredResidenceId))?.residence_name
                        : 'Filter by Residence'}
                    </span>
                    {loadingResidences ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Search residence..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No residence found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-residences"
                          onSelect={() => {
                            handleResidenceSelect(null);
                            setOpenResidencePopover(false);
                          }}
                          className="cursor-pointer rounded-lg"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedResidenceId === null ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          All Residences
                        </CommandItem>
                        {residences.map((residence) => (
                          <CommandItem
                            key={residence.id}
                            value={residence.residence_name}
                            onSelect={() => {
                              handleResidenceSelect(residence.id);
                              setOpenResidencePopover(false);
                            }}
                            className="cursor-pointer rounded-lg"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedResidenceId === residence.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <Building2 className="w-4 h-4 mr-2 text-[#6A8F7B]" />
                            {residence.residence_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedResidenceId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResidenceSelect(null)}
                  className="rounded-lg hover:bg-neutral-line-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder="Search Units"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Units Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="relative"
      >
        <Card className="rounded-2xl border border-neutral-line-200 overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loading') || 'Loading units...'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('unitName') || 'Unit Name'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('residence') || 'Residence'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('assignedTo') || 'Assigned To'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('description')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('documents') || 'Documents'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                  <AnimatePresence>
                    {filteredUnits.map((unit, index) => (
                      <motion.tr
                        key={unit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                              <Home className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm text-neutral-ink-900">{unit.unit_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{unit.residence?.residence_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {unit.user ? (
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage 
                                  src={unit.user.profile_image || undefined} 
                                  alt={unit.user.username || 'User'}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] text-white text-xs">
                                  {unit.user.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span 
                                className="text-sm text-neutral-ink-900 truncate" 
                                title={unit.user.username || 'User'}
                                onMouseEnter={() => {
                                  if (!unit.user?.username) {
                                    console.warn('⚠️ [RENDER] Unit', unit.id, '- User object at render time:', JSON.stringify(unit.user, null, 2));
                                  }
                                }}
                              >
                                {unit.user.username || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-ink-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-ink-600">
                          <span className="truncate max-w-md block">{unit.unit_description || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUploadDocument && onUploadDocument(unit)}
                              className="h-9 w-9 p-0 rounded-lg hover:bg-[#6A8F7B]/10 hover:text-[#6A8F7B] transition-all"
                              title="Upload Documents"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDocuments && onViewDocuments(unit)}
                              className="h-9 w-9 p-0 rounded-lg hover:bg-[#6A8F7B]/10 hover:text-[#6A8F7B] transition-all"
                              title="View Documents"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
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
                              className="w-56 rounded-xl"
                            >
                              <DropdownMenuItem
                                onClick={() => onEditUnit(unit)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(unit)}
                                className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Empty State */}
              {filteredUnits.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-neutral-ink-500">{t('noUnits') || 'No units found'}</p>
                </motion.div>
              )}
              
              {/* Bottom padding to ensure dropdown menu visibility */}
              {filteredUnits.length > 0 && (
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
            <AlertDialogTitle>{t('deleteUnit') || 'Delete Unit'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingUnit?.unit_name}&quot;? This action cannot be undone.
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