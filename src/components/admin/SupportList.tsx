import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Ticket,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  Circle,
  CheckCircle,
  Building2,
  User,
  Inbox,
  Clock,
  Paperclip,
  Eye,
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
import { Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { ChevronDown, Check, X } from 'lucide-react';
import { Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, fetchResidencesCatalog, formatDate, apiFetch } from '../../utils/api';
import { parseApiError } from '../../utils/apiError';
import { ErrorState } from '../ui/ErrorState';
import { toSupportStatusKey } from './supportStatus';

/** Background automatic refresh interval for support tickets (polling, not realtime). */
export const TICKET_POLL_INTERVAL_MS = 10_000;

function readTicketsArray(res: Record<string, unknown>): SupportTicket[] {
  const d = res.data;
  if (Array.isArray(d)) return d as SupportTicket[];
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const o = d as Record<string, unknown>;
    for (const key of ['data', 'tickets', 'items', 'results', 'list'] as const) {
      const inner = o[key];
      if (Array.isArray(inner)) return inner as SupportTicket[];
    }
  }
  if (Array.isArray(res.tickets)) return res.tickets as SupportTicket[];
  if (Array.isArray(res.items)) return res.items as SupportTicket[];
  return [];
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('casazero_token') || '';
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type FetchTicketsResult =
  | { ok: true; tickets: SupportTicket[] }
  | { ok: false };

export interface SupportTicket {
  id: number;
  ticket_id: string | null;
  issue_type_id: number;
  user_id: number;
  title: string;
  description: string;
  status: string;
  image: string | null;
  created_at: string;
  updated_at: string;
  issue_type: {
    id: number;
    issue_type_en: string;
    issue_type_it: string;
  } | null;
  user: {
    id: number;
    user_name: string;
    email: string;
    profile_image: string | null;
    units: {
      id: number;
      residence_id: number;
      unit_name: string;
      unit_description: string;
      created_at: string;
      updated_at: string;
      pivot: { user_id: number; unit_id: number };
      residence: {
        id: number;
        residence_name: string;
        residence_address: string;
      };
    }[];
  };
}

interface SupportListProps {
  onEditTicket?: (ticket: SupportTicket) => void;
  onCreateTicket?: () => void;
  refreshKey?: number;
  filterByResidenceId?: number | null;
}

async function fetchSupportTicketsResult(): Promise<FetchTicketsResult> {
  try {
    const api_token = localStorage.getItem('casazero_token') || '';
    const response = await apiFetch(`${API_BASE}/all-support-tickets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ api_token }),
    });
    let res: Record<string, unknown>;
    try {
      res = (await response.json()) as Record<string, unknown>;
    } catch {
      return { ok: false };
    }
    if (!response.ok) return { ok: false };
    return { ok: true, tickets: readTicketsArray(res) };
  } catch {
    return { ok: false };
  }
}

/** Initial / refreshKey load — throws on failure so the UI can show an error state. */
async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const result = await fetchSupportTicketsResult();
  if (!result.ok) {
    throw new Error('Unable to load support tickets.');
  }
  return result.tickets;
}

async function fetchResidences(): Promise<{ id: number; residence_name: string }[]> {
  const response = await fetchResidencesCatalog();
  let res: Record<string, unknown>;
  try {
    res = (await response.json()) as Record<string, unknown>;
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const raw = res.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r: { id: number; residence_name: string }) => ({
    id: r.id,
    residence_name: r.residence_name,
  }));
}

interface IssueTypeOption {
  id: number;
  issue_type_en: string;
  issue_type_it: string;
}

async function fetchIssueTypes(): Promise<IssueTypeOption[]> {
  const api_token = localStorage.getItem('casazero_token') || '';
  const response = await apiFetch(`${API_BASE}/issue-type/list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ api_token }),
  });
  let res: Record<string, unknown>;
  try {
    res = (await response.json()) as Record<string, unknown>;
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const d = res.data;
  if (Array.isArray(d)) return d as IssueTypeOption[];
  return [];
}

async function deleteSupportTicket(ticketId: number): Promise<{ status: boolean; message?: string }> {
  const api_token = localStorage.getItem('casazero_token') || '';
  const response = await apiFetch(`${API_BASE}/delete-support-ticket`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ api_token, ticket_id: ticketId }),
  });
  return await response.json() as { status: boolean; message?: string };
}

const STATUS_OPTIONS = [
  { value: 'pending', labelKey: 'pending' },
  { value: 'in_progress', labelKey: 'supportStatusInProgress' },
  { value: 'resolved', labelKey: 'supportStatusResolved' },
] as const;

export function SupportList({
  onEditTicket,
  onCreateTicket,
  refreshKey,
  filterByResidenceId,
}: SupportListProps) {
  const { t, language } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [selectedResidenceFilter, setSelectedResidenceFilter] = useState<number | null>(null);
  const [openIssueTypePopover, setOpenIssueTypePopover] = useState(false);
  const [openStatusPopover, setOpenStatusPopover] = useState(false);
  const [openResidencePopover, setOpenResidencePopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);

  const [issueTypeOptions, setIssueTypeOptions] = useState<IssueTypeOption[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [filterCatalogWarning, setFilterCatalogWarning] = useState<string | null>(null);

  const [residences, setResidences] = useState<{ id: number; residence_name: string }[]>([]);

  /** Bumped on local mutations / explicit reloads so in-flight polls cannot overwrite fresher state. */
  const ticketsRevisionRef = useRef(0);

  const formatDateDisplay = (dateString: string | null | undefined) =>
    formatDate(dateString, { language });

  const loadTickets = async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchSupportTickets();
      ticketsRevisionRef.current += 1;
      setTickets(data);
    } catch (e) {
      ticketsRevisionRef.current += 1;
      setTickets([]);
      setListError(
        parseApiError(e, {
          fallbackMessage: t('failedToLoadData') || 'Unable to load support tickets.',
        }).message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    setFilterCatalogWarning(null);
    fetchIssueTypes()
      .then(setIssueTypeOptions)
      .catch(() => {
        setIssueTypeOptions([]);
        setFilterCatalogWarning(
          t('filtersMayBeIncomplete') ||
            'Some filter options could not be loaded.',
        );
      });
    fetchResidences()
      .then(setResidences)
      .catch(() => {
        setResidences([]);
        setFilterCatalogWarning(
          t('filtersMayBeIncomplete') ||
            'Some filter options could not be loaded.',
        );
      });
  }, [refreshKey, filterByResidenceId]);

  // Periodic background refresh while this screen is mounted (does not duplicate the initial fetch).
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const pollTickets = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      inFlight = true;
      const revisionAtStart = ticketsRevisionRef.current;
      try {
        const result = await fetchSupportTicketsResult();
        if (cancelled || !result.ok) return;
        if (revisionAtStart !== ticketsRevisionRef.current) return;
        setTickets(result.tickets);
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(pollTickets, TICKET_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pollTickets();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Local filtering: search, issue type, status, residence
  useEffect(() => {
    let filtered = tickets;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tk) =>
          String(tk.id).toLowerCase().includes(q) ||
          tk.title?.toLowerCase().includes(q) ||
          tk.description?.toLowerCase().includes(q) ||
          tk.user?.user_name?.toLowerCase().includes(q) ||
          tk.status?.toLowerCase().includes(q)
      );
    }
    if (selectedIssueType !== null) {
      filtered = filtered.filter((tk) => String(tk.issue_type_id) === selectedIssueType);
    }
    if (selectedStatusFilter !== null) {
      filtered = filtered.filter((tk) => toSupportStatusKey(tk.status) === selectedStatusFilter);
    }
    if (selectedResidenceFilter !== null) {
      filtered = filtered.filter((tk) => tk.user?.units?.some((u) => u.residence_id === selectedResidenceFilter));
    }
    setFilteredTickets(filtered);
  }, [tickets, searchQuery, selectedIssueType, selectedStatusFilter, selectedResidenceFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedIssueType(null);
    setSelectedStatusFilter(null);
    setSelectedResidenceFilter(null);
  };

  const handleStatusCardClick = (status: string | null) => {
    setSelectedStatusFilter(status);
  };

  const handleDelete = (ticket: SupportTicket) => {
    setDeletingTicket(ticket);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTicket || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteSupportTicket(deletingTicket.id);
      if (res?.status) {
        ticketsRevisionRef.current += 1;
        setTickets((prev) => prev.filter((tk) => tk.id !== deletingTicket.id));
        setDeleteDialogOpen(false);
        setDeletingTicket(null);
        toast.success(t('success') || 'Success', {
          description: t('ticketDeletedSuccess'),
        });
      } else {
        toast.error(t('error'), { description: res?.message || t('failedToDeleteTicket') });
      }
    } catch {
      toast.error(t('error'), { description: t('failedToDeleteTicket') });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (ticket: SupportTicket) => {
    onEditTicket?.(ticket);
  };

  const handleViewAttachment = (imageUrl: string) => {
    setAttachmentPreviewUrl(imageUrl);
    setAttachmentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (toSupportStatusKey(status)) {
      case 'pending':
        return { bgClass: 'bg-yellow-50 text-yellow-700', icon: <Circle className="w-3 h-3" />, label: t('pending') };
      case 'in_progress':
        return { bgClass: 'bg-blue-50 text-blue-700', icon: <Loader2 className="w-3 h-3" />, label: t('supportStatusInProgress') };
      case 'resolved':
        return { bgClass: 'bg-green-50 text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: t('supportStatusResolved') };
      default:
        return { bgClass: 'bg-gray-50 text-gray-700', icon: <Circle className="w-3 h-3" />, label: status };
    }
  };

  const totalTickets = tickets.length;
  const pendingCount = tickets.filter((tk) => toSupportStatusKey(tk.status) === 'pending').length;
  const inProgressCount = tickets.filter((tk) => toSupportStatusKey(tk.status) === 'in_progress').length;
  const resolvedCount = tickets.filter((tk) => toSupportStatusKey(tk.status) === 'resolved').length;

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
          <h1 className="text-neutral-ink-900 mb-2">{t('supportTicketsTitle')}</h1>
          <p className="text-neutral-ink-500">{t('supportTicketsSubtitle')}</p>
        </div>
        {/* <Button
          onClick={onCreateTicket}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addTicket')}
        </Button> */}
      </motion.div>

      {/* Status summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === null ? 'ring-2 ring-[#6A8F7B]' : ''
          }`}
          onClick={() => handleStatusCardClick(null)}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-sm bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
              <Ticket className="w-5 h-5" color="white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-neutral-ink-900">{totalTickets}</p>
              <p className="text-sm text-neutral-ink-500">{t('totalTickets')}</p>
            </div>
          </div>
        </Card>
        <Card
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'pending' ? 'ring-2 ring-[#FFB020]' : ''
          }`}
          onClick={() => handleStatusCardClick('pending')}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-sm bg-gradient-to-br from-[#FFB020] to-[#F59E0B]">
              <Inbox className="w-5 h-5" color="white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-neutral-ink-900">{pendingCount}</p>
              <p className="text-sm text-neutral-ink-500">{t('pending')}</p>
            </div>
          </div>
        </Card>
        <Card
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'in_progress' ? 'ring-2 ring-[#3B82F6]' : ''
          }`}
          onClick={() => handleStatusCardClick('in_progress')}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-sm bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
              <Clock className="w-5 h-5" color="white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-neutral-ink-900">{inProgressCount}</p>
              <p className="text-sm text-neutral-ink-500">{t('supportStatusInProgress')}</p>
            </div>
          </div>
        </Card>
        <Card
          className={`p-6 rounded-2xl border border-neutral-line-200 cursor-pointer transition-all hover:shadow-lg ${
            selectedStatusFilter === 'resolved' ? 'ring-2 ring-[#14B8A6]' : ''
          }`}
          onClick={() => handleStatusCardClick('resolved')}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-sm bg-gradient-to-br from-[#14B8A6] to-[#0D9488]">
              <CheckCircle className="w-5 h-5" color="white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-neutral-ink-900">{resolvedCount}</p>
              <p className="text-sm text-neutral-ink-500">{t('supportStatusResolved')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters + Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex flex-wrap items-center gap-4">
            <Ticket className="w-5 h-5 text-neutral-ink-400 flex-shrink-0" />
            {/* Issue Type filter */}
            <Popover open={openIssueTypePopover} onOpenChange={setOpenIssueTypePopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                >
                  <span className="text-neutral-ink-600">
                    {selectedIssueType
                      ? (() => {
                          const found = issueTypeOptions.find((o) => String(o.id) === selectedIssueType);
                          return found ? (language === 'it' ? found.issue_type_it : found.issue_type_en) : selectedIssueType;
                        })()
                      : t('supportIssueType')}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0 rounded-xl" align="start">
                <Command>
                  <CommandInput placeholder={t('search')} className="h-9" />
                  <CommandList>
                    <CommandEmpty>{t('noIssueTypeFound')}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedIssueType(null);
                          setOpenIssueTypePopover(false);
                        }}
                        className="cursor-pointer rounded-lg"
                      >
                        <Check className={`mr-2 h-4 w-4 ${selectedIssueType === null ? 'opacity-100' : 'opacity-0'}`} />
                        {t('allCategories')}
                      </CommandItem>
                      {issueTypeOptions.map((opt) => (
                        <CommandItem
                          key={opt.id}
                          value={language === 'it' ? opt.issue_type_it : opt.issue_type_en}
                          onSelect={() => {
                            setSelectedIssueType(String(opt.id));
                            setOpenIssueTypePopover(false);
                          }}
                          className="cursor-pointer rounded-lg"
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedIssueType === String(opt.id) ? 'opacity-100' : 'opacity-0'}`} />
                          {language === 'it' ? opt.issue_type_it : opt.issue_type_en}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedIssueType !== null && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIssueType(null)} className="rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Status filter */}
            <Popover open={openStatusPopover} onOpenChange={setOpenStatusPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                >
                  <span className="text-neutral-ink-600">
                    {selectedStatusFilter ? STATUS_OPTIONS.find((s) => s.value === selectedStatusFilter) ? t(STATUS_OPTIONS.find((s) => s.value === selectedStatusFilter)!.labelKey) : selectedStatusFilter : t('supportStatus')}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="all-status"
                        onSelect={() => {
                          setSelectedStatusFilter(null);
                          setOpenStatusPopover(false);
                        }}
                        className="cursor-pointer rounded-lg"
                      >
                        <Check className={`mr-2 h-4 w-4 ${selectedStatusFilter === null ? 'opacity-100' : 'opacity-0'}`} />
                        {t('allCategories')}
                      </CommandItem>
                      {STATUS_OPTIONS.map((s) => (
                        <CommandItem
                          key={s.value}
                          value={s.value}
                          onSelect={() => {
                            setSelectedStatusFilter(s.value);
                            setOpenStatusPopover(false);
                          }}
                          className="cursor-pointer rounded-lg"
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedStatusFilter === s.value ? 'opacity-100' : 'opacity-0'}`} />
                          {t(s.labelKey)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Residence filter - placeholder for API */}
            <Popover open={openResidencePopover} onOpenChange={setOpenResidencePopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl border-neutral-line-200 hover:border-[#6A8F7B] transition-all"
                >
                  <span className="text-neutral-ink-600">{t('supportResidence')}</span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0 rounded-xl" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="all-residence"
                        onSelect={() => {
                          setSelectedResidenceFilter(null);
                          setOpenResidencePopover(false);
                        }}
                        className="cursor-pointer rounded-lg"
                      >
                        <Check className={`mr-2 h-4 w-4 ${selectedResidenceFilter === null ? 'opacity-100' : 'opacity-0'}`} />
                        {t('allCategories')}
                      </CommandItem>
                      {residences.map((r) => (
                        <CommandItem
                          key={r.id}
                          value={r.residence_name}
                          onSelect={() => {
                            setSelectedResidenceFilter(r.id);
                            setOpenResidencePopover(false);
                          }}
                          className="cursor-pointer rounded-lg"
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedResidenceFilter === r.id ? 'opacity-100' : 'opacity-0'}`} />
                          {r.residence_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <Search className="w-5 h-5 text-neutral-ink-400" />
              <Input
                type="text"
                placeholder={t('searchTickets')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {filterCatalogWarning && (
        <p role="alert" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {filterCatalogWarning}
        </p>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200 relative overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin mb-4" />
              <p className="text-neutral-ink-500">{t('loadingTickets')}</p>
            </div>
          ) : listError ? (
            <ErrorState
              title={t('unableToLoadTickets') || 'Unable to load tickets'}
              message={listError}
              onRetry={() => void loadTickets()}
              retryLabel={t('retry') || 'Retry'}
              className="m-6"
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto divide-y divide-neutral-line-200" style={{ minWidth: '100%' }}>
                <thead className="bg-neutral-line-100 border-b border-neutral-line-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('ticketId')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportIssueType')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportTitleLabel')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportDescriptionLabel')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportResidence')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportUnit')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportCustomerName')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportCustomerEmail')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportStatus')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportAttachment')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">{t('supportCreatedDate')}</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-line-200">
                    {filteredTickets.map((ticket) => {
                      const statusBadge = getStatusBadge(ticket.status);
                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-neutral-line-100 transition-colors duration-200"
                        >
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-900 align-top font-mono font-medium">
                            {ticket.ticket_id || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700">
                              {(language === 'it' ? ticket.issue_type?.issue_type_it : ticket.issue_type?.issue_type_en) || '—'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-900 align-top">
                            <span className="font-medium">{ticket.title || '—'}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top max-w-[200px]">
                            <span className="line-clamp-2">{ticket.description || '—'}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            <div className="flex items-start gap-1">
                              <Building2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span>{ticket.user?.units?.[0]?.residence?.residence_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            {ticket.user?.units?.[0]?.unit_name || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            <div className="flex items-start gap-1">
                              <User className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span>{ticket.user?.user_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            {ticket.user?.email || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${statusBadge.bgClass}`}>
                              {statusBadge.icon}
                              <span>{statusBadge.label}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 align-top">
                            {ticket.image ? (
                              <button
                                onClick={() => handleViewAttachment(ticket.image!)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                {t('viewAttachment')}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-neutral-ink-400 bg-neutral-line-100">
                                <Paperclip className="w-3 h-3" />
                                {t('noAttachment')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-ink-600 align-top">
                            {formatDateDisplay(ticket.created_at)}
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
                                <DropdownMenuContent side="left" align="start" sideOffset={8} className="w-48 rounded-xl">
                                  <DropdownMenuItem onClick={() => handleEdit(ticket)} className="cursor-pointer rounded-lg">
                                    <Edit className="w-4 h-4 mr-2" />
                                    {t('edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(ticket)}
                                    className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {filteredTickets.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Ticket className="w-12 h-12 text-neutral-ink-300" />
                    <p className="text-neutral-ink-600">{t('noSupportTicketsFound')}</p>
                    {(searchQuery || selectedIssueType !== null || selectedStatusFilter !== null || selectedResidenceFilter !== null) && (
                      <Button variant="ghost" size="sm" onClick={handleClearFilters} className="mt-2 rounded-lg hover:bg-neutral-line-100">
                        {t('clearFilters')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {filteredTickets.length > 0 && <div className="h-24" />}
            </div>
          )}
        </Card>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setDeleteDialogOpen(open);
          if (!open) setDeletingTicket(null);
        }
      }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTicket')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTicketConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl"
              disabled={isDeleting}
              onClick={() => { setDeleteDialogOpen(false); setDeletingTicket(null); }}
            >
              {t('cancel')}
            </AlertDialogCancel>
            <Button
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
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={attachmentDialogOpen} onOpenChange={(open) => {
        setAttachmentDialogOpen(open);
        if (!open) setAttachmentPreviewUrl(null);
      }}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              {t('supportAttachment')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2">
            {attachmentPreviewUrl && (
              <img
                src={attachmentPreviewUrl}
                alt={t('supportAttachment')}
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
