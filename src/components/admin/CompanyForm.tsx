import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Briefcase, Loader2, Save, X, AlertCircle } from 'lucide-react';
import { Label } from '../ui/label';
import { useLanguage } from '../../utils/LanguageContext';

export interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (company: Omit<Company, 'id' | 'created_at'> & { id?: number }) => void;
  company?: Company | null;
  loading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CompanyForm({ open, onOpenChange, company, onSave, loading: externalLoading }: CompanyFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!company;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = React.useRef(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
      });
    } else {
      setFormData({ name: '', email: '', phone: '' });
    }
    setErrors({});
  }, [company, open]);

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ name: '', email: '', phone: '' });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
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
    if (!formData.name.trim()) {
      newErrors.name = t('companyNameRequired');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = t('emailInvalid');
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validateForm()) return;

    submittingRef.current = true;
    onSave({
      id: company?.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
    });
  };

  useEffect(() => {
    if (!externalLoading) submittingRef.current = false;
  }, [externalLoading]);

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
            <Card className="rounded-2xl border border-neutral-line-200 shadow-xl bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-line-200 bg-gradient-to-r from-[#6A8F7B]/5 to-[#5a7a68]/5 shrink-0">
                <div>
                  <h2 className="text-neutral-ink-900 font-medium">
                    {isEditMode ? t('editCompany') : t('addCompany')}
                  </h2>
                  <p className="text-sm text-neutral-ink-500 mt-0.5">
                    {isEditMode ? t('updateCompanyDesc') : t('createCompanyDesc')}
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

              <div className="flex-1 min-h-0 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-neutral-ink-700">
                      {t('companyName')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-ink-400" />
                      <Input
                        id="company_name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder={t('companyName')}
                        className={`pl-10 rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${errors.name ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="company_email" className="text-neutral-ink-700">
                      {t('emailAddress')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="email@example.com"
                      className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="company_phone" className="text-neutral-ink-700">
                      {t('phoneNumber')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+39 02 1234567"
                      className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${errors.phone ? 'border-red-500' : ''}`}
                    />
                    {errors.phone && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-5 border-t border-neutral-line-200 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
