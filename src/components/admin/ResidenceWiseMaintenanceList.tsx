import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Wrench,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
  Building2,
  ChevronDown,
  Check,
  X,
  CheckCircle,
  Clock,
  CalendarClock,
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
import { useLanguage } from '../../utils/LanguageContext';
import {
  API_BASE,
  fetchResidencesCatalog,
  formatDate,
  residencesArrayFromApiResult,
  safeJsonParse,
} from '../../utils/api';
import {
  ResidenceWiseMaintenanceForm,
  type ResidenceOption,
  type ResidenceWiseMaintenanceEditData,
} from './ResidenceWiseMaintenanceForm';

interface MaintenanceRow {
  id: number;
  maintenance_title: string;
  maintenance_note?: string | null;
  due_date: string;
  last_maintenance_date?: string | null;
  category?: {
    id: number;
    name_en: string;
    name_it: string;
  } | null;
  maintenance_frequency?: {
    id: number;
    name_en: string;
    name_it: string;
  } | null;
  maintenance_priority?: {
    id: number;
    name: string;
    priority_type?: string;
  } | null;
  item?: {
    id: number;
    item_name_en?: string;
    item_name_it?: string;
  } | null;
  residence_id?: number;
  /** Residence-wise status from the API (pivot `status`, falls back to `maintenance_status`). */
  status?: string | null;
  maintenance_status?: string | null;
  /** Pivot row id (`maintenance_residence` table) — required by the update API. */
  maintenance_residence_id?: number;
  company?: {
    id: number;
    company_name?: string;
  } | null;
}

function normalizeResidenceWiseRow(raw: unknown, residenceId: number): MaintenanceRow {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const priority =
    r.priority && typeof r.priority === 'object' ? (r.priority as Record<string, unknown>) : null;
  const priorityInfo =
    r.priority_info && typeof r.priority_info === 'object'
      ? (r.priority_info as Record<string, unknown>)
      : null;

  let maintenance_priority: MaintenanceRow['maintenance_priority'];
  if (priority && (priority.name != null || priority.priority_type != null)) {
    maintenance_priority = {
      id: typeof priority.id === 'number' ? priority.id : Number(priority.id) || 0,
      name: String(priority.name ?? priorityInfo?.name ?? ''),
      priority_type: String(priority.priority_type ?? priorityInfo?.type ?? ''),
    };
  } else if (priorityInfo?.name != null) {
    maintenance_priority = {
      id: 0,
      name: String(priorityInfo.name),
      priority_type: String(priorityInfo.type ?? ''),
    };
  } else {
    maintenance_priority = undefined;
  }

  return {
    ...(r as unknown as MaintenanceRow),
    maintenance_priority,
    residence_id: residenceId,
  };
}

/**
 * API priority types: optional | mandatory | administrative.
 * UI shows only administrative (IT alias: condominiale).
 */
function isAdministrativePriorityType(priorityType: string | null | undefined): boolean {
  const normalized = (priorityType ?? '').trim().toLowerCase();
  return normalized === 'administrative' || normalized === 'condominiale';
}

/** Normalize status variations (in progress / in-progress / in_progress / inprogress). */
function normalizeStatus(status: string | null | undefined): string {
  if (!status) return '';
  const normalized = status.toLowerCase();
  if (normalized === 'in progress' || normalized === 'in-progress' || normalized === 'in_progress') {
    return 'inprogress';
  }
  return normalized;
}

function getPriorityBadgeColors(priorityName: string): {
  bg: string;
  text: string;
  border: string;
} {
  const normalized = priorityName?.toUpperCase();
  switch (normalized) {
    case 'N1':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'N2':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'N3':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

interface ResidenceWiseMaintenanceListProps {
  refreshKey?: number;
  /** When set (e.g. from Residences list), pre-select and load that residence. */
  initialResidenceId?: number | null;
}

export function ResidenceWiseMaintenanceList({
  refreshKey,
  initialResidenceId = null,
}: ResidenceWiseMaintenanceListProps) {
  const { t, language } = useLanguage();

  const [residences, setResidences] = useState<ResidenceOption[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [openResidencePopover, setOpenResidencePopover] = useState(false);
  const [selectedResidenceId, setSelectedResidenceId] = useState<number | null>(
    initialResidenceId ?? null,
  );

  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<MaintenanceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiTotal, setApiTotal] = useState<number | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<MaintenanceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ResidenceWiseMaintenanceEditData | null>(null);

  const formatDateDisplay = (dateString: string | null | undefined) =>
    formatDate(dateString, { language: language === 'it' ? 'it' : 'en' });

  const getStatusBadge = (status: string | null | undefined) => {
    switch (normalizeStatus(status)) {
      case 'completed':
        return {
          bgClass: 'bg-green-50 text-green-700',
          icon: <CheckCircle className="w-3 h-3" />,
          label: t('completed') || 'Completed',
        };
      case 'overdue':
        return {
          bgClass: 'bg-red-50 text-red-700',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: t('overdue') || 'Overdue',
        };
      case 'due':
        return {
          bgClass: 'bg-orange-50 text-orange-700',
          icon: <CalendarClock className="w-3 h-3" />,
          label: t('due') || 'Due',
        };
      case 'inprogress':
        return {
          bgClass: 'bg-blue-50 text-blue-700',
          icon: <Loader2 className="w-3 h-3" />,
          label: t('inProgress') || 'In Progress',
        };
      case 'pending':
        return {
          bgClass: 'bg-yellow-50 text-yellow-700',
          icon: <Clock className="w-3 h-3" />,
          label: t('pending') || 'Pending',
        };
      default:
        return null;
    }
  };

  useEffect(() => {
    const loadResidences = async () => {
      setLoadingResidences(true);
      try {
        const response = await fetchResidencesCatalog();
        const result = await safeJsonParse<Record<string, unknown>>(response);
        const list = residencesArrayFromApiResult(result)
          .map((row) => {
            const r = row as { id?: unknown; residence_name?: unknown };
            return {
              id: Number(r.id),
              residence_name: String(r.residence_name ?? ''),
            };
          })
          .filter((r) => !Number.isNaN(r.id) && r.id > 0);
        setResidences(list);
      } catch (err) {
        console.error('❌ [RESIDENCE-WISE-MAINT] Failed to load residences:', err);
        setResidences([]);
      } finally {
        setLoadingResidences(false);
      }
    };
    void loadResidences();
  }, []);

  // Sync pre-selected residence from Residences list navigation.
  useEffect(() => {
    if (initialResidenceId == null || Number.isNaN(Number(initialResidenceId))) {
      return;
    }
    setSelectedResidenceId(Number(initialResidenceId));
    setSearchQuery('');
    setSelectedCategoryId(null);
  }, [initialResidenceId]);

  const fetchMaintenances = async (residenceId: number) => {
    setLoading(true);
    setError(null);
    try {
      const apiToken = localStorage.getItem('casazero_token') || '';
      if (!apiToken) {
        setMaintenances([]);
        setApiTotal(null);
        setError('Missing API token. Please login again.');
        return;
      }

      const response = await fetch(`${API_BASE}/residence_wise/maintenance`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ residence_id: residenceId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await safeJsonParse<{
        status?: unknown;
        message?: string;
        total_maintenance?: number;
        data?: unknown[];
      }>(response);

      if (data.status === true || data.status === 1 || data.status === 'true') {
        const rows = Array.isArray(data.data) ? data.data : [];
        const mapped = rows
          .map((raw) => normalizeResidenceWiseRow(raw, residenceId))
          .filter((m) =>
            isAdministrativePriorityType(m.maintenance_priority?.priority_type),
          );
        setMaintenances(mapped);
        setApiTotal(mapped.length);
        setError(null);
      } else {
        setMaintenances([]);
        setApiTotal(null);
        setError(data.message || t('failedToLoadMaintenancesDesc') || 'Failed to load maintenances');
      }
    } catch (err) {
      console.error('❌ [RESIDENCE-WISE-MAINT] Fetch failed:', err);
      setMaintenances([]);
      setApiTotal(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedResidenceId == null) {
      setMaintenances([]);
      setApiTotal(null);
      setError(null);
      return;
    }
    void fetchMaintenances(selectedResidenceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResidenceId, refreshKey]);

  const categoriesFromData = useMemo(() => {
    const map = new Map<number, { id: number; name_en: string; name_it: string }>();
    for (const m of maintenances) {
      if (m.category?.id != null) {
        map.set(m.category.id, {
          id: m.category.id,
          name_en: m.category.name_en || '',
          name_it: m.category.name_it || '',
        });
      }
    }
    return Array.from(map.values());
  }, [maintenances]);

  useEffect(() => {
    let filtered = maintenances;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const categoryName =
          language === 'it'
            ? m.category?.name_it || m.category?.name_en || ''
            : m.category?.name_en || '';
        const frequencyName =
          language === 'it'
            ? m.maintenance_frequency?.name_it || m.maintenance_frequency?.name_en || ''
            : m.maintenance_frequency?.name_en || '';
        return (
          m.maintenance_title?.toLowerCase().includes(query) ||
          m.maintenance_note?.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query) ||
          frequencyName.toLowerCase().includes(query) ||
          m.maintenance_priority?.name?.toLowerCase().includes(query)
        );
      });
    }

    if (selectedCategoryId !== null) {
      filtered = filtered.filter((m) => m.category?.id === selectedCategoryId);
    }

    setFilteredMaintenances(filtered);
  }, [maintenances, searchQuery, selectedCategoryId, language]);

  const selectedResidenceName =
    residences.find((r) => r.id === selectedResidenceId)?.residence_name || '';

  const handleResidenceSelect = (id: number | null) => {
    setSelectedResidenceId(id);
    setSearchQuery('');
    setSelectedCategoryId(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
  };

  const handleEdit = (maintenance: MaintenanceRow) => {
    if (maintenance.maintenance_residence_id == null) {
      toast.error(t('error') || 'Error', {
        description: t('failedToUpdateMaintenance') || 'Failed to update maintenance',
      });
      return;
    }
    setEditingRow({
      id: maintenance.maintenance_residence_id,
      residence_id: maintenance.residence_id ?? selectedResidenceId,
      maintenance_id: maintenance.id,
      company_id: maintenance.company?.id ?? null,
      status: maintenance.status ?? maintenance.maintenance_status ?? null,
      due_date: maintenance.due_date ?? null,
    });
    setAddFormOpen(true);
  };

  const handleDelete = (maintenance: MaintenanceRow) => {
    setDeletingMaintenance(maintenance);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMaintenance) return;
    if (deletingMaintenance.maintenance_residence_id == null) {
      toast.error(t('error') || 'Error', {
        description: t('failedToDeleteMaintenance') || 'Failed to delete maintenance',
      });
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('casazero_token') || '';
      const response = await fetch(`${API_BASE}/maintenanceResidence/delete`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          api_token: token,
          // Pivot row id (maintenance_residence), not the maintenance's own id.
          id: deletingMaintenance.maintenance_residence_id,
        }),
      });
      const result = await response.json();
      if (result.status === true) {
        toast.success(t('success') || 'Success', {
          description:
            result.message || t('maintenanceDeletedSuccess') || 'Maintenance deleted successfully',
        });
        setDeleteDialogOpen(false);
        setDeletingMaintenance(null);
        if (selectedResidenceId != null) {
          void fetchMaintenances(selectedResidenceId);
        }
      } else {
        throw new Error(result.message || t('failedToDeleteMaintenance'));
      }
    } catch (err) {
      toast.error(t('error') || 'Error', {
        description:
          err instanceof Error
            ? err.message
            : t('failedToDeleteMaintenance') || 'Failed to delete maintenance',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCardCount = apiTotal ?? maintenances.length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-neutral-ink-900 mb-2">{t('residenceWiseMaintenances')}</h1>
          <p className="text-neutral-ink-500">{t('residenceWiseMaintenancesSubtitle')}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200 ring-2 ring-[#6A8F7B]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl text-neutral-ink-900">{totalCardCount}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalMaintenances')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Residence Filter */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Building2 className="w-5 h-5 text-neutral-ink-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <Popover open={openResidencePopover} onOpenChange={setOpenResidencePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openResidencePopover}
                      className="w-full h-10 justify-between rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                      disabled={loadingResidences}
                    >
                      <span className="text-neutral-ink-600 truncate text-left">
                        {loadingResidences
                          ? t('loading') || 'Loading...'
                          : selectedResidenceId != null
                            ? selectedResidenceName
                            : t('selectResidence') || 'Select a residence'}
                      </span>
                      {loadingResidences ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                    <Command>
                      <CommandInput
                        placeholder={t('searchResidence') || 'Search residence...'}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>{t('noResidenceFound') || 'No residence found.'}</CommandEmpty>
                        <CommandGroup>
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
                                className={`mr-2 h-4 w-4 shrink-0 ${
                                  selectedResidenceId === residence.id ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <Building2 className="w-4 h-4 mr-2 text-[#6A8F7B] shrink-0" />
                              <span className="truncate">{residence.residence_name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-8 h-10 shrink-0 flex items-center justify-center">
                {selectedResidenceId != null ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResidenceSelect(null)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-line-200"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Wrench className="w-5 h-5 text-neutral-ink-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategoryPopover}
                      className="w-full h-10 justify-between rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                      disabled={selectedResidenceId == null || categoriesFromData.length === 0}
                    >
                      <span className="text-neutral-ink-600 truncate text-left">
                        {selectedCategoryId != null
                          ? (() => {
                              const cat = categoriesFromData.find((c) => c.id === selectedCategoryId);
                              if (!cat) return t('all') || 'All';
                              return language === 'it'
                                ? cat.name_it || cat.name_en
                                : cat.name_en || cat.name_it;
                            })()
                          : language === 'it'
                            ? 'Filtra per categoria'
                            : 'Filter by Category'}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                    <Command>
                      <CommandInput
                        placeholder={t('searchCategory') || 'Search category...'}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>{t('noCategoryFound') || 'No category found'}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all-categories"
                            onSelect={() => {
                              setSelectedCategoryId(null);
                              setOpenCategoryPopover(false);
                            }}
                            className="cursor-pointer rounded-lg"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 shrink-0 ${
                                selectedCategoryId === null ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {t('allCategories') || 'All Categories'}
                          </CommandItem>
                          {categoriesFromData.map((category) => {
                            const label =
                              language === 'it'
                                ? category.name_it || category.name_en
                                : category.name_en || category.name_it;
                            return (
                              <CommandItem
                                key={category.id}
                                value={label}
                                onSelect={() => {
                                  setSelectedCategoryId(category.id);
                                  setOpenCategoryPopover(false);
                                }}
                                className="cursor-pointer rounded-lg"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 shrink-0 ${
                                    selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <Wrench className="w-4 h-4 mr-2 text-[#6A8F7B] shrink-0" />
                                <span className="truncate">{label}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-8 h-10 shrink-0 flex items-center justify-center">
                {selectedCategoryId !== null ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategoryId(null)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-neutral-line-200"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Search className="w-5 h-5 text-neutral-ink-400 shrink-0" />
              <Input
                type="text"
                placeholder={t('searchMaintenances') || 'Search Maintenances'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                disabled={selectedResidenceId == null}
              />
              {/* Spacer matches clear-button width on the other filters */}
              <div className="w-8 h-10 shrink-0" aria-hidden />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200 relative overflow-hidden">
          {selectedResidenceId == null ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Building2 className="w-12 h-12 text-neutral-ink-300 mb-4" />
              <p className="text-neutral-ink-600">
                {t('selectResidenceFirst') || 'Select residence first'}
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">
                {t('loadingMaintenances') || 'Loading maintenances...'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-neutral-ink-600 mb-2">{t('error') || 'Error'}</p>
              <p className="text-neutral-ink-500 text-sm">{error}</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table
                className="w-full table-auto divide-y divide-neutral-line-200"
                style={{ minWidth: '100%' }}
              >
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '14%', minWidth: '180px' }}
                    >
                      {t('maintenanceTitle') || 'Maintenance Title'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '12%', minWidth: '150px' }}
                    >
                      {t('maintenanceNote') || 'Maintenance Note'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '7%', minWidth: '80px' }}
                    >
                      {t('priority') || 'Priority'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '10%', minWidth: '120px' }}
                    >
                      {t('category') || 'Category'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '8%', minWidth: '100px' }}
                    >
                      {t('frequency') || 'Frequency'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '8%', minWidth: '90px' }}
                    >
                      {t('status') || 'Status'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '8%', minWidth: '100px' }}
                    >
                      {t('dueDate') || 'Due Date'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '8%', minWidth: '120px' }}
                    >
                      {t('lastMaintenanceDate') || 'Last Maintenance Date'}
                    </th>
                    <th
                      className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider"
                      style={{ width: '3%', minWidth: '60px' }}
                    >
                      {t('actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                  <AnimatePresence>
                    {filteredMaintenances.map((maintenance, index) => (
                      <motion.tr
                        key={maintenance.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        className="hover:bg-neutral-line-100 transition-colors duration-200"
                      >
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
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                          <span className="break-words whitespace-normal block">
                            {maintenance.maintenance_note || '—'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                          {maintenance.maintenance_priority?.name ? (
                            <div className="flex flex-col items-start gap-1">
                              {(() => {
                                const priorityName = maintenance.maintenance_priority.name;
                                const colors = getPriorityBadgeColors(priorityName);
                                return (
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} whitespace-nowrap`}
                                  >
                                    {priorityName}
                                  </span>
                                );
                              })()}
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
                        <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                          <div className="max-w-full">
                            {(() => {
                              const category = maintenance.category;
                              if (!category) {
                                return (
                                  <span className="text-xs sm:text-sm text-neutral-ink-400">—</span>
                                );
                              }
                              const categoryName =
                                language === 'it'
                                  ? category.name_it || category.name_en || '—'
                                  : category.name_en || '—';
                              return (
                                <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 break-words whitespace-normal max-w-full">
                                  {categoryName}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                          {(() => {
                            const frequency = maintenance.maintenance_frequency;
                            if (!frequency) {
                              return <span className="text-neutral-ink-400">—</span>;
                            }
                            const freqName =
                              language === 'it'
                                ? frequency.name_it || frequency.name_en || '—'
                                : frequency.name_en || '—';
                            return (
                              <span className="break-words whitespace-normal block">{freqName}</span>
                            );
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                          {(() => {
                            const statusBadge = getStatusBadge(
                              maintenance.status ?? maintenance.maintenance_status,
                            );
                            if (!statusBadge) {
                              return (
                                <span className="text-xs sm:text-sm text-neutral-ink-400">—</span>
                              );
                            }
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${statusBadge.bgClass} whitespace-nowrap`}
                              >
                                {statusBadge.icon}
                                <span>{statusBadge.label}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                          <span className="break-words whitespace-normal block">
                            {formatDateDisplay(maintenance.due_date)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                          <span className="break-words whitespace-normal block">
                            {maintenance.last_maintenance_date
                              ? formatDateDisplay(maintenance.last_maintenance_date)
                              : '—'}
                          </span>
                        </td>
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
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredMaintenances.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Wrench className="w-12 h-12 text-neutral-ink-300" />
                    <p className="text-neutral-ink-600">
                      {searchQuery || selectedCategoryId !== null
                        ? t('noMaintenancesFiltered') || 'No maintenance found matching filters'
                        : t('noMaintenancesYet') || 'No maintenances found'}
                    </p>
                    {(searchQuery || selectedCategoryId !== null) && (
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

              {filteredMaintenances.length > 0 && <div className="h-20" />}
            </div>
          )}
        </Card>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMaintenance') || 'Delete Maintenance'}</AlertDialogTitle>
            <AlertDialogDescription>
              {(
                t('deleteMaintenanceConfirm') ||
                'Are you sure you want to delete the maintenance {name}? This action cannot be undone.'
              ).replace('{name}', `"${deletingMaintenance?.maintenance_title || ''}"`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResidenceWiseMaintenanceForm
        open={addFormOpen}
        onClose={() => {
          setAddFormOpen(false);
          setEditingRow(null);
        }}
        residences={residences}
        loadingResidences={loadingResidences}
        initialResidenceId={selectedResidenceId}
        editData={editingRow}
        onCreated={() => {
          if (selectedResidenceId != null) {
            void fetchMaintenances(selectedResidenceId);
          }
        }}
      />
    </div>
  );
}
