import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Building2, 
  FileText, 
  Wrench,
  TrendingUp,
  TrendingDown,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { Card } from '../ui/card';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { t } = useLanguage();

  const stats = [
    {
      id: 'users',
      icon: Users,
      label: t('totalUsers'),
      value: '1,248',
      change: '+12%',
      trend: 'up',
      color: 'from-[#6A8F7B] to-[#5a7a68]',
      onClick: () => onNavigate('users'),
    },
    {
      id: 'buildings',
      icon: Building2,
      label: t('totalBuildings'),
      value: '24',
      change: '+2',
      trend: 'up',
      color: 'from-[#14B8A6] to-[#0D9488]',
      onClick: () => onNavigate('buildings'),
    },
    {
      id: 'documents',
      icon: FileText,
      label: t('totalDocuments'),
      value: '3,456',
      change: '+156',
      trend: 'up',
      color: 'from-[#3B82F6] to-[#2563EB]',
      onClick: () => onNavigate('documents'),
    },
    {
      id: 'maintenance',
      icon: Wrench,
      label: t('openRequests'),
      value: '42',
      change: '-8',
      trend: 'down',
      color: 'from-[#FFB020] to-[#F59E0B]',
      onClick: () => onNavigate('maintenance'),
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'user',
      title: t('newUserRegistration'),
      description: 'Mario Bianchi - Residenza Verde Building A',
      time: '5 min fa',
      icon: Users,
    },
    {
      id: 2,
      type: 'document',
      title: t('documentUploaded'),
      description: 'Contratto di Locazione - Unit 4B',
      time: '1 ora fa',
      icon: FileText,
    },
    {
      id: 3,
      type: 'maintenance',
      title: t('maintenanceCompleted'),
      description: 'Riparazione ascensore - Building A',
      time: '2 ore fa',
      icon: Wrench,
    },
    {
      id: 4,
      type: 'building',
      title: t('buildingAdded'),
      description: 'Residenza Verde Building C',
      time: '1 giorno fa',
      icon: Building2,
    },
  ];

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

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
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
              <Card className="p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 shadow-sm hover:shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    stat.trend === 'up' 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{stat.change}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-2xl text-neutral-ink-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-neutral-ink-500">{stat.label}</p>
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
        <Card className="p-6 rounded-2xl border border-neutral-line-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-neutral-ink-900">{t('recentActivity')}</h2>
            <button className="flex items-center gap-2 text-sm text-[#6A8F7B] hover:text-[#5a7a68] transition-colors duration-200">
              {t('viewAll')}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (0.1 * index), duration: 0.3 }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-neutral-line-100 transition-all duration-200 cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A8F7B] to-[#5a7a68]">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-neutral-ink-900 mb-1">{activity.title}</p>
                    <p className="text-xs text-neutral-ink-500">{activity.description}</p>
                  </div>
                  
                  <span className="text-xs text-neutral-ink-400">{activity.time}</span>
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
        <h2 className="text-neutral-ink-900 mb-4">{t('quickActions')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('users')}
            className="p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group"
          >
            <Users className="w-8 h-8 text-[#6A8F7B] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-neutral-ink-900 mb-2">{t('addUser')}</h3>
            <p className="text-sm text-neutral-ink-500">{t('createNewUserAccount')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('buildings')}
            className="p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group"
          >
            <Building2 className="w-8 h-8 text-[#14B8A6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-neutral-ink-900 mb-2">{t('addBuilding')}</h3>
            <p className="text-sm text-neutral-ink-500">{t('registerNewBuilding')}</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('documents')}
            className="p-6 rounded-2xl border border-neutral-line-200 hover:border-[#6A8F7B] transition-all duration-300 text-left group"
          >
            <FileText className="w-8 h-8 text-[#3B82F6] mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-neutral-ink-900 mb-2">{t('uploadDocument')}</h3>
            <p className="text-sm text-neutral-ink-500">{t('addNewDocument')}</p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
