import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Building2, Search, MapPin, RefreshCw } from 'lucide-react';
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

export type ConstructionPhaseStatus = 'Under Construction' | 'Completed' | 'Planned';

export interface ConstructionPhaseResidence {
  id: number;
  residence_name: string;
  address: string;
  status: ConstructionPhaseStatus;
}

// Phase options for dropdown - API-ready
const PHASE_OPTIONS = [
  { value: 'foundation', labelKey: 'phaseFoundation' },
  { value: 'framing', labelKey: 'phaseFraming' },
  { value: 'mep', labelKey: 'phaseMEP' },
  { value: 'envelope', labelKey: 'phaseEnvelope' },
  { value: 'finishing', labelKey: 'phaseFinishing' },
  { value: 'handover', labelKey: 'phaseHandover' },
] as const;

// Mock data - API-ready structure
const MOCK_CONSTRUCTION_PHASES: ConstructionPhaseResidence[] = [
  { id: 1, residence_name: 'Residence Alpha', address: 'Via Roma 1, Milano', status: 'Under Construction' },
  { id: 2, residence_name: 'Residence Beta', address: 'Corso Italia 15, Torino', status: 'Completed' },
  { id: 3, residence_name: 'Residence Gamma', address: 'Piazza Duomo 8, Napoli', status: 'Planned' },
  { id: 4, residence_name: 'Residence Delta', address: 'Via Verdi 22, Firenze', status: 'Under Construction' },
  { id: 5, residence_name: 'Residence Epsilon', address: 'Lungomare 5, Genova', status: 'Completed' },
];

export function ConstructionPhasesList() {
  const { t } = useLanguage();
  const [data, setData] = useState<ConstructionPhaseResidence[]>(() => [...MOCK_CONSTRUCTION_PHASES]);
  const [filteredData, setFilteredData] = useState<ConstructionPhaseResidence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedResidenceId, setSelectedResidenceId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [statusDescription, setStatusDescription] = useState('');
  const [statusDate, setStatusDate] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSelectedResidenceId('');
    setSelectedStatus('');
    setSelectedPhase('');
    setStatusDescription('');
    setStatusDate('');
    setUpdateDialogOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedResidenceId || !selectedStatus) return;
    setSaving(true);
    // API-ready: await api.updateResidenceStatus(selectedResidenceId, selectedStatus);
    setData((prev) =>
      prev.map((row) =>
        row.id === parseInt(selectedResidenceId, 10)
          ? { ...row, status: selectedStatus as ConstructionPhaseStatus }
          : row
      )
    );
    setSaving(false);
    setUpdateDialogOpen(false);
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
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('updateResidenceStatus')}</DialogTitle>
            <DialogDescription>
              {t('constructionPhasesSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-ink-700">{t('selectResidence')}</Label>
              <Select value={selectedResidenceId} onValueChange={setSelectedResidenceId}>
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectResidence')} />
                </SelectTrigger>
                <SelectContent>
                  {data.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)} className="rounded-lg">
                      {row.residence_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <Label className="text-neutral-ink-700">{t('selectStatus')}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under Construction" className="rounded-lg">
                    {t('underConstruction')}
                  </SelectItem>
                  <SelectItem value="Completed" className="rounded-lg">
                    Completed
                  </SelectItem>
                  <SelectItem value="Planned" className="rounded-lg">
                    {t('planned')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div> */}
            <div className="space-y-2">
              <Label className="text-neutral-ink-700">{t('selectPhase')}</Label>
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                  <SelectValue placeholder={t('selectPhase')} />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-ink-700">{t('statusDescription')}</Label>
              <Input
                type="text"
                value={statusDescription}
                onChange={(e) => setStatusDescription(e.target.value)}
                placeholder={t('statusDescription')}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-ink-700">{t('statusDate')}</Label>
              <Input
                type="date"
                value={statusDate}
                onChange={(e) => setStatusDate(e.target.value)}
                className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              className="rounded-xl"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveStatusUpdate}
              disabled={!selectedResidenceId || !selectedStatus || saving}
              className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 rounded-xl disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
