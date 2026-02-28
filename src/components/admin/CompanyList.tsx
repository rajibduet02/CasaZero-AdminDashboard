import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
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
import { useLanguage } from '../../utils/LanguageContext';
import { CompanyForm, type Company } from './CompanyForm';

// TODO: Replace with API call
const MOCK_COMPANIES: Company[] = [
  { id: 1, name: 'Rossi Impianti S.r.l.', email: 'info@rossiimpianti.it', phone: '+39 02 1234567', created_at: '2025-01-10T09:00:00Z' },
  { id: 2, name: 'Bianchi Pavimenti', email: 'contatto@bianchipavimenti.it', phone: '+39 02 2345678', created_at: '2025-01-12T10:30:00Z' },
  { id: 3, name: 'Verdi Elettrica S.p.A.', email: 'info@verdielectrica.it', phone: '+39 02 3456789', created_at: '2025-01-15T08:15:00Z' },
  { id: 4, name: 'Colombo Idraulica', email: 'colombo@idraulica.it', phone: '+39 02 4567890', created_at: '2025-01-18T14:00:00Z' },
  { id: 5, name: 'Ferrari Serramenti', email: 'info@ferrariserramenti.it', phone: '+39 02 5678901', created_at: '2025-01-20T11:45:00Z' },
  { id: 6, name: 'Romano Pitture e Decorazioni', email: 'romano@pitture.it', phone: '+39 02 6789012', created_at: '2025-01-22T16:00:00Z' },
  { id: 7, name: 'Esposito Coperture', email: 'info@espositocoperture.it', phone: '+39 02 7890123', created_at: '2025-01-25T09:30:00Z' },
  { id: 8, name: 'Russo Giardinaggio', email: 'info@russogiardinaggio.it', phone: '+39 02 8901234', created_at: '2025-01-28T13:00:00Z' },
  { id: 9, name: 'Greco Ascensori', email: 'assistenza@grecoascensori.it', phone: '+39 02 9012345', created_at: '2025-02-01T10:00:00Z' },
  { id: 10, name: 'Conti Sicurezza', email: 'info@contisicurezza.it', phone: '+39 02 0123456', created_at: '2025-02-05T15:30:00Z' },
];

function formatExactDateTime(isoDate: string): string {
  if (!isoDate || !isoDate.trim()) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function CompanyList() {
  const { t } = useLanguage();

  // TODO: Replace with API call
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

  useEffect(() => {
    // TODO: Replace with API call
    setLoading(true);
    const timer = setTimeout(() => {
      setCompanies([...MOCK_COMPANIES]);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
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

  const handleSave = (data: Omit<Company, 'id' | 'created_at'> & { id?: number }) => {
    setIsSaving(true);
    // TODO: Replace with API call
    setTimeout(() => {
      if (data.id) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === data.id ? { ...c, name: data.name, email: data.email, phone: data.phone } : c))
        );
      } else {
        const newCompany: Company = {
          id: Date.now(),
          name: data.name,
          email: data.email,
          phone: data.phone,
          created_at: new Date().toISOString(),
        };
        setCompanies((prev) => [newCompany, ...prev]);
      }
      setIsSaving(false);
      setIsModalOpen(false);
      setSelectedCompany(null);
      toast.success(t('success') || 'Success', { description: t('companySavedSuccess') });
    }, 300);
  };

  const handleDeleteClick = (company: Company) => {
    setDeletingCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingCompany || isDeleting) return;
    setIsDeleting(true);
    // TODO: Replace with API call
    setTimeout(() => {
      setCompanies((prev) => prev.filter((c) => c.id !== deletingCompany.id));
      setDeleteDialogOpen(false);
      setDeletingCompany(null);
      setIsDeleting(false);
      toast.success(t('success') || 'Success', { description: t('companyDeletedSuccess') });
    }, 300);
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
                <AnimatePresence>
                  {filteredCompanies.map((company, index) => (
                    <motion.tr
                      key={company.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: 0.05 * index, duration: 0.3 }}
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
                    </motion.tr>
                  ))}
                </AnimatePresence>
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

            {!loading && filteredCompanies.length === 0 && (
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
