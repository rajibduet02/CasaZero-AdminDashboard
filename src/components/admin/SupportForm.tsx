import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Upload, File, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useLanguage } from '../../utils/LanguageContext';
import type { SupportTicket } from './SupportList';

interface SupportFormProps {
  ticket?: SupportTicket | null;
  onClose: () => void;
  onSave: (ticket: Partial<SupportTicket> & { id?: number }) => void;
  loading?: boolean;
}

// Future: residence-based company auto-routing handled by backend
// residence_id, unit_id, warranty_status are hidden and auto-filled from API when creating from context.

const STATUS_OPTIONS = [
  { value: 'open', labelKey: 'supportStatusOpen' },
  { value: 'in_progress', labelKey: 'supportStatusInProgress' },
  { value: 'resolved', labelKey: 'supportStatusResolved' },
  { value: 'closed', labelKey: 'supportStatusClosed' },
] as const;

// Placeholder issue types - prepare for dynamic per-residence later (labelKey for i18n)
const ISSUE_TYPE_OPTIONS = [
  { value: 'General', labelKey: 'issueTypeGeneral' },
  { value: 'Technical', labelKey: 'issueTypeTechnical' },
  { value: 'Warranty', labelKey: 'issueTypeWarranty' },
  { value: 'Billing', labelKey: 'issueTypeBilling' },
  { value: 'Other', labelKey: 'issueTypeOther' },
] as const;

export function SupportForm({ ticket, onClose, onSave, loading: externalLoading }: SupportFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!ticket;

  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    attachment_url: '' as string | null,
    status: 'open' as 'open' | 'in_progress' | 'resolved' | 'closed',
    // Hidden - auto-filled later from API
    residence_id: 0,
    unit_id: 0,
    warranty_status: 'out_of_warranty' as 'in_warranty' | 'out_of_warranty',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = React.useRef(false);

  useEffect(() => {
    if (ticket) {
      setFormData({
        issue_type: ticket.issue_type || '',
        description: ticket.description || '',
        attachment_url: ticket.attachment_url || null,
        status: ticket.status || 'open',
        residence_id: ticket.residence_id ?? 0,
        unit_id: ticket.unit_id ?? 0,
        warranty_status: ticket.warranty_status || 'out_of_warranty',
      });
      setFilePreview(ticket.attachment_url || '');
    }
  }, [ticket]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, attachment: t('fileSizeExceeded3MB') }));
      e.target.value = '';
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, attachment_url: base64 }));
      setFilePreview(file.type.startsWith('image/') ? base64 : '');
    };
    reader.onerror = () => setErrors((prev) => ({ ...prev, attachment: t('failedToReadFile') }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.issue_type.trim()) {
      newErrors.issue_type = t('issueTypeRequired');
    }
    if (!formData.description.trim()) {
      newErrors.description = t('descriptionRequired');
    }
    if (!isEditMode && !formData.attachment_url && !selectedFile) {
      // Attachment optional for create; if we make it required later, uncomment:
      // newErrors.attachment = 'Attachment is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validateForm()) return;

    submittingRef.current = true;
    const payload = {
      id: ticket?.id,
      issue_type: formData.issue_type.trim(),
      description: formData.description.trim(),
      attachment_url: formData.attachment_url,
      status: formData.status,
      residence_id: formData.residence_id,
      unit_id: formData.unit_id,
      warranty_status: formData.warranty_status,
    };
    onSave(payload);
  };

  useEffect(() => {
    if (!externalLoading) submittingRef.current = false;
  }, [externalLoading]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 1024) return bytes + ' Bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header - same style as MaintenanceForm */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
            <div>
              <h2 className="text-neutral-ink-900 font-medium">
                {isEditMode ? t('editTicket') : t('addTicket')}
              </h2>
              <p className="text-sm text-neutral-ink-500 mt-0.5">
                {isEditMode ? t('updateSupportTicketDesc') : t('createSupportTicketDesc')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg w-9 h-9 p-0 hover:bg-neutral-line-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Issue Type */}
              <div className="space-y-2">
                <Label htmlFor="issue_type" className="text-neutral-ink-700">
                  {t('supportIssueType')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.issue_type || undefined}
                  onValueChange={(value) => handleInputChange('issue_type', value)}
                >
                  <SelectTrigger
                    id="issue_type"
                    className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${errors.issue_type ? 'border-red-500' : ''}`}
                  >
                    <SelectValue placeholder={t('selectIssueType')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ISSUE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.issue_type && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.issue_type}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-neutral-ink-700">
                  {t('supportDescriptionLabel')} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('describeIssue')}
                  className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] min-h-[100px]"
                />
                {errors.description && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.description}</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-neutral-ink-700">
                  {t('supportStatus')}
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as typeof formData.status)}
                >
                  <SelectTrigger id="status" className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
                    <SelectValue placeholder={t('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="rounded-lg">
                        {t(s.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attachment - same pattern as DocumentForm */}
              <div className="space-y-2">
                <Label htmlFor="attachment" className="text-neutral-ink-700">
                  {t('supportAttachment')}
                </Label>
                <div className="border-2 border-dashed border-neutral-line-300 rounded-xl p-4 text-center hover:border-[#6A8F7B] transition-colors duration-300">
                  <input
                    id="attachment"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                  />
                  <label htmlFor="attachment" className="cursor-pointer">
                    {selectedFile || filePreview ? (
                      <div className="space-y-3">
                        {filePreview && selectedFile?.type.startsWith('image/') && (
                          <img src={filePreview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                        )}
                        <div className="flex items-center justify-center gap-3">
                          <File className="w-8 h-8 text-[#6A8F7B]" />
                          <div className="text-left">
                            <p className="text-sm text-neutral-ink-900">
                              {selectedFile?.name ?? t('fileAttached')}
                            </p>
                            <p className="text-xs text-neutral-ink-500">
                              {formatFileSize(selectedFile?.size ?? 0)}
                            </p>
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="rounded-xl mt-2">
                          {t('changeFile')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-sm text-neutral-ink-900 mb-1">{t('clickToUpload')}</p>
                        <p className="text-xs text-neutral-ink-500">{t('attachmentFormats')}</p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.attachment && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.attachment}</span>
                  </div>
                )}
              </div>

              

              {/* Action Buttons - same style as MaintenanceForm/DocumentForm */}
              <div className="flex gap-3 pt-5 border-t border-neutral-line-200 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={externalLoading}
                  className="flex-1 rounded-lg border-neutral-line-200 hover:bg-neutral-line-100"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={externalLoading}
                  className="flex-1 bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-lg shadow-md"
                >
                  {externalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : isEditMode ? (
                    t('updateTicket')
                  ) : (
                    t('createTicketButton')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
