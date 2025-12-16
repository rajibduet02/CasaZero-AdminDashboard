import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ConstructionTimeline, getDefaultConstructionPhases } from '../casazero/ConstructionTimeline';
import { FileText, Wrench, AlertCircle, Info, BarChart3, Users, Building, Sparkles } from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useLanguage } from '../../utils/LanguageContext';
import residenceImage from 'figma:asset/311205dacd5d3ef883094fca0b59cfebf281e1d1.png';

interface HomeScreenProps {
  role: Role;
  firstName: string;
  fullName: string;
  residenceStatus: 'completed' | 'under-construction';
  onNavigate: (screen: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

const tileVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  },
  hover: { 
    scale: 1.03,
    y: -4,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { scale: 0.97 }
};

export function HomeScreen({ role, firstName, fullName, residenceStatus, onNavigate }: HomeScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const quickStats = {
    newDocuments: 3,
    maintenanceDue: 2,
    chatUpdates: 5,
    openTickets: 1,
  };

  const constructionPhases = getDefaultConstructionPhases(t);

  const feedItems = [
    {
      id: '1',
      type: 'maintenance',
      priority: 'high',
      title: 'HVAC System Maintenance Due',
      description: 'Annual HVAC inspection is required (N2 - Mandatory)',
      time: '2 days ago',
    },
    {
      id: '2',
      type: 'document',
      title: 'New Energy Certificate Available',
      description: 'Your updated energy performance certificate has been uploaded',
      time: '3 days ago',
    },
    {
      id: '3',
      type: 'announcement',
      title: 'Building Maintenance Schedule Update',
      description: 'Elevator maintenance scheduled for Nov 8-9',
      time: '5 days ago',
    },
  ];

  const quickTiles = [
    { permission: 'canAccessAnalytics', icon: BarChart3, title: t('analytics'), screen: 'analytics', stat: null, label: t('residenceInsightsDesc'), color: 'brand-sage', badge: null },
    { permission: 'canViewUserList', icon: Users, title: t('residents'), screen: 'users', stat: null, label: t('manageCommunityDesc'), color: 'info', badge: null },
    { permission: 'canManageBuildings', icon: Building, title: t('building'), screen: 'buildings', stat: null, label: t('manageBuildingsDesc'), color: 'brand-sage', badge: null },
  ];

  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* Premium Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white border-b border-neutral-line-100/50 px-6 py-4 shadow-sm"
      >
        <div className="flex items-start gap-3 max-w-md mx-auto">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-sage-500 to-accent-lime-500 shadow-lg flex items-center justify-center flex-shrink-0"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0 mt-0.5">
            <p className="text-sm text-neutral-ink-800 leading-relaxed">
              <span className="font-medium text-neutral-ink-900">What's new:</span> CasaZero AI now supports document analysis!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Residence Name - Above Image */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-6 pt-6 max-w-md mx-auto"
      >
        <h1 className="text-center text-neutral-ink-900 tracking-tight font-semibold" style={{ fontSize: '1.75rem', letterSpacing: '-0.025em' }}>
          {t('residence')} {fullName}
        </h1>
      </motion.div>

      {/* Premium Hero Image - Full Width */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative mt-4"
      >
        <div className="h-[500px] relative group overflow-hidden">
          <img 
            src={residenceImage}
            alt="Residence"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient fade from header at top */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface-warm-50 via-transparent to-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, rgb(250 249 246) 0%, rgba(250, 249, 246, 0.8) 10%, rgba(250, 249, 246, 0) 25%)' }}></div>
          
          {/* Gradient fade to white at bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
          
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-lime-500/20 rounded-full blur-3xl"></div>
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="px-6 pt-4 space-y-8 max-w-md mx-auto bg-white"
      >
        {/* Welcome Message - Only shown when construction is completed */}
        {residenceStatus === 'completed' && (
          <motion.div 
            variants={item}
            className="text-center -mt-4"
          >
            <motion.h2 
              className="tracking-tight text-neutral-ink-700 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ fontSize: '1.375rem', letterSpacing: '-0.015em' }}
            >
              {t('welcome')} {firstName}
            </motion.h2>
          </motion.div>
        )}

        {/* Construction Progress - Only shown when under construction */}
        {residenceStatus === 'under-construction' && (
          <motion.div variants={item}>
            <Card className="border border-neutral-line-100 shadow-sm hover:shadow-lg transition-all duration-500 overflow-hidden bg-white">
              {/* Subtle aqua accent - fresh and light */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-aqua-green-100/30 to-transparent rounded-full blur-3xl"></div>
              <CardHeader className="pb-4 relative">
                <CardTitle className="flex items-center gap-2 text-neutral-ink-900">
                  {t('constructionProgress') || 'Construction Progress'}
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-5 h-5 text-aqua-green-500" />
                  </motion.div>
                </CardTitle>
                <CardDescription className="text-neutral-ink-500">{t('yourHomeIsBeingBuilt') || 'Your new home is taking shape'}</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <ConstructionTimeline phases={constructionPhases} />
                
                {/* View More Details Button */}
                {permissions.canManageBuildings && (
                  <motion.div 
                    className="mt-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button 
                      onClick={() => onNavigate('buildings')}
                      className="w-full bg-aqua-green-600 hover:bg-aqua-green-700 text-white shadow-sm hover:shadow-md transition-all"
                    >
                      <Building className="w-4 h-4 mr-2" />
                      {t('viewAllBuildings') || 'View All Buildings'}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Latest Notifications Feed - Always shown */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-ink-800" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>{t('latestNotifications')}</h3>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-2 h-2 rounded-full bg-accent-lime-500 shadow-lg shadow-accent-lime-500/50"
            ></motion.div>
          </div>
          
          <div className="space-y-2.5">
            {feedItems.map((feedItem, index) => (
              <motion.div
                key={feedItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer"
              >
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-surface-warm-50 border border-neutral-line-200/40 hover:border-neutral-line-200 transition-all duration-300 group
                  ${feedItem.type === 'maintenance' 
                    ? 'shadow-[0_2px_8px_-2px_rgba(255,152,0,0.08),0_4px_16px_-4px_rgba(255,152,0,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(255,152,0,0.16),0_12px_32px_-8px_rgba(255,152,0,0.12)]' 
                    : feedItem.type === 'document'
                    ? 'shadow-[0_2px_8px_-2px_rgba(76,175,71,0.08),0_4px_16px_-4px_rgba(76,175,71,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(76,175,71,0.16),0_12px_32px_-8px_rgba(76,175,71,0.12)]'
                    : 'shadow-[0_2px_8px_-2px_rgba(33,150,243,0.08),0_4px_16px_-4px_rgba(33,150,243,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(33,150,243,0.16),0_12px_32px_-8px_rgba(33,150,243,0.12)]'
                  }`}
                >
                  {/* Premium Colored Accent Border */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    feedItem.type === 'maintenance'
                      ? 'bg-gradient-to-b from-warning via-warning to-warning/60'
                      : feedItem.type === 'document'
                      ? 'bg-gradient-to-b from-brand-sage-500 via-brand-sage-500 to-brand-sage-400'
                      : 'bg-gradient-to-b from-info via-info to-info/60'
                  }`}></div>
                  
                  {/* Subtle Glow Effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    feedItem.type === 'maintenance'
                      ? 'bg-gradient-to-r from-warning/5 to-transparent'
                      : feedItem.type === 'document'
                      ? 'bg-gradient-to-r from-brand-sage-500/5 to-transparent'
                      : 'bg-gradient-to-r from-info/5 to-transparent'
                  }`}></div>
                  
                  <div className="relative p-3.5 pl-4">
                    <div className="flex gap-3.5 items-start">
                      {/* Premium Icon Container */}
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                        className={`relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm ${
                          feedItem.type === 'maintenance'
                            ? 'bg-gradient-to-br from-warning/20 via-warning/15 to-warning/5 shadow-lg shadow-warning/20'
                            : feedItem.type === 'document'
                            ? 'bg-gradient-to-br from-brand-sage-100 via-brand-sage-50 to-white shadow-lg shadow-brand-sage-500/20'
                            : 'bg-gradient-to-br from-info/20 via-info/15 to-info/5 shadow-lg shadow-info/20'
                        }`}
                      >
                        {/* Icon Glow */}
                        <div className={`absolute inset-0 rounded-xl blur-md opacity-50 ${
                          feedItem.type === 'maintenance'
                            ? 'bg-warning/30'
                            : feedItem.type === 'document'
                            ? 'bg-brand-sage-500/30'
                            : 'bg-info/30'
                        }`}></div>
                        
                        {feedItem.type === 'maintenance' ? (
                          <Wrench className={`relative z-10 w-5 h-5 ${feedItem.priority === 'high' ? 'text-warning' : 'text-neutral-ink-600'}`} />
                        ) : feedItem.type === 'document' ? (
                          <FileText className="relative z-10 w-5 h-5 text-brand-sage-600" />
                        ) : (
                          <AlertCircle className="relative z-10 w-5 h-5 text-info" />
                        )}
                      </motion.div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="mb-1 font-semibold text-neutral-ink-800 group-hover:text-brand-sage-600 transition-colors leading-tight">{feedItem.title}</h4>
                        <p className="text-xs text-neutral-ink-500 mb-1.5 line-clamp-1 leading-relaxed">
                          {feedItem.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-1 h-1 rounded-full bg-neutral-ink-300"></div>
                          <p className="text-xs text-neutral-ink-400 font-medium">{feedItem.time}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* View All Buildings Card - Always shown for admins */}
        {permissions.canManageBuildings && (
          <motion.div variants={item}>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('buildings')}
              className="w-full"
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent-lime-500/10 to-transparent rounded-full blur-2xl"></div>
                <CardHeader className="pb-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-sage-500 to-brand-sage-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow"
                      >
                        <Building className="w-6 h-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-base">{t('building')}</CardTitle>
                        <CardDescription className="text-xs">{t('viewAllBuildings') || 'View all buildings & construction progress'}</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-accent-lime-500 text-white shadow-md">
                      {residenceStatus === 'under-construction' ? '🏗️' : '✓'}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </motion.button>
          </motion.div>
        )}

        {/* Premium Quick Tiles Grid - Only shown when construction is completed */}
        {residenceStatus === 'completed' && (
          <motion.div 
            variants={container}
            className="grid grid-cols-2 gap-4"
          >
            {quickTiles.map((tile, index) => {
              const hasPermission = permissions[tile.permission as keyof typeof permissions];
              if (!hasPermission) return null;
              
              const Icon = tile.icon;
              
              return (
                <motion.button
                  key={tile.screen}
                  variants={tileVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => onNavigate(tile.screen)}
                  className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-line-200/50 shadow-lg hover:shadow-xl text-left group overflow-hidden transition-all duration-300"
                >
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-sage-50/0 to-brand-sage-100/0 group-hover:from-brand-sage-50/50 group-hover:to-brand-sage-100/30 transition-all duration-300 rounded-2xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <motion.div 
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`w-12 h-12 rounded-xl ${
                          tile.color === 'brand-sage' ? 'bg-gradient-to-br from-brand-sage-500 to-brand-sage-600' :
                          tile.color === 'warning' ? 'bg-gradient-to-br from-warning/80 to-warning' :
                          tile.color === 'info' ? 'bg-gradient-to-br from-info/80 to-info' :
                          'bg-gradient-to-br from-success/80 to-success'
                        } flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </motion.div>
                      {tile.stat !== null && tile.stat > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                        >
                          <Badge className={`${
                            tile.badge === 'danger' ? 'bg-danger' :
                            tile.badge === 'warning' ? 'bg-warning' :
                            tile.badge === 'info' ? 'bg-info' :
                            'bg-success'
                          } text-white shadow-md`}>
                            {tile.stat}
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    <h3 className="mb-1.5 font-semibold text-neutral-ink-800">{tile.title}</h3>
                    <p className="text-xs text-neutral-ink-500 font-medium">
                      {tile.stat !== null && tile.stat > 0 ? `${tile.stat} ${tile.label}` : tile.label}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
