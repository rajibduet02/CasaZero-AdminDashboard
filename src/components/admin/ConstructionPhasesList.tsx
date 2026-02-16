import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Building2, Search, MapPin, RefreshCw, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { useLanguage } from '../../utils/LanguageContext';

const API_BASE = 'https://smarthome.attoexasolutions.com/api';

export type ConstructionPhaseStatus = 'Under Construction' | 'Completed' | 'Planned';

export interface ConstructionPhaseResidence {
  id: number;
  residence_name: string;
  address: string;
  status: ConstructionPhaseStatus;
}

/** Residence item from GET residence/get-under-constructions */
export interface UnderConstructionResidence {
  id: number;
  residence_name: string;
}

/** Phase item from GET construction-phase/get-all */
export interface ConstructionPhaseOption {
  id: number;
  phase_name_en: string;
  phase_name_it: string;
}

// Mock data - API-ready structure
const MOCK_CONSTRUCTION_PHASES: ConstructionPhaseResidence[] = [
  { id: 1, residence_name: 'Residence Alpha', address: 'Via Roma 1, Milano', status: 'Under Construction' },
  { id: 2, residence_name: 'Residence Beta', address: 'Corso Italia 15, Torino', status: 'Completed' },
  { id: 3, residence_name: 'Residence Gamma', address: 'Piazza Duomo 8, Napoli', status: 'Planned' },
  { id: 4, residence_name: 'Residence Delta', address: 'Via Verdi 22, Firenze', status: 'Under Construction' },
  { id: 5, residence_name: 'Residence Epsilon', address: 'Lungomare 5, Genova', status: 'Completed' },
];

export function ConstructionPhasesList() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<ConstructionPhaseResidence[]>(() => [...MOCK_CONSTRUCTION_PHASES]);
  const [filteredData, setFilteredData] = useState<ConstructionPhaseResidence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [residences, setResidences] = useState<UnderConstructionResidence[]>([]);
  const [phases, setPhases] = useState<ConstructionPhaseOption[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [selectedResidence, setSelectedResidence] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusDescription, setStatusDescription] = useState('');
  const [statusDate, setStatusDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getApiToken = useCallback((): string => {
    return localStorage.getItem('casazero_token') || '';
  }, []);

  const normalizeResidences = useCallback((raw: unknown): UnderConstructionResidence[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((r: Record<string, unknown>) => ({
        id: Number(r.id) || 0,
        residence_name: String(r.residence_name ?? r.name ?? '').trim(),
      }))
      .filter((r) => r.id);
  }, []);

  const normalizePhases = useCallback((raw: unknown): ConstructionPhaseOption[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((p: Record<string, unknown>) => ({
        id: Number(p.id) || 0,
        phase_name_en: String(p.phase_name_en ?? '').trim(),
        phase_name_it: String(p.phase_name_it ?? '').trim(),
      }))
      .filter((p) => p.id);
  }, []);

  const fetchResidences = useCallback(async () => {
    setLoadingResidences(true);
    try {
      const api_token = getApiToken();
      const response = await fetch(`${API_BASE}/residence/get-under-constructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_token }),
      });
      const res = (await response.json()) as { status?: boolean; data?: unknown[] };
      if (res?.status && Array.isArray(res.data)) {
        setResidences(normalizeResidences(res.data));
      } else {
        setResidences([]);
      }
    } catch (error) {
      console.error('Residence fetch error:', error);
      setResidences([]);
    } finally {
      setLoadingResidences(false);
    }
  }, [getApiToken, normalizeResidences]);

  const fetchPhases = useCallback(async () => {
    setLoadingPhases(true);
    try {
      const api_token = getApiToken();
      const response = await fetch(`${API_BASE}/construction-phase/get-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_token }),
      });
      const res = (await response.json()) as { status?: boolean; data?: unknown[] };
      if (res?.status && Array.isArray(res.data)) {
        setPhases(normalizePhases(res.data));
      } else {
        setPhases([]);
      }
    } catch (error) {
      console.error('Phase fetch error:', error);
      setPhases([]);
    } finally {
      setLoadingPhases(false);
    }
  }, [getApiToken, normalizePhases]);

  useEffect(() => {
    if (updateDialogOpen) {
      fetchResidences();
      fetchPhases();
    }
  }, [updateDialogOpen, fetchResidences, fetchPhases]);

  // Filter based on search (residence_name, address, status)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = data.filter(
        (row) =>
          row.residence_name.toLowerCase().includes(query) ||
          row.address.toLowerCase().includes(query) ||
          row.status.toLowerCase().includes(query)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

  const totalUnderConstruction = useMemo(
    () => data.filter((r) => r.status === 'Under Construction').length,
    [data]
  );

  const handleOpenUpdateDialog = () => {
    setSelectedResidence('');
    setSelectedPhase('');
    setSelectedStatus('');
    setStatusDescription('');
    setStatusDate('');
    setUpdateDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setUpdateDialogOpen(open);
    if (!open) {
      setSelectedResidence('');
      setSelectedPhase('');
      setSelectedStatus('');
      setStatusDescription('');
      setStatusDate('');
      setErrors({});
      setError(null);
    }
  };

  const handleChange = useCallback(
    (field: 'residence' | 'phase' | 'statusDescription' | 'statusDate', value: string) => {
      if (field === 'residence') setSelectedResidence(value);
      if (field === 'phase') setSelectedPhase(value);
      if (field === 'statusDescription') setStatusDescription(value);
      if (field === 'statusDate') setStatusDate(value);
      setError(null);
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedResidence?.trim()) {
      newErrors.residence = t('selectResidence') || 'Residence is required';
    }
    if (!selectedPhase?.trim()) {
      newErrors.phase = t('selectPhase') || 'Phase is required';
    }
    if (!statusDate?.trim()) {
      newErrors.statusDate = t('statusDate') || 'Status date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedResidence, selectedPhase, statusDate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedResidence?.trim() || !selectedPhase?.trim() || !statusDate?.trim()) {
      setError('Please fill all required fields.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const api_token = getApiToken();
      const response = await fetch(
        `${API_BASE}/residence-status/update-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_token,
            residence_id: Number(selectedResidence),
            phase_id: Number(selectedPhase),
            status_description: statusDescription || '',
            status_date: statusDate,
          }),
        }
      );
      const data = (await response.json()) as { status?: boolean; message?: string };
      if (data.status) {
        setSaving(false);
        setSelectedResidence('');
        setSelectedPhase('');
        setStatusDescription('');
        setStatusDate('');
        setErrors({});
        setUpdateDialogOpen(false);
      } else {
        setSaving(false);
        setError(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setSaving(false);
      setError('Network error. Please try again.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'Completed') return 'bg-green-50 text-green-700';
    if (status === 'Under Construction') return 'bg-orange-50 text-orange-700';
    return 'bg-gray-50 text-gray-700';
  };

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
          <h1 className="text-neutral-ink-900 mb-2">{t('constructionPhases')}</h1>
          <p className="text-neutral-ink-500">{t('constructionPhasesSubtitle')}</p>
        </div>

        <Button
          onClick={handleOpenUpdateDialog}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          {t('updateResidenceStatus')}
        </Button>
      </motion.div>

      {/* Status Card */}
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
              <p className="text-xl font-semibold text-neutral-ink-900">{totalUnderConstruction}</p>
              <p className="text-xs text-neutral-ink-500">{t('totalUnderConstruction')}</p>
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

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="rounded-2xl border border-neutral-line-200">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-line-200">
                <AnimatePresence>
                  {filteredData.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: 0.05 * index, duration: 0.3 }}
                      className="hover:bg-neutral-line-100 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm text-neutral-ink-900">{row.residence_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-xs">{row.address || t('noAddress')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-xs ${getStatusBadgeClass(row.status)}`}
                        >
                          {row.status === 'Under Construction'
                            ? t('underConstruction')
                            : row.status === 'Planned'
                              ? t('planned')
                              : row.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-neutral-ink-500">{t('noBuildings')}</p>
              </motion.div>
            )}

            {filteredData.length > 0 && <div className="h-24" />}
          </div>
        </Card>
      </motion.div>

      {/* Update Residence Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('updateResidenceStatus')}</DialogTitle>
            <DialogDescription>
              {t('constructionPhasesSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-neutral-ink-900 font-medium">Details</h3>

              <div className="space-y-2">
                <Label htmlFor="residence" className="text-neutral-ink-700">
                  {t('selectResidence')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedResidence ?? ''}
                  onValueChange={(value) => handleChange('residence', String(value ?? ''))}
                  disabled={loadingResidences}
                >
                  <SelectTrigger
                    id="residence"
                    className={`rounded-none border-0 border-b-2 shadow-sm focus:shadow-md transition-all disabled:opacity-50 ${
                      errors.residence
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        loadingResidences
                          ? (t('loadingBuildings') || 'Loading...')
                          : residences.length === 0
                            ? (t('noBuildings') || 'No residences')
                            : t('selectResidence')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60 overflow-auto">
                    {residences.map((residence) => (
                      <SelectItem
                        key={residence.id}
                        value={String(residence.id)}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#6A8F7B]" />
                          <span>
                            {residence.residence_name == null || residence.residence_name.trim() === ''
                              ? '—'
                              : residence.residence_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.residence && (
                  <p className="text-xs text-red-500 mt-1">{errors.residence}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase" className="text-neutral-ink-700">
                  {t('selectPhase')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedPhase ?? ''}
                  onValueChange={(value) => handleChange('phase', String(value ?? ''))}
                  disabled={loadingPhases}
                >
                  <SelectTrigger
                    id="phase"
                    className={`rounded-none border-0 border-b-2 shadow-sm focus:shadow-md transition-all disabled:opacity-50 ${
                      errors.phase
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        loadingPhases
                          ? (t('loading') || 'Loading...')
                          : phases.length === 0
                            ? (t('noBuildings') || 'No phases')
                            : t('selectPhase')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60 overflow-auto">
                    {phases.map((phase) => {
                      const label =
                        language === 'it'
                          ? phase.phase_name_it || phase.phase_name_en
                          : phase.phase_name_en || phase.phase_name_it;
                      return (
                        <SelectItem
                          key={phase.id}
                          value={String(phase.id)}
                          className="rounded-lg"
                        >
                          {label == null || String(label).trim() === '' ? '—' : String(label).trim()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.phase && (
                  <p className="text-xs text-red-500 mt-1">{errors.phase}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusDescription" className="text-neutral-ink-700">
                  {t('statusDescription')} <span className="text-neutral-ink-400">({t('optional')})</span>
                </Label>
                <Input
                  id="statusDescription"
                  type="text"
                  placeholder={t('statusDescription')}
                  value={statusDescription}
                  onChange={(e) => handleChange('statusDescription', e.target.value)}
                  className="rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusDate" className="text-neutral-ink-700">
                  {t('statusDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="statusDate"
                  type="date"
                  value={statusDate}
                  onChange={(e) => handleChange('statusDate', e.target.value)}
                  className={`rounded-none border-0 border-b-2 shadow-sm focus:shadow-md transition-all ${
                    errors.statusDate
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-line-200 focus:border-[#6A8F7B]'
                  }`}
                />
                {errors.statusDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.statusDate}</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-line-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={saving}
                className="rounded-xl border-neutral-line-200 hover:bg-neutral-line-100"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
