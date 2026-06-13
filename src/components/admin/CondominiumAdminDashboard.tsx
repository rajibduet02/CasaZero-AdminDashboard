import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Building,
  Building2,
  Wrench,
  MessageCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import {
  fetchCondominiumAdminMaintenances,
  fetchResidencesCatalog,
  fetchUnitListCatalog,
  isApiTruthyStatus,
  residencesArrayFromApiResult,
  safeJsonParse,
} from '../../utils/api';
import { chatPageIdForResidence } from './chatMockData';
import { Card } from '../ui/card';

type MaintenanceRow = {
  id: number;
  maintenance_title?: string;
  maintenance_status?: string;
  due_date?: string;
  updated_at?: string;
  created_at?: string;
  residence?: { residence_name?: string } | null;
};

function mapScopedMaintenanceRow(
  raw: unknown,
  residenceId: number,
): MaintenanceRow {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const residenceRaw =
    r.residence && typeof r.residence === 'object'
      ? (r.residence as Record<string, unknown>)
      : null;

  return {
    id: Number(r.id) || 0,
    maintenance_title: String(r.maintenance_title ?? '').trim() || undefined,
    maintenance_status: String(r.maintenance_status ?? r.status ?? '').trim() || undefined,
    due_date: typeof r.due_date === 'string' ? r.due_date : undefined,
    updated_at: typeof r.updated_at === 'string' ? r.updated_at : undefined,
    created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
    residence: residenceRaw
      ? { residence_name: String(residenceRaw.residence_name ?? residenceRaw.name ?? '').trim() || undefined }
      : { residence_name: undefined },
  };
}

type DashboardStats = {
  residenceCount: number;
  unitCount: number;
  openMaintenanceCount: number;
  totalMaintenanceCount: number;
};

interface CondominiumAdminDashboardProps {
  onNavigate: (page: string) => void;
  sessionUser?: Record<string, unknown> | null;
}

const OPEN_MAINTENANCE_STATUSES = new Set(['pending', 'inprogress', 'overdue']);

function formatStat(n: number | undefined) {
  return n == null || Number.isNaN(n) ? '—' : n.toLocaleString('en-US');
}

function formatActivityDate(value: string | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CondominiumAdminDashboard({
  onNavigate,
  sessionUser,
}: CondominiumAdminDashboardProps) {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMaintenances, setRecentMaintenances] = useState<MaintenanceRow[]>([]);
  const [firstChatPageId, setFirstChatPageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      const api_token = localStorage.getItem('casazero_token') || '';
      if (!api_token) return;

      try {
        const [residencesRes, unitsRes, scopedMaintenances] = await Promise.all([
          fetchResidencesCatalog({ sessionUser }),
          fetchUnitListCatalog({ sessionUser }),
          fetchCondominiumAdminMaintenances(sessionUser),
        ]);

        if (cancelled) return;

        const residencesJson = await safeJsonParse<Record<string, unknown>>(residencesRes);
        const unitsJson = await safeJsonParse<{ status?: unknown; data?: unknown[] }>(unitsRes);
        const maintenances = scopedMaintenances
          .map(({ raw, residenceId }) => mapScopedMaintenanceRow(raw, residenceId))
          .filter((row) => row.id > 0);

        const residences = isApiTruthyStatus(residencesJson.status)
          ? residencesArrayFromApiResult(residencesJson)
          : [];
        const units = Array.isArray(unitsJson.data) ? unitsJson.data : [];

        const openMaintenanceCount = maintenances.filter((row) =>
          OPEN_MAINTENANCE_STATUSES.has(String(row.maintenance_status ?? '').toLowerCase()),
        ).length;

        const sortedRecent = [...maintenances]
          .sort((a, b) => {
            const aTime = new Date(a.updated_at ?? a.due_date ?? a.created_at ?? 0).getTime();
            const bTime = new Date(b.updated_at ?? b.due_date ?? b.created_at ?? 0).getTime();
            return bTime - aTime;
          })
          .slice(0, 4);

        const firstResidence = residences[0] as { id?: unknown } | undefined;
        const firstId = firstResidence?.id != null ? Number(firstResidence.id) : NaN;
        const chatPage =
          !Number.isNaN(firstId) && firstId > 0 ? chatPageIdForResidence(firstId) : null;

        setStats({
          residenceCount: residences.length,
          unitCount: units.length,
          openMaintenanceCount,
          totalMaintenanceCount: maintenances.length,
        });
        setRecentMaintenances(sortedRecent);
        setFirstChatPageId(chatPage);
      } catch {
        if (!cancelled) {
          setStats(null);
          setRecentMaintenances([]);
          setFirstChatPageId(null);
        }
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  const statCards = useMemo(
    () => [
      {
        id: 'residences',
        icon: Building,
        label: t('residences'),
        value: formatStat(stats?.residenceCount),
        color: 'from-[#6A8F7B] to-[#5a7a68]',
        onClick: () => onNavigate('residence-list'),
      },
      {
        id: 'units',
        icon: Building2,
        label: t('totalBuildings'),
        value: formatStat(stats?.unitCount),
        color: 'from-[#14B8A6] to-[#0D9488]',
        onClick: () => onNavigate('units'),
      },
      {
        id: 'open-maintenance',
        icon: Wrench,
        label: t('openRequests'),
        value: formatStat(stats?.openMaintenanceCount),
        color: 'from-[#FFB020] to-[#F59E0B]',
        onClick: () => onNavigate('maintenance-list'),
      },
      {
        id: 'total-maintenance',
        icon: Wrench,
        label: t('totalMaintenances'),
        value: formatStat(stats?.totalMaintenanceCount),
        color: 'from-[#3B82F6] to-[#2563EB]',
        onClick: () => onNavigate('maintenance-list'),
      },
    ],
    [stats, t, onNavigate],
  );

  const handleOpenChat = () => {
    if (firstChatPageId) {
      onNavigate(firstChatPageId);
      return;
    }
    onNavigate('condominium-chat');
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-neutral-ink-900 mb-2">{t('dashboard')}</h1>
        <p className="text-neutral-ink-500">{t('adminDashboardWelcome')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {statCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1), duration: 0.4 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="cursor-pointer"
              onClick={stat.onClick}
            >
              <Card className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 shadow-sm hover:shadow-lg w-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${stat.color} flex-shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl text-neutral-ink-900 mb-1 truncate">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-neutral-ink-500 line-clamp-2">{stat.label}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-xl text-neutral-ink-900">{t('recentActivity')}</h2>
            <button
              type="button"
              onClick={() => onNavigate('maintenance-list')}
              className="flex items-center gap-2 text-xs sm:text-sm text-[#6A8F7B] hover:text-[#5a7a68] transition-colors duration-200"
            >
              {t('viewAll')}
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {recentMaintenances.length === 0 ? (
              <p className="text-sm text-neutral-ink-500 py-4 text-center">{t('noRecentActivity')}</p>
            ) : (
              recentMaintenances.map((activity, index) => (
                <motion.button
                  key={activity.id}
                  type="button"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + 0.1 * index, duration: 0.3 }}
                  onClick={() => onNavigate('maintenance-list')}
                  className="flex w-full items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-neutral-line-100 transition-all duration-200 text-left"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex-shrink-0">
                    <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-neutral-ink-900 mb-1 truncate">
                      {activity.maintenance_title || t('maintenances')}
                    </p>
                    <p className="text-xs text-neutral-ink-500 line-clamp-2">
                      {activity.residence?.residence_name || '—'}
                    </p>
                  </div>

                  <span className="text-xs text-neutral-ink-400 flex-shrink-0 ml-2">
                    {formatActivityDate(
                      activity.updated_at ?? activity.due_date ?? activity.created_at,
                      language,
                    )}
                  </span>
                </motion.button>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <h2 className="text-lg sm:text-xl text-neutral-ink-900 mb-4">{t('quickActions')}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('residence-list')}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <Building className="w-6 h-6 sm:w-8 sm:h-8 text-[#6A8F7B] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('residences')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('viewAssignedResidences')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('units')}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#14B8A6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('units')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('manageAssignedUnits')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenChat}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#3B82F6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('condominiumChat')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('condominiumChatDesc')}</p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
