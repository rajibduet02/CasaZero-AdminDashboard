import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, X, Plus } from 'lucide-react';
import { AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectViewport,
} from '../ui/app-select';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, isApiTruthyStatus, safeJsonParse,
  apiFetch,
} from '../../utils/api';
import { fetchCompanies } from './CompanyList';

export interface ResidenceOption {
  id: number;
  residence_name: string;
}

interface MaintenanceOption {
  id: number;
  maintenance_title: string;
}

interface CompanyOption {
  id: number;
  name: string;
}

type FormStatus = 'due' | 'pending' | 'completed';

const STATUS_OPTIONS: { value: FormStatus; labelKey: 'due' | 'pending' | 'completed' }[] = [
  { value: 'due', labelKey: 'due' },
  { value: 'pending', labelKey: 'pending' },
  { value: 'completed', labelKey: 'completed' },
];

/** Row data used to prefill the form when editing (maps to the update API payload). */
export interface ResidenceWiseMaintenanceEditData {
  /** `maintenance_residence_id` — the pivot row id required by the update API. */
  id: number;
  residence_id: number | null;
  maintenance_id: number | null;
  company_id: number | null;
  status: string | null;
  due_date: string | null;
}

/** Map API status to one of the form's selectable values (due / pending / completed). */
function toFormStatus(status: string | null | undefined): FormStatus | '' {
  if (!status) return '';
  const normalized = status.toLowerCase().replace(/[-\s]/g, '_');
  return STATUS_OPTIONS.some((opt) => opt.value === normalized) ? (normalized as FormStatus) : '';
}

interface ResidenceWiseMaintenanceFormProps {
  open: boolean;
  onClose: () => void;
  /** Residences already loaded by the list page (shared, not re-fetched). */
  residences: ResidenceOption[];
  loadingResidences?: boolean;
  /** Pre-selects this residence when the form opens (e.g. current list filter). */
  initialResidenceId?: number | null;
  /** When set, the form opens in edit mode prefilled with this row and calls the update API. */
  editData?: ResidenceWiseMaintenanceEditData | null;
  /** Called after a maintenance is created or updated successfully (e.g. to refresh the list). */
  onCreated?: () => void;
}

export function ResidenceWiseMaintenanceForm({
  open,
  onClose,
  residences,
  loadingResidences = false,
  initialResidenceId = null,
  editData = null,
  onCreated,
}: ResidenceWiseMaintenanceFormProps) {
  const { t } = useLanguage();

  const [residenceId, setResidenceId] = useState<string>('');
  const [maintenanceId, setMaintenanceId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [status, setStatus] = useState<FormStatus | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [maintenanceOptions, setMaintenanceOptions] = useState<MaintenanceOption[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEditMode = editData != null;

  // Reset fields each time the form opens (prefilled from editData in edit mode).
  useEffect(() => {
    if (!open) return;
    if (editData) {
      setResidenceId(editData.residence_id != null ? String(editData.residence_id) : '');
      setMaintenanceId(editData.maintenance_id != null ? String(editData.maintenance_id) : '');
      setCompanyId(editData.company_id != null ? String(editData.company_id) : '');
      setStatus(toFormStatus(editData.status));
      setDueDate(editData.due_date ? editData.due_date.slice(0, 10) : '');
    } else {
      setResidenceId(initialResidenceId != null ? String(initialResidenceId) : '');
      setMaintenanceId('');
      setCompanyId('');
      setStatus('');
      setDueDate('');
    }
    setErrors({});
  }, [open, initialResidenceId, editData]);

  // Load maintenance + company options when the form opens (dropdown data only).
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const apiToken = localStorage.getItem('casazero_token') || '';

        const [maintenanceRes, companies] = await Promise.all([
          apiToken
            ? apiFetch(`${API_BASE}/all_maintenance/admin?_=${Date.now()}`, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                  'Cache-Control': 'no-cache',
                  Pragma: 'no-cache',
                  Authorization: `Bearer ${apiToken}`,
                },
              })
            : Promise.resolve(null),
          fetchCompanies(),
        ]);

        if (cancelled) return;

        if (maintenanceRes) {
          if (!maintenanceRes.ok) {
            throw new Error(`HTTP error! status: ${maintenanceRes.status}`);
          }
          const data = await safeJsonParse<{
            status?: unknown;
            data?: { id: number; maintenance_title?: string }[];
          }>(maintenanceRes);

          if (isApiTruthyStatus(data.status) && Array.isArray(data.data)) {
            setMaintenanceOptions(
              data.data
                .map((m) => ({
                  id: Number(m.id),
                  maintenance_title: (m.maintenance_title ?? '').trim() || '—',
                }))
                .filter((o) => !Number.isNaN(o.id) && o.id > 0),
            );
          } else {
            setMaintenanceOptions([]);
          }
        } else {
          setMaintenanceOptions([]);
        }

        setCompanyOptions(
          companies
            .map((c) => ({
              id: Number(c.id),
              name: (c.name ?? '').trim() || '—',
            }))
            .filter((c) => !Number.isNaN(c.id) && c.id > 0),
        );
      } catch (err) {
        console.error('❌ [RESIDENCE-WISE-MAINT-FORM] Failed to load options:', err);
        if (!cancelled) {
          setMaintenanceOptions([]);
          setCompanyOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!residenceId) {
      next.residence_id = t('residenceRequired') || 'Residence is required';
    }
    if (!maintenanceId) {
      next.maintenance_id = t('selectMaintenancePlaceholder') || 'Select maintenance';
    }
    if (!companyId) {
      next.company_id = t('selectCompanyPlaceholder') || 'Select company';
    }
    if (!status) {
      next.status = t('selectStatus') || 'Select status';
    }
    if (!dueDate) {
      next.due_date = t('dueDateRequired') || 'Due date is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const apiToken = localStorage.getItem('casazero_token') || '';
    if (!apiToken) {
      toast.error(t('error') || 'Error', {
        description: t('missingApiToken'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isEditMode
        ? `${API_BASE}/maintenanceResidence/update`
        : `${API_BASE}/maintenanceResidence/create`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          api_token: apiToken,
          ...(isEditMode ? { id: editData.id } : {}),
          residence_id: Number(residenceId),
          maintenance_id: Number(maintenanceId),
          company_id: Number(companyId),
          status,
          due_date: dueDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await safeJsonParse<{ status?: unknown; message?: string }>(response);

      if (isApiTruthyStatus(result.status)) {
        toast.success(t('success') || 'Success', {
          description:
            result.message ||
            (isEditMode
              ? t('maintenanceUpdatedSuccess') || 'Maintenance updated successfully'
              : t('maintenanceCreatedSuccess') || 'Maintenance created successfully'),
        });
        onCreated?.();
        onClose();
      } else {
        throw new Error(
          result.message ||
            (isEditMode
              ? t('failedToUpdateMaintenance') || 'Failed to update maintenance'
              : t('failedToCreateMaintenance') || 'Failed to create maintenance'),
        );
      }
    } catch (err) {
      console.error('❌ [RESIDENCE-WISE-MAINT-FORM] Failed to save maintenance:', err);
      toast.error(t('error') || 'Error', {
        description:
          err instanceof Error
            ? err.message
            : isEditMode
              ? t('failedToUpdateMaintenance') || 'Failed to update maintenance'
              : t('failedToCreateMaintenance') || 'Failed to create maintenance',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] flex flex-col"
          >
            <div ref={containerRef} className="w-full h-full flex flex-col min-h-0 max-h-[90vh]">
              <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-neutral-ink-900 font-medium truncate">
                      {isEditMode
                        ? t('editMaintenance') || 'Edit Maintenance'
                        : t('addMaintenance') || 'Add Maintenance'}
                    </h2>
                    <p className="text-sm text-neutral-ink-500 mt-0.5 truncate">
                      {isEditMode
                        ? t('updateMaintenanceInfo') || 'Update the maintenance information'
                        : t('addNewMaintenance') || 'Add a new maintenance task'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="rounded-lg w-9 h-9 p-0 hover:bg-neutral-line-200 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="p-4 sm:p-6 space-y-5">
                    {loadingOptions ? (
                      <div className="flex items-center gap-2 text-sm text-neutral-ink-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#6A8F7B]" />
                        {t('loading') || 'Loading...'}
                      </div>
                    ) : null}

                    {/* Residence */}
                    <div className="space-y-2">
                      <Label className="text-neutral-ink-700">
                        {t('selectResidence') || 'Select residence'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={containerRef}
                        value={residenceId}
                        onValueChange={(value: string) => {
                          setResidenceId(value);
                          clearError('residence_id');
                        }}
                        disabled={loadingResidences}
                      >
                        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                          <AppSelectValue placeholder={t('selectResidence') || 'Select residence'} />
                        </AppSelectTrigger>
                        <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                          <AppSelectViewport>
                            {residences.length === 0 ? (
                              <div className="px-2 py-3 text-sm text-neutral-ink-500">
                                {t('noResidenceFound') || 'No residence found.'}
                              </div>
                            ) : (
                              residences.map((residence) => (
                                <AppSelectItem
                                  key={residence.id}
                                  value={String(residence.id)}
                                  className="rounded-lg"
                                >
                                  {residence.residence_name}
                                </AppSelectItem>
                              ))
                            )}
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.residence_id ? (
                        <p className="text-sm text-red-600">{errors.residence_id}</p>
                      ) : null}
                    </div>

                    {/* Maintenance */}
                    <div className="space-y-2">
                      <Label className="text-neutral-ink-700">
                        {t('selectMaintenancePlaceholder') || 'Select maintenance'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={containerRef}
                        value={maintenanceId}
                        onValueChange={(value: string) => {
                          setMaintenanceId(value);
                          clearError('maintenance_id');
                        }}
                        disabled={loadingOptions}
                      >
                        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                          <AppSelectValue
                            placeholder={t('selectMaintenancePlaceholder') || 'Select maintenance'}
                          />
                        </AppSelectTrigger>
                        <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                          <AppSelectViewport>
                            {maintenanceOptions.length === 0 ? (
                              <div className="px-2 py-3 text-sm text-neutral-ink-500">
                                {t('noMaintenancesYet') || 'No maintenances found'}
                              </div>
                            ) : (
                              maintenanceOptions.map((m) => (
                                <AppSelectItem
                                  key={m.id}
                                  value={String(m.id)}
                                  className="rounded-lg"
                                >
                                  {m.maintenance_title}
                                </AppSelectItem>
                              ))
                            )}
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.maintenance_id ? (
                        <p className="text-sm text-red-600">{errors.maintenance_id}</p>
                      ) : null}
                    </div>

                    {/* Company */}
                    <div className="space-y-2">
                      <Label className="text-neutral-ink-700">
                        {t('selectCompanyPlaceholder') || 'Select company'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={containerRef}
                        value={companyId}
                        onValueChange={(value: string) => {
                          setCompanyId(value);
                          clearError('company_id');
                        }}
                        disabled={loadingOptions}
                      >
                        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                          <AppSelectValue
                            placeholder={t('selectCompanyPlaceholder') || 'Select company'}
                          />
                        </AppSelectTrigger>
                        <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                          <AppSelectViewport>
                            {companyOptions.length === 0 ? (
                              <div className="px-2 py-3 text-sm text-neutral-ink-500">
                                {t('failedToLoadCompaniesDesc') || 'Failed to load companies'}
                              </div>
                            ) : (
                              companyOptions.map((company) => (
                                <AppSelectItem
                                  key={company.id}
                                  value={String(company.id)}
                                  className="rounded-lg"
                                >
                                  {company.name}
                                </AppSelectItem>
                              ))
                            )}
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.company_id ? (
                        <p className="text-sm text-red-600">{errors.company_id}</p>
                      ) : null}
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label className="text-neutral-ink-700">
                        {t('status') || 'Status'} <span className="text-red-500">*</span>
                      </Label>
                      <AppSelect
                        containerRef={containerRef}
                        value={status}
                        onValueChange={(value: string) => {
                          setStatus(value as FormStatus);
                          clearError('status');
                        }}
                      >
                        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                          <AppSelectValue placeholder={t('selectStatus') || 'Select status'} />
                        </AppSelectTrigger>
                        <AppSelectContent className="rounded-xl max-h-[280px] overflow-y-auto">
                          <AppSelectViewport>
                            {STATUS_OPTIONS.map((opt) => (
                              <AppSelectItem
                                key={opt.value}
                                value={opt.value}
                                className="rounded-lg"
                              >
                                {t(opt.labelKey)}
                              </AppSelectItem>
                            ))}
                          </AppSelectViewport>
                        </AppSelectContent>
                      </AppSelect>
                      {errors.status ? <p className="text-sm text-red-600">{errors.status}</p> : null}
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <Label htmlFor="rwm-form-due-date" className="text-neutral-ink-700">
                        {t('dueDate') || 'Due Date'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="rwm-form-due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          clearError('due_date');
                        }}
                        className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]"
                      />
                      {errors.due_date ? (
                        <p className="text-sm text-red-600">{errors.due_date}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-5 border-t border-neutral-line-200 shrink-0">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  >
                    {t('cancel') || 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loadingOptions || isSubmitting}
                    className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isEditMode
                      ? t('updateMaintenance') || 'Update Maintenance'
                      : t('createMaintenance') || 'Create Maintenance'}
                  </Button>
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
