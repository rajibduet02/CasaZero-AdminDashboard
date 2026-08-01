import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Building2, Search, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE } from '../../utils/api';
import { ConstructionPhasesForm } from './ConstructionPhasesForm';

export type ConstructionPhaseStatus = 'Under Construction' | 'Completed' | 'Planned';

/** Row shape for the construction phases table (from get-under-construction API) */
export interface ConstructionTableRow {
  id: number;
  residence_id: number;
  residence_name: string;
  residence_address: string;
  residence_status: string;
  phase_name_en: string;
  phase_name_it: string;
  status_description: string;
  created_at: string;
  updated_at: string;
}

/** Item from GET residence-status/get-under-construction */
export interface UnderConstructionStatusItem {
  id: number;
  residence_id: number;
  phase_id: number;
  status_description: string;
  status_date: string;
  created_at: string;
  updated_at: string;
  residence: {
    id: number;
    residence_name: string;
    residence_address: string;
    residence_status: string;
  };
  phase: {
    id: number;
    phase_name_en: string;
    phase_name_it: string;
  };
}

function mapApiItemToTableRow(item: UnderConstructionStatusItem): ConstructionTableRow {
  const resObj = item.residence as { id?: number; residence_name?: string; residence_address?: string; residence_status?: string } | undefined;
  const residenceId = Number(
    item.residence_id ?? resObj?.id ?? (item as { residence?: { id?: number } }).residence?.id,
  );
  return {
    id: item.id,
    residence_id: Number.isFinite(residenceId) && residenceId > 0 ? residenceId : 0,
    residence_name: resObj?.residence_name ?? (item as { residence_name?: string }).residence_name ?? '',
    residence_address: resObj?.residence_address ?? (item as { residence_address?: string }).residence_address ?? '',
    residence_status: resObj?.residence_status ?? (item as { residence_status?: string }).residence_status ?? '',
    phase_name_en: item.phase?.phase_name_en ?? (item as { phase_name_en?: string }).phase_name_en ?? '',
    phase_name_it: item.phase?.phase_name_it ?? (item as { phase_name_it?: string }).phase_name_it ?? '',
    status_description: item.status_description ?? '',
    created_at: item.created_at ?? '',
    updated_at: item.updated_at ?? '',
  };
}

function authJsonHeaders(): HeadersInit {
  const token = localStorage.getItem('casazero_token') || '';
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readUnderConstructionPayload(res: Record<string, unknown>): UnderConstructionStatusItem[] {
  const d = res.data;
  if (Array.isArray(d)) return d as UnderConstructionStatusItem[];
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const o = d as Record<string, unknown>;
    for (const key of ['data', 'items', 'records', 'statuses', 'list'] as const) {
      const inner = o[key];
      if (Array.isArray(inner)) return inner as UnderConstructionStatusItem[];
    }
  }
  if (Array.isArray(res.items)) return res.items as UnderConstructionStatusItem[];
  if (Array.isArray(res.records)) return res.records as UnderConstructionStatusItem[];
  return [];
}

/** Format ISO date string as exact date and time (e.g. "2/17/2026, 12:27:40 PM"). */
function formatExactDateTime(isoDate: string): string {
  if (!isoDate || !isoDate.trim()) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function ConstructionPhasesList() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<ConstructionTableRow[]>([]);
  const [filteredData, setFilteredData] = useState<ConstructionTableRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const getApiToken = useCallback((): string => {
    return localStorage.getItem('casazero_token') || '';
  }, []);

  const fetchUnderConstruction = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const api_token = getApiToken();
      const response = await fetch(`${API_BASE}/residence-status/get-under-construction`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({ api_token }),
      });
      let res: Record<string, unknown>;
      try {
        res = (await response.json()) as Record<string, unknown>;
      } catch {
        setData([]);
        setListError(t('invalidResponseFromServer'));
        return;
      }
      const ok =
        response.ok &&
        (res.status === true ||
          res.status === 1 ||
          res.status === '1' ||
          res.success === true ||
          res.success === 1 ||
          res.success === '1');
      const rows = readUnderConstructionPayload(res);
      if (rows.length > 0) {
        setData(rows.map(mapApiItemToTableRow));
        setListError(null);
      } else if (ok) {
        setData([]);
        setListError(null);
      } else {
        setData([]);
        setListError(String(res.message ?? t('failedToLoadData')));
      }
    } catch (err) {
      console.error('Under construction fetch error:', err);
      setData([]);
      setListError(t('failedToLoadConstructionPhases'));
    } finally {
      setLoadingList(false);
    }
  }, [getApiToken]);

  useEffect(() => {
    fetchUnderConstruction();
  }, [fetchUnderConstruction]);

  const sortedTableRows = useMemo(() => {
    return [...data].sort((a, b) => {
      const aUpdated = new Date(a.updated_at).getTime();
      const bUpdated = new Date(b.updated_at).getTime();
      return bUpdated - aUpdated;
    });
  }, [data]);

  // Filter based on search (all API rows — no client-side dedupe by residence)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(sortedTableRows);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sortedTableRows.filter(
        (row) =>
          row.residence_name.toLowerCase().includes(query) ||
          row.residence_address.toLowerCase().includes(query) ||
          row.residence_status.toLowerCase().includes(query) ||
          row.status_description.toLowerCase().includes(query)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, sortedTableRows]);

  const totalUnderConstruction = useMemo(() => {
    const ids = new Set<number>();
    for (const r of data) {
      if (r.residence_status === 'Under Construction' && r.residence_id > 0) {
        ids.add(r.residence_id);
      }
    }
    return ids.size;
  }, [data]);

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
          onClick={() => setUpdateDialogOpen(true)}
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
                    {t('currentPhase')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('statusDescription')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('createdAt') || 'Created'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs text-neutral-ink-600 uppercase tracking-wider">
                    {t('updatedAt') || 'Updated'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-line-200">
                <AnimatePresence>
                  {filteredData.map((row, index) => (
                    <motion.tr
                      key={`${row.id}-${row.residence_id}-${row.updated_at}`}
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
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-xs">{row.residence_address || t('noAddress')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {language === 'it'
                          ? (row.phase_name_it || row.phase_name_en || '—')
                          : (row.phase_name_en || row.phase_name_it || '—')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-xs ${getStatusBadgeClass(row.residence_status)}`}
                        >
                          {row.residence_status === 'Under Construction'
                            ? t('underConstruction')
                            : row.residence_status === 'Planned'
                              ? t('planned')
                              : row.residence_status}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-neutral-ink-600">
                        <span className="line-clamp-2 max-w-md">{row.status_description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {formatExactDateTime(row.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-ink-600">
                        {formatExactDateTime(row.updated_at)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {loadingList && data.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 py-12"
              >
                <Loader2 className="w-6 h-6 animate-spin text-[#6A8F7B]" />
                <span className="text-neutral-ink-500">{t('loading') ?? 'Loading...'}</span>
              </motion.div>
            )}

            {!loadingList && listError && data.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-red-500">{listError}</p>
              </motion.div>
            )}

            {!loadingList && !listError && filteredData.length === 0 && (
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

      <ConstructionPhasesForm
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onSuccess={fetchUnderConstruction}
      />
    </div>
  );
}
