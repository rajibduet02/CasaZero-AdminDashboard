import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Users, 
  Building2, 
  FileText, 
  Wrench,
  TrendingUp,
  TrendingDown,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { fetchAdminDashboardOverview } from '../../utils/api';
import { parseApiError } from '../../utils/apiError';
import { ErrorState } from '../ui/ErrorState';
import { Card } from '../ui/card';

type DashboardOverviewData = {
  total_users: number;
  total_units: number;
  total_documents: number;
  total_maintenances: number;
};

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { t, language } = useLanguage();
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminDashboardOverview({ force: true });
      if (!data) {
        setOverview(null);
        setLoadError(
          t('failedToLoadData') || 'Unable to load dashboard statistics.',
        );
        return;
      }
      setOverview(data);
    } catch (err) {
      setOverview(null);
      setLoadError(
        parseApiError(err, {
          fallbackMessage: t('failedToLoadData') || 'Unable to load dashboard statistics.',
        }).message,
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const formatStat = (n: number | undefined) =>
    n == null || Number.isNaN(n)
      ? t('notApplicableShort')
      : n.toLocaleString(language === 'it' ? 'it-IT' : 'en-US');

  const stats = useMemo(
    () => [
      {
        id: 'users',
        icon: Users,
        label: t('totalUsers'),
        value: formatStat(overview?.total_users),
        change: '+12%',
        trend: 'up' as const,
        color: 'from-[#6A8F7B] to-[#5a7a68]',
        onClick: () => onNavigate('users'),
      },
      {
        id: 'buildings',
        icon: Building2,
        label: t('totalBuildings'),
        value: formatStat(overview?.total_units),
        change: '+2',
        trend: 'up' as const,
        color: 'from-[#14B8A6] to-[#0D9488]',
        onClick: () => onNavigate('units'),
      },
      {
        id: 'documents',
        icon: FileText,
        label: t('totalDocuments'),
        value: formatStat(overview?.total_documents),
        change: '+156',
        trend: 'up' as const,
        color: 'from-[#3B82F6] to-[#2563EB]',
        onClick: () => onNavigate('document-list'),
      },
      {
        id: 'maintenance',
        icon: Wrench,
        label: t('openRequests'),
        value: formatStat(overview?.total_maintenances),
        change: '-8',
        trend: 'down' as const,
        color: 'from-[#FFB020] to-[#F59E0B]',
        onClick: () => onNavigate('maintenance-list'),
      },
    ],
    [overview, t, language, onNavigate]
  );

  const recentActivity = useMemo(
    () => [
      {
        id: 1,
        type: 'user',
        title: t('newUserRegistration'),
        description: t('dashboardActivityUserDesc'),
        time: t('dashboardActivityTime5Min'),
        icon: Users,
      },
      {
        id: 2,
        type: 'document',
        title: t('documentUploaded'),
        description: t('dashboardActivityDocumentDesc'),
        time: t('dashboardActivityTime1Hour'),
        icon: FileText,
      },
      {
        id: 3,
        type: 'maintenance',
        title: t('maintenanceCompleted'),
        description: t('dashboardActivityMaintenanceDesc'),
        time: t('dashboardActivityTime2Hours'),
        icon: Wrench,
      },
      {
        id: 4,
        type: 'building',
        title: t('buildingAdded'),
        description: t('dashboardActivityBuildingDesc'),
        time: t('dashboardActivityTime1Day'),
        icon: Building2,
      },
    ],
    [t],
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-neutral-ink-900 mb-2">{t('dashboard')}</h1>
        <p className="text-neutral-ink-500">{t('dashboardWelcome')}</p>
      </motion.div>

      {loadError && (
        <ErrorState
          title={t('unableToLoadDashboard') || 'Unable to load dashboard statistics'}
          message={loadError}
          onRetry={() => void loadOverview()}
          retryLabel={t('retry') || 'Retry'}
          retrying={loading}
          compact
        />
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          
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
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs flex-shrink-0 ${
                    stat.trend === 'up' 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{stat.change}</span>
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

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-xl text-neutral-ink-900">{t('recentActivity')}</h2>
            <button className="flex items-center gap-2 text-xs sm:text-sm text-[#6A8F7B] hover:text-[#5a7a68] transition-colors duration-200">
              {t('viewAll')}
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (0.1 * index), duration: 0.3 }}
                  className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-neutral-line-100 transition-all duration-200 cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68] flex-shrink-0">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-neutral-ink-900 mb-1 truncate">{activity.title}</p>
                    <p className="text-xs text-neutral-ink-500 line-clamp-2">{activity.description}</p>
                  </div>
                  
                  <span className="text-xs text-neutral-ink-400 flex-shrink-0 ml-2">{activity.time}</span>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
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
            onClick={() => onNavigate('users')}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#6A8F7B] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('addUser')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('createNewUserAccount')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('residence-list')}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#14B8A6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('addBuilding')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('registerNewBuilding')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('document-list')}
            className="p-4 sm:p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group w-full"
          >
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#3B82F6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-sm sm:text-base text-neutral-ink-900 mb-2">{t('uploadDocument')}</h3>
            <p className="text-xs sm:text-sm text-neutral-ink-500">{t('addNewDocument')}</p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
