import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Building2, Loader2, Save, Upload, X, AlertCircle, Trash2 } from 'lucide-react';
import { AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectViewport,
} from '../ui/app-select';
import { Label } from '../ui/label';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, safeJsonParse,
  apiFetch,
} from '../../utils/api';

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

function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface ConstructionPhasesFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ACCEPTED_DOC_TYPES =
  'application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*';
const MAX_DOC_SIZE_MB = 3;

export function ConstructionPhasesForm({ open, onOpenChange, onSuccess }: ConstructionPhasesFormProps) {
  const { t, language } = useLanguage();
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const [residences, setResidences] = useState<UnderConstructionResidence[]>([]);
  const [phases, setPhases] = useState<ConstructionPhaseOption[]>([]);
  const [loadingResidences, setLoadingResidences] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [selectedResidence, setSelectedResidence] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [statusDescription, setStatusDescription] = useState('');
  const [statusDocument, setStatusDocument] = useState<File | null>(null);
  const [statusDate, setStatusDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseEn, setNewPhaseEn] = useState('');
  const [newPhaseIt, setNewPhaseIt] = useState('');
  const [addPhaseError, setAddPhaseError] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [deletingPhaseId, setDeletingPhaseId] = useState<number | null>(null);

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
      const response = await apiFetch(`${API_BASE}/residence/get-under-constructions`, {
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
    } catch (err) {
      console.error('Residence fetch error:', err);
      setResidences([]);
    } finally {
      setLoadingResidences(false);
    }
  }, [getApiToken, normalizeResidences]);

  const fetchPhases = useCallback(async () => {
    setLoadingPhases(true);
    try {
      const api_token = getApiToken();
      const response = await apiFetch(`${API_BASE}/construction-phase/get-all`, {
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
    } catch (err) {
      console.error('Phase fetch error:', err);
      setPhases([]);
    } finally {
      setLoadingPhases(false);
    }
  }, [getApiToken, normalizePhases]);

  useEffect(() => {
    if (open) {
      fetchResidences();
      fetchPhases();
    }
  }, [open, fetchResidences, fetchPhases]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedResidence('');
    setSelectedPhase('');
    setStatusDescription('');
    setStatusDocument(null);
    setStatusDate('');
    setErrors({});
    setError(null);
    setShowAddPhase(false);
    setNewPhaseEn('');
    setNewPhaseIt('');
    setAddPhaseError(null);
    const fileInput = document.getElementById('status_document_upload') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, document: t('fileSizeUnderMb').replace('{size}', String(MAX_DOC_SIZE_MB)) }));
      setStatusDocument(null);
      e.target.value = '';
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.document;
      return next;
    });
    setStatusDocument(file);
    e.target.value = '';
  };

  const handleRemoveDocument = () => {
    setStatusDocument(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.document;
      return next;
    });
    const input = document.getElementById('status_document_upload') as HTMLInputElement;
    if (input) input.value = '';
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

  const handleAddPhase = useCallback(async () => {
    const nameEn = newPhaseEn.trim();
    const nameIt = newPhaseIt.trim();
    if (!nameEn || !nameIt) {
      setAddPhaseError(t('phaseNameBothRequired'));
      return;
    }
    setAddPhaseError(null);
    setAddingPhase(true);
    try {
      const api_token = getApiToken();
      const response = await apiFetch(`${API_BASE}/create-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          api_token,
          phase_name_en: nameEn,
          phase_name_it: nameIt,
        }),
      });
      const result = (await safeJsonParse(response)) as {
        status?: boolean;
        message?: string;
        data?: { id: number; phase_name_en?: string; phase_name_it?: string };
      };
      if (result.status && result.data) {
        const newPhase: ConstructionPhaseOption = {
          id: result.data.id,
          phase_name_en: result.data.phase_name_en ?? nameEn,
          phase_name_it: result.data.phase_name_it ?? nameIt,
        };
        setPhases((prev) => [...prev, newPhase]);
        setSelectedPhase(String(newPhase.id));
        setNewPhaseEn('');
        setNewPhaseIt('');
        setShowAddPhase(false);
      } else {
        setAddPhaseError(result.message || t('failedToCreatePhase'));
      }
    } catch (err) {
      console.error('Create phase error:', err);
      setAddPhaseError(err instanceof Error ? err.message : t('failedToCreatePhaseRetry'));
    } finally {
      setAddingPhase(false);
    }
  }, [newPhaseEn, newPhaseIt, getApiToken, t]);

  const handleDeletePhase = useCallback(
    async (e: React.MouseEvent, phaseId: number) => {
      e.stopPropagation();
      e.preventDefault();
      setDeletingPhaseId(phaseId);
      try {
        const api_token = getApiToken();
        const response = await apiFetch(`${API_BASE}/delete-phase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ api_token, phase_id: phaseId }),
        });
        const result = (await safeJsonParse(response)) as { status?: boolean; message?: string };
        if (result.status) {
          setPhases((prev) => prev.filter((p) => p.id !== phaseId));
          if (selectedPhase === String(phaseId)) {
            setSelectedPhase('');
          }
        } else {
          setAddPhaseError(result.message || t('failedToDeletePhase'));
        }
      } catch (err) {
        console.error('Delete phase error:', err);
        setAddPhaseError(err instanceof Error ? err.message : t('failedToDeletePhaseRetry'));
      } finally {
        setDeletingPhaseId(null);
      }
    },
    [getApiToken, selectedPhase]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedResidence?.trim()) {
      newErrors.residence = t('residenceRequired');
    }
    if (!selectedPhase?.trim()) {
      newErrors.phase = t('selectPhase');
    }
    if (!statusDate?.trim()) {
      newErrors.statusDate = t('statusDateRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedResidence, selectedPhase, statusDate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedResidence?.trim() || !selectedPhase?.trim() || !statusDate?.trim()) {
      setError(t('fillAllRequiredFields'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const api_token = getApiToken();
      const payload: Record<string, unknown> = {
        api_token,
        residence_id: Number(selectedResidence),
        phase_id: Number(selectedPhase),
        status_description: statusDescription || '',
        status_date: statusDate,
      };
      if (statusDocument) {
        payload.image = await fileToBase64DataUrl(statusDocument);
      }
      const response = await apiFetch(`${API_BASE}/residence-status/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { status?: boolean; message?: string };
      if (result.status) {
        setSaving(false);
        setSelectedResidence('');
        setSelectedPhase('');
        setStatusDescription('');
        setStatusDocument(null);
        setStatusDate('');
        setErrors({});
        handleClose();
        onSuccess();
      } else {
        setSaving(false);
        setError(result.message || t('somethingWentWrong'));
      }
    } catch (err) {
      setSaving(false);
      setError(t('networkError'));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div ref={modalContainerRef} className="w-full h-full flex flex-col min-h-0 max-h-[90vh]">
              <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
                  <div>
                    <h2 className="text-neutral-ink-900 font-medium">
                      {t('updateResidenceStatus')}
                    </h2>
                    <p className="text-sm text-neutral-ink-500 mt-0.5">
                      {t('constructionPhasesSubtitle')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="rounded-lg w-9 h-9 p-0 hover:bg-neutral-line-200"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Form - scroll container */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Residence */}
                    <div className="space-y-2">
                      <Label htmlFor="residence" className="text-neutral-ink-700">
                        {t('selectResidence')} <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={modalContainerRef}
                        value={selectedResidence ?? ''}
                        onValueChange={(value) => handleChange('residence', String(value ?? ''))}
                        disabled={loadingResidences}
                      >
                        <AppSelectTrigger
                          id="residence"
                          className={errors.residence ? 'border-red-500 focus:border-red-500' : undefined}
                          disabled={loadingResidences}
                        >
                          <AppSelectValue
                            placeholder={
                              loadingResidences
                                ? (t('loadingBuildings') || 'Loading...')
                                : residences.length === 0
                                  ? (t('noBuildings') || 'No residences')
                                  : t('selectResidence')
                            }
                          />
                        </AppSelectTrigger>
                        <AppSelectContent>
                          <AppSelectViewport>
                            {residences.map((residence) => (
                              <AppSelectItem
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
                              </AppSelectItem>
                            ))}
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.residence && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errors.residence}</span>
                        </div>
                      )}
                    </div>

                    {/* Phase */}
                    <div className="space-y-2">
                      <Label htmlFor="phase" className="text-neutral-ink-700">
                        {t('selectPhase')} <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={modalContainerRef}
                        value={selectedPhase ?? ''}
                        onValueChange={(value) => {
                          const v = String(value ?? '');
                          if (v === '__add__') {
                            setShowAddPhase(true);
                            const selectTrigger = document.querySelector('[data-select-root] button');
                            if (selectTrigger) (selectTrigger as HTMLElement).blur();
                            return;
                          }
                          handleChange('phase', v);
                        }}
                        disabled={loadingPhases}
                      >
                        <AppSelectTrigger
                          id="phase"
                          className={errors.phase ? 'border-red-500 focus:border-red-500' : undefined}
                          disabled={loadingPhases}
                        >
                          <AppSelectValue
                            placeholder={
                              loadingPhases
                                ? (t('loading') || 'Loading...')
                                : phases.length === 0
                                  ? (t('noPhases'))
                                  : t('selectPhase')
                            }
                          />
                        </AppSelectTrigger>
                        <AppSelectContent>
                          <AppSelectViewport>
                            {phases.map((phase) => (
                              <AppSelectItem
                                key={phase.id}
                                value={String(phase.id)}
                                className="rounded-lg flex items-center justify-between gap-2 pr-1"
                              >
                                <span className="flex-1 min-w-0 truncate">
                                  {language === 'it'
                                    ? phase.phase_name_it || phase.phase_name_en
                                    : phase.phase_name_en || phase.phase_name_it || '—'}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-600 focus:text-red-600"
                                  onClick={(e) => handleDeletePhase(e, phase.id)}
                                  disabled={deletingPhaseId === phase.id}
                                  aria-label={t('deletePhaseAria')}
                                >
                                  {deletingPhaseId === phase.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AppSelectItem>
                            ))}
                            <AppSelectItem value="__add__" className="rounded-lg font-medium text-[#6A8F7B]">
                              + {t('addOthers')}
                            </AppSelectItem>
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.phase && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errors.phase}</span>
                        </div>
                      )}

                      {showAddPhase && (
                        <div className="mt-4 p-4 border border-neutral-line-200 rounded-xl bg-neutral-line-50 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="newPhaseEn" className="text-neutral-ink-700">
                              {t('phaseNameEnglish')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="newPhaseEn"
                              value={newPhaseEn}
                              onChange={(e) => {
                                setNewPhaseEn(e.target.value);
                                if (addPhaseError) setAddPhaseError(null);
                              }}
                              placeholder={t('phaseNameEnPlaceholder')}
                              disabled={addingPhase}
                              className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPhaseIt" className="text-neutral-ink-700">
                              {t('phaseNameItalian')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="newPhaseIt"
                              value={newPhaseIt}
                              onChange={(e) => {
                                setNewPhaseIt(e.target.value);
                                if (addPhaseError) setAddPhaseError(null);
                              }}
                              placeholder={t('phaseNameItPlaceholder')}
                              disabled={addingPhase}
                              className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                            />
                          </div>
                          {addPhaseError && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span>{addPhaseError}</span>
                            </div>
                          )}
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowAddPhase(false);
                                setNewPhaseEn('');
                                setNewPhaseIt('');
                                setAddPhaseError(null);
                              }}
                              disabled={addingPhase}
                              className="rounded-xl border-neutral-line-200"
                            >
                              {t('cancel')}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleAddPhase()}
                              disabled={addingPhase || !newPhaseEn.trim() || !newPhaseIt.trim()}
                              className="rounded-xl bg-[#6A8F7B] hover:bg-[#5a7a68] text-white"
                            >
                              {addingPhase ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {t('saving') || 'Saving...'}
                                </>
                              ) : (
                                t('addPhase')
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Description */}
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
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="status_document_upload" className="text-neutral-ink-700">
                        {t('selectFile')} <span className="text-neutral-ink-400">({t('optional')})</span>
                      </Label>
                      <div className="border-2 border-dashed border-neutral-line-300 rounded-xl p-4 text-center hover:border-[#6A8F7B] transition-colors duration-300">
                        <input
                          id="status_document_upload"
                          type="file"
                          accept={ACCEPTED_DOC_TYPES}
                          onChange={handleDocumentChange}
                          className="hidden"
                        />
                        {!statusDocument ? (
                          <label
                            htmlFor="status_document_upload"
                            className={`cursor-pointer block ${errors.document ? 'border-red-500' : ''}`}
                          >
                            <div className="space-y-1.5">
                              <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                                <Upload className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-neutral-ink-900 mb-1">
                                  {t('upload') || 'Click to upload'}
                                </p>
                                <p className="text-xs text-neutral-ink-500">
                                  PDF, DOC, DOCX, PPT, PPTX, Images (max {MAX_DOC_SIZE_MB}MB)
                                </p>
                              </div>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-center justify-center gap-3 py-2">
                            <span className="text-sm text-neutral-ink-700 truncate flex-1" title={statusDocument.name}>
                              {statusDocument.name}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveDocument}
                              className="rounded-lg shrink-0"
                            >
                              {t('remove') || 'Remove'}
                            </Button>
                          </div>
                        )}
                      </div>
                      {errors.document && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errors.document}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Date */}
                    <div className="space-y-2">
                      <Label htmlFor="statusDate" className="text-neutral-ink-700">
                        {t('statusDate')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="statusDate"
                        type="date"
                        value={statusDate}
                        onChange={(e) => handleChange('statusDate', e.target.value)}
                        className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${
                          errors.statusDate ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {errors.statusDate && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errors.statusDate}</span>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-5 border-t border-neutral-line-200 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={saving}
                        className="flex-1 rounded-lg border-neutral-line-200 hover:bg-neutral-line-100"
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-lg shadow-md"
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
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
