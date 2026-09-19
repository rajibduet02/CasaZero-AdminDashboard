import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
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
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE, apiFetch } from '../../utils/api';
import { parseApiError } from '../../utils/apiError';
import { ErrorState } from '../ui/ErrorState';
import { CompanyForm, type Company } from './CompanyForm';

/** Shared with ResidenceForm and other callers — same POST body and mapping as company list UI. */
export async function fetchCompanies(): Promise<Company[]> {
  const api_token = localStorage.getItem('casazero_token') || '';
  const response = await apiFetch(`${API_BASE}/get_all/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ api_token }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const res = await response.json() as { success?: boolean; message?: string; data?: any[] };
  if (res?.success && Array.isArray(res.data)) {
    return res.data.map((item) => ({
      id: item.id,
      name: item.company_name,
      email: item.email,
      phone: item.phone,
      created_at: item.created_at,
    }));
  }
  throw new Error(res?.message || 'Unable to load companies.');
}

function formatExactDateTime(isoDate: string): string {
  if (!isoDate || !isoDate.trim()) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function CompanyList() {
  const { t } = useLanguage();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadCompanies = () => {
    setLoading(true);
    setListError(null);
    fetchCompanies()
      .then(setCompanies)
      .catch((err) => {
        setCompanies([]);
        setListError(
          parseApiError(err, {
            fallbackMessage: t('failedToLoadData') || 'Unable to load companies.',
          }).message,
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredCompanies(
        companies.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        )
      );
    }
  }, [companies, searchTerm]);

  const handleCreate = () => {
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<Company, 'id' | 'created_at'> & { id?: number }) => {
    setIsSaving(true);
    try {
      const api_token = localStorage.getItem('casazero_token') || '';
      const isEdit = !!data.id;
      const endpoint = isEdit ? `${API_BASE}/update/company` : `${API_BASE}/create/company`;
      const body = isEdit
        ? { api_token, company_id: data.id, company_name: data.name, email: data.email, phone: data.phone }
        : { api_token, company_name: data.name, email: data.email, phone: data.phone };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const res = await response.json() as { success?: boolean; message?: string; data?: any };
      if (res?.success) {
        const item = res.data;
        if (isEdit) {
          setCompanies((prev) =>
            prev.map((c) => (c.id === data.id ? {
              ...c,
              name: item?.company_name ?? data.name,
              email: item?.email ?? data.email,
              phone: item?.phone ?? data.phone,
            } : c))
          );
        } else {
          const newCompany: Company = {
            id: item?.id ?? Date.now(),
            name: item?.company_name ?? data.name,
            email: item?.email ?? data.email,
            phone: item?.phone ?? data.phone,
            created_at: item?.created_at ?? new Date().toISOString(),
          };
          setCompanies((prev) => [newCompany, ...prev]);
        }
        setIsModalOpen(false);
        setSelectedCompany(null);
        toast.success(t('success') || 'Success', { description: t('companySavedSuccess') });
      } else {
        toast.error(t('error'), { description: res?.message || t('failedToSaveCompany') });
      }
    } catch {
      toast.error(t('error'), { description: t('failedToSaveCompany') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (company: Company) => {
    setDeletingCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany || isDeleting) return;
    setIsDeleting(true);
    try {
      const api_token = localStorage.getItem('casazero_token') || '';
      const response = await apiFetch(`${API_BASE}/delete/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ api_token, company_id: deletingCompany.id }),
      });
      const res = await response.json() as { success?: boolean; message?: string };
      if (res?.success) {
        setCompanies((prev) => prev.filter((c) => c.id !== deletingCompany.id));
        setDeleteDialogOpen(false);
        setDeletingCompany(null);
        toast.success(t('success') || 'Success', { description: t('companyDeletedSuccess') });
      } else {
        toast.error(t('error'), { description: res?.message || t('failedToDeleteCompany') });
      }
    } catch {
      toast.error(t('error'), { description: t('failedToDeleteCompany') });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCompanies = companies.length;

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
          <h1 className="text-neutral-ink-900 mb-2">{t('companyManagement')}</h1>
          <p className="text-neutral-ink-500">{t('manageServiceProviders')}</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white hover:opacity-90 transition-all duration-300 rounded-xl px-6 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addCompany')}
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
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-neutral-ink-900">{totalCompanies}</p>
              <p className="text-xs text-neutral-ink-500">{t('totalCompanies')}</p>
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
              placeholder={t('searchCompanies')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                    {t('companyName')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('emailAddress')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('phoneNumber')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('createdAt') || 'Created'}
                  </th>
                  <th className="px-6 py-4 text-right text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-line-200">
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-neutral-line-100 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm text-neutral-ink-900">{company.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {company.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {company.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {formatExactDateTime(company.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
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
                              <DropdownMenuItem onClick={() => handleEdit(company)} className="cursor-pointer rounded-lg">
                                <Edit className="w-4 h-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(company)}
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
                  ))}
              </tbody>
            </table>

            {loading && companies.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 py-12"
              >
                <Loader2 className="w-6 h-6 animate-spin text-[#6A8F7B]" />
                <span className="text-neutral-ink-500">{t('loading') ?? 'Loading...'}</span>
              </motion.div>
            )}

            {!loading && listError && (
              <ErrorState
                title={t('unableToLoadCompanies') || 'Unable to load companies'}
                message={listError}
                onRetry={loadCompanies}
                retryLabel={t('retry') || 'Retry'}
                className="m-6"
              />
            )}

            {!loading && !listError && filteredCompanies.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="flex flex-col items-center gap-3">
                  <Briefcase className="w-12 h-12 text-neutral-ink-300" />
                  <p className="text-neutral-ink-500">{t('noCompaniesFound')}</p>
                </div>
              </motion.div>
            )}

            {filteredCompanies.length > 0 && <div className="h-24" />}
          </div>
        </Card>
      </motion.div>

      {/* Company Form Modal */}
      <CompanyForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        company={selectedCompany}
        onSave={handleSave}
        loading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCompany')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCompanyConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
