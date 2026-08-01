import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  FileText, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  MoreVertical,
  Loader2,
  Upload,
  File,
  User,
  Building2,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { API_BASE, API_ORIGIN, fetchResidencesCatalog, formatDateShort } from '../../utils/api';
import {
  getDocumentCategoryLabel,
  getDocumentTypeLabel,
  type DocumentCategoryLabel,
} from '../../utils/documentLabels';

interface Document {
  id: number;
  document_name: string;
  document_description: string | null;
  file_url: string;
  file_type: string;
  file_size: string; // Already formatted from API (e.g., "220KB", "0.01 MB")
  uploaded_date: string;
  category: {
    id: number;
    category_name: string;
    category_name_it?: string;
  } | null;
  type: {
    id: number;
    type_name: string;
    type_name_it?: string;
  } | null;
  residence: {
    id: number;
    residence_name: string;
  } | null;
  unit?: {
    id: number;
    unit_name: string;
  } | null;
  user?: {
    id: number;
    name: string;
  } | null;
}

interface DocumentListProps {
  onEditDocument?: (document: Document) => void;
  onCreateDocument?: () => void;
  refreshKey?: number;
  filterByUnit?: { unit_id: number; residence_id: number } | null;
}

export function DocumentList({ onEditDocument, onCreateDocument, refreshKey, filterByUnit }: DocumentListProps) {
  const { t, language } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [categoryLabelsById, setCategoryLabelsById] = useState<
    Record<number, DocumentCategoryLabel>
  >({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);

  // Filter states
  const [residences, setResidences] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedResidence, setSelectedResidence] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Function to fetch unit-wise documents from API
  const fetchUnitWiseDocuments = async (unitId: number) => {
    console.log('📋 [DOCUMENTS] Fetching unit-wise documents for unit ID:', unitId);
    setLoading(true);
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [DOCUMENTS] Auth token:', token ? 'Present' : 'Missing');
      
      const apiUrl = `${API_BASE}/web_unit_wise_documents`;
      console.log('📡 [DOCUMENTS] Fetching from:', apiUrl);
      console.log('📤 [DOCUMENTS] Request Body:', { unit_id: unitId });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ unit_id: unitId }),
      });
      
      console.log('📡 [DOCUMENTS] Response status:', response.status);
      console.log('📡 [DOCUMENTS] Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📥 [DOCUMENTS] Unit-wise API Response:', result);
      
      if (result.status && result.data && Array.isArray(result.data)) {
        // The response structure is: data: [{ unit_name: "...", residence: {...}, documents: [...] }]
        // Extract all documents from all units and map residence from parent unit data
        const allDocuments: Document[] = [];
        result.data.forEach((unitData: any) => {
          // Get residence and unit info from parent unit data
          const residence = unitData.residence || null;
          const unitName = unitData.unit_name || null;
          
          console.log('📋 [DOCUMENTS] Processing unit:', {
            unit_name: unitName,
            residence: residence ? {
              id: residence.id,
              residence_name: residence.residence_name
            } : null
          });
          
          if (unitData.documents && Array.isArray(unitData.documents)) {
            unitData.documents.forEach((doc: any) => {
              // Map document with residence from parent unit data
              const mappedDoc: Document = {
                id: doc.id,
                document_name: doc.document_name,
                document_description: doc.document_description || null,
                file_url: doc.file_url,
                file_type: doc.file_type,
                file_size: doc.file_size,
                uploaded_date: doc.uploaded_date,
                category: doc.category || null,
                type: doc.type || null,
                residence: residence, // Use residence from parent unit data
                unit: unitName ? {
                  id: unitId, // Use the unitId parameter
                  unit_name: unitName
                } : null,
                user: doc.user || null,
              };
              allDocuments.push(mappedDoc);
            });
          }
        });
        
        console.log('✅ [DOCUMENTS] Loaded', allDocuments.length, 'documents for unit', unitId);
        console.log('📋 [DOCUMENTS] Sample document residence:', allDocuments[0]?.residence);
        setDocuments(allDocuments);
      } else {
        console.error('❌ [DOCUMENTS] Invalid response format:', result);
        setDocuments([]);
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error fetching unit-wise documents:', error);
      console.error('❌ [DOCUMENTS] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      setDocuments([]);
      toast.error(t('error'), {
        description: t('failedToLoadDocumentsForUnit'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch all documents from API
  const fetchDocuments = async () => {
    console.log('📋 [DOCUMENTS] Fetching documents from API...');
    setLoading(true);
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('casazero_token');
      console.log('🔑 [DOCUMENTS] Auth token:', token ? 'Present' : 'Missing');
      
      const apiUrl = `${API_BASE}/documents`;
      console.log('📡 [DOCUMENTS] Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log('📡 [DOCUMENTS] Response status:', response.status);
      console.log('📡 [DOCUMENTS] Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📥 [DOCUMENTS] API Response:', result);
      
      if (result.status && result.data) {
        console.log('✅ [DOCUMENTS] Loaded', result.data.length, 'documents');
        
        // Map and verify residence objects are present in the response
        const mappedDocuments = result.data.map((doc: any) => {
          // Ensure residence object is properly preserved
          const mappedDoc: Document = {
            id: doc.id,
            document_name: doc.document_name,
            document_description: doc.document_description || null,
            file_url: doc.file_url,
            file_type: doc.file_type,
            file_size: doc.file_size,
            uploaded_date: doc.uploaded_date,
            category: doc.category || null,
            type: doc.type || null,
            residence: doc.residence || null, // Explicitly preserve residence object
            unit: doc.unit || null,
            user: doc.user || null,
          };
          
          // Log residence data for debugging
          if (mappedDoc.residence) {
            console.log(`📋 [DOCUMENTS] Document ID ${mappedDoc.id} - Residence:`, {
              id: mappedDoc.residence.id,
              residence_name: mappedDoc.residence.residence_name
            });
          } else {
            console.log(`⚠️ [DOCUMENTS] Document ID ${mappedDoc.id} - No residence object in API response`);
          }
          
          return mappedDoc;
        });
        
        setDocuments(mappedDocuments);
      } else {
        console.error('❌ [DOCUMENTS] Invalid response format:', result);
        setDocuments([]);
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error fetching documents:', error);
      console.error('❌ [DOCUMENTS] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents from API
  useEffect(() => {
    // If filterByUnit is provided, fetch unit-wise documents
    if (filterByUnit && filterByUnit.unit_id) {
      console.log('📋 [DOCUMENTS] filterByUnit detected, fetching unit-wise documents for unit:', filterByUnit.unit_id);
      fetchUnitWiseDocuments(filterByUnit.unit_id);
    } else {
      // Otherwise, fetch all documents
    fetchDocuments();
    }
  }, [refreshKey, filterByUnit]);

  // Category catalog for bilingual labels (list API often omits category_name_it).
  useEffect(() => {
    const fetchCategoryCatalog = async () => {
      try {
        const response = await fetch(`${API_BASE}/document_categories`);
        const result = await response.json();
        if (result.status && Array.isArray(result.data)) {
          const byId: Record<number, DocumentCategoryLabel> = {};
          for (const row of result.data) {
            byId[row.id] = {
              category_name: row.category_name,
              category_name_it: row.category_name_it,
            };
          }
          setCategoryLabelsById(byId);
        }
      } catch (error) {
        console.error('❌ [DOCUMENTS] Error fetching category catalog:', error);
      }
    };

    fetchCategoryCatalog();
  }, []);

  const resolveDocumentCategoryLabel = (doc: Document): string => {
    const category = doc.category;
    if (!category) return '';
    const catalog = categoryLabelsById[category.id];
    return getDocumentCategoryLabel(
      {
        category_name: catalog?.category_name ?? category.category_name,
        category_name_it: catalog?.category_name_it ?? category.category_name_it,
      },
      language
    );
  };

  // Fetch residences on component mount
  useEffect(() => {
    const fetchResidences = async () => {
      console.log('🏢 [FILTER] Fetching residences...');
      setLoadingResidences(true);
      
      try {
        const response = await fetchResidencesCatalog();
        
        console.log('🏢 [FILTER] Response Status Code:', response.status);
        console.log('🏢 [FILTER] Response OK:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 [FILTER] Residences response:', result);
        
        if (result.status && result.data) {
          setResidences(result.data);
          console.log('✅ [FILTER] Loaded', result.data.length, 'residences');
        } else {
          console.warn('⚠️ [FILTER] API returned status false or no data');
          setResidences([]);
        }
      } catch (error) {
        console.error('❌ [FILTER] Error fetching residences:', error);
        console.error('❌ [FILTER] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
        });
        setResidences([]);
      } finally {
        setLoadingResidences(false);
      }
    };
    
    fetchResidences();
  }, []);

  // Fetch units when residence changes
  useEffect(() => {
    if (!selectedResidence || selectedResidence === 'all') {
      setUnits([]);
      setSelectedUnit('');
      return;
    }
    
    const fetchUnits = async () => {
      console.log('🏘️ [FILTER] Fetching units for residence:', selectedResidence);
      setLoadingUnits(true);
      
      try {
        const response = await fetch(`${API_BASE}/unit_by_residence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ residence_id: selectedResidence }),
        });
        
        const result = await response.json();
        console.log('📥 [FILTER] Units response:', result);
        
        if (result.status && result.data) {
          setUnits(result.data);
          console.log('✅ [FILTER] Loaded', result.data.length, 'units');
        } else {
          setUnits([]);
        }
      } catch (error) {
        console.error('❌ [FILTER] Error fetching units:', error);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };
    
    fetchUnits();
  }, [selectedResidence]);

  // Filter documents based on filterByUnit prop, residence, unit, and search query
  useEffect(() => {
    console.log('🔍 [FILTER] Applying filters...');
    console.log('🔍 [FILTER] filterByUnit prop:', filterByUnit);
    
    let filtered = documents;
    
    // When filterByUnit is provided, documents are already fetched for that unit via API
    // So we don't need to filter again - just show all documents (they're already filtered by API)
    if (filterByUnit && filterByUnit.unit_id) {
      console.log('🏠 [FILTER] Unit-wise documents already fetched for unit:', filterByUnit.unit_id);
      console.log('🏠 [FILTER] Showing all', filtered.length, 'documents (already filtered by API)');
      // No additional filtering needed - API already returned only documents for this unit
    } else {
      // Apply manual filters only when filterByUnit is not active
      
      // Apply residence filter
      if (selectedResidence && selectedResidence !== 'all') {
        filtered = filtered.filter(doc => doc.residence?.id === parseInt(selectedResidence));
        console.log('🏢 [FILTER] Filtered by residence:', filtered.length, 'documents');
      }
      
      // Apply unit filter (this would require unit_id in document data structure)
      // For now, we'll just apply the residence filter
      if (selectedUnit) {
        // TODO: Add unit filtering when unit_id is available in document data
        console.log('🏘️ [FILTER] Unit filter selected:', selectedUnit);
      }
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) => {
        const categoryLabel = resolveDocumentCategoryLabel(doc).toLowerCase();
        const typeLabel = getDocumentTypeLabel(doc.type, language).toLowerCase();
        return (
          doc.document_name.toLowerCase().includes(query) ||
          doc.document_description?.toLowerCase().includes(query) ||
          categoryLabel.includes(query) ||
          typeLabel.includes(query) ||
          doc.category?.category_name?.toLowerCase().includes(query) ||
          doc.category?.category_name_it?.toLowerCase().includes(query) ||
          doc.type?.type_name?.toLowerCase().includes(query) ||
          doc.type?.type_name_it?.toLowerCase().includes(query) ||
          doc.user?.name?.toLowerCase().includes(query) ||
          doc.residence?.residence_name?.toLowerCase().includes(query)
        );
      });
      console.log('🔍 [FILTER] Filtered by search:', filtered.length, 'documents');
    }
    
    setFilteredDocuments(filtered);
    console.log('✅ [FILTER] Final filtered count:', filtered.length);
  }, [documents, selectedResidence, selectedUnit, searchQuery, filterByUnit, language, categoryLabelsById]);

  // Handle residence change
  const handleResidenceChange = (value: string) => {
    setSelectedResidence(value);
    setSelectedUnit(''); // Reset unit when residence changes
    console.log('🏢 [FILTER] Residence selected:', value);
  };

  // Handle unit change
  const handleUnitChange = (value: string) => {
    setSelectedUnit(value);
    console.log('🏘️ [FILTER] Unit selected:', value);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedResidence('');
    setSelectedUnit('');
    setSearchQuery('');
    console.log('🧹 [FILTER] All filters cleared');
  };

  // Get filter status text
  const getFilterStatusText = () => {
    if (selectedUnit && selectedResidence) {
      const unit = units.find(u => u.id === parseInt(selectedUnit));
      return t('filteredByUnit').replace('{name}', unit?.unit_name || t('unknown'));
    }
    if (selectedResidence) {
      const residence = residences.find(r => r.id === parseInt(selectedResidence));
      return t('filteredByResidence').replace('{name}', residence?.residence_name || t('unknown'));
    }
    return null;
  };

  const handleDelete = (document: Document) => {
    setDeletingDocument(document);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument) return;

    console.log('🗑️ [DELETE-DOCUMENT] Delete initiated for document ID:', deletingDocument.id);
    console.log('📋 [DELETE-DOCUMENT] Document name:', deletingDocument.document_name);
    
    try {
      setLoading(true);

      const api_token = localStorage.getItem('casazero_token') || '';
      if (!api_token) {
        throw new Error('Authentication token not found');
      }
      
      const apiUrl = `${API_BASE}/documents/delete/${deletingDocument.id}`;
      console.log('📡 [DELETE-DOCUMENT] API URL:', apiUrl);
      console.log('📡 [DELETE-DOCUMENT] Method: DELETE');
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ api_token }),
      });

      console.log('📡 [DELETE-DOCUMENT] Response status:', response.status);
      console.log('📡 [DELETE-DOCUMENT] Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 [DELETE-DOCUMENT] API Response:', result);

      if (result.status) {
        console.log('✅ [DELETE-DOCUMENT] Document deleted successfully');
        
        toast.success(t('success'), {
          description: result.message || t('documentDeletedSuccess'),
        });
        
        // Refresh the document list
        if (filterByUnit?.unit_id) {
          await fetchUnitWiseDocuments(filterByUnit.unit_id);
        } else {
          await fetchDocuments();
        }
      } else {
        throw new Error(result.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('❌ [DELETE-DOCUMENT] Error deleting document:', error);
      console.error('❌ [DELETE-DOCUMENT] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      
      toast.error(t('error'), {
        description: t('failedToDelete') || 'Failed to delete document. Please try again.',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeletingDocument(null);
    }
  };

  const handleDownload = (doc: Document) => {
    console.log('⬇️ [DOWNLOAD] Download initiated for:', doc.document_name);
    console.log('📎 [DOWNLOAD] File URL:', doc.file_url);
    console.log('📄 [DOWNLOAD] File Type:', doc.file_type);
    
    if (!doc.file_url || doc.file_url.trim() === '') {
      console.error('❌ [DOWNLOAD] Invalid file URL');
      toast.error(t('error'), {
        description: t('invalidFileUrl') || 'Invalid file URL',
      });
      return;
    }

    try {
      // Handle relative URLs by prepending base URL
      let fileUrl = doc.file_url;
      if (fileUrl.startsWith('/')) {
        fileUrl = `${API_ORIGIN}${fileUrl}`;
        console.log('🔗 [DOWNLOAD] Converted relative URL to:', fileUrl);
      }

      console.log('🌐 [DOWNLOAD] Opening file from:', fileUrl);

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = doc.document_name || `document.${doc.file_type}`;
      link.target = '_blank'; // Open in new tab as fallback
      link.rel = 'noopener noreferrer';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [DOWNLOAD] Download triggered successfully:', link.download);
      
      toast.success(t('success'), {
        description: `${t('downloadedSuccessfully') || 'Downloaded successfully'}: ${doc.document_name}`,
      });
    } catch (error) {
      console.error('❌ [DOWNLOAD] Error downloading file:', error);
      console.error('❌ [DOWNLOAD] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      
      toast.error(t('error'), {
        description: t('failedToDownload') || 'Failed to download file. Please try again.',
      });
    }
  };

  // Calculate stats
  const totalDocuments = documents.length;
  const recentUploads = documents.filter(d => {
    if (!d.uploaded_date) return false;
    try {
      const uploadDate = new Date(d.uploaded_date);
      if (isNaN(uploadDate.getTime())) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return uploadDate > weekAgo;
    } catch {
      return false;
    }
  }).length;
  const totalStorage = documents.reduce((sum, doc) => {
    if (!doc.file_size || typeof doc.file_size !== 'string') return sum;
    try {
      const numericValue = parseFloat(doc.file_size.replace(/[^\d.]/g, ''));
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    } catch {
      return sum;
    }
  }, 0);

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
          <h1 className="text-neutral-ink-900 mb-2">{t('documentManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageDocuments')}</p>
        </div>

        <Button
          onClick={onCreateDocument}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addDocument')}
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalDocuments}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalDocuments')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{recentUploads}</p>
              <p className="text-sm text-neutral-ink-500">{t('recentUploads')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]">
              <File className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalStorage.toFixed(2) + ' MB'}</p>
              <p className="text-sm text-neutral-ink-500">{t('storageUsed')}</p>
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
                placeholder={t('searchDocuments')}
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
                {getFilterStatusText() && (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs bg-[#6A8F7B]/10 text-[#6A8F7B]">
                    {getFilterStatusText()}
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                    Search: &quot;{searchQuery}&quot;
                  </span>
                )}
                <span className="text-xs text-neutral-ink-500">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'result' : 'results'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 px-3 text-xs rounded-md hover:bg-neutral-line-100"
              >
                {t('clearFilters') || 'Clear Filters'}
              </Button>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Documents Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingDocuments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('documentName')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('categoryId')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('typeId')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('fileSize')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('uploadedBy')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('residence') || 'Residence'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('unitName') || 'Unit Name'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('uploadedDate')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                  <AnimatePresence>
                    {filteredDocuments.map((doc, index) => (
                      <motion.tr
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-neutral-ink-900">{doc.document_name}</p>
                              {doc.document_description && (
                                <p className="text-xs text-neutral-ink-500 truncate max-w-xs">
                                  {doc.document_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <span className="inline-flex px-3 py-1 rounded-lg text-xs bg-blue-50 text-blue-700">
                            {resolveDocumentCategoryLabel(doc) || t('noCategory')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <span className="inline-flex px-3 py-1 rounded-lg text-xs bg-purple-50 text-purple-700">
                            {getDocumentTypeLabel(doc.type, language) || t('noType')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          {doc.file_size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{doc.user?.name || t('noUser')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate max-w-xs">
                              {doc.residence && doc.residence.residence_name 
                                ? doc.residence.residence_name 
                                : (t('noResidence') || 'No Residence')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          {doc.unit?.unit_name ? (
                            <span className="inline-flex px-3 py-1 rounded-lg text-xs bg-green-50 text-green-700">
                              {doc.unit.unit_name}
                            </span>
                          ) : (
                            <span className="text-neutral-ink-400 italic">{t('noUnit') || 'No Unit'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                          {formatDateShort(doc.uploaded_date)}
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
                                onClick={() => handleDownload(doc)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {t('download')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEditDocument?.(doc)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(doc)}
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
              {filteredDocuments.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-neutral-ink-300" />
                    <p className="text-neutral-ink-600">
                      {(selectedResidence || selectedUnit || searchQuery)
                        ? t('noDocumentsFiltered') || 'No documents found for the selected filters.'
                        : t('noDocuments') || 'No documents available.'}
                    </p>
                    {(selectedResidence || selectedUnit || searchQuery) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-2 rounded-lg hover:bg-neutral-line-100"
                      >
                        {t('clearFilters') || 'Clear Filters'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Bottom padding to ensure dropdown menu visibility */}
              {filteredDocuments.length > 0 && (
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
            <AlertDialogTitle>{t('deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDocumentConfirm').replace('{name}', `"${deletingDocument?.document_name}"`)}
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