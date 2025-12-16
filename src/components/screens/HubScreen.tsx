import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Sparkles, Home as SmartHome, HelpCircle } from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { useLanguage } from '../../utils/LanguageContext';
import aiChatIcon from 'figma:asset/88b68ee504f343bdee6862cbaaa850243d8833f6.png';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';

interface HubScreenProps {
  role: Role;
  onNavigate: (screen: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: (index: number) => ({ 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
      delay: 0.1 + index * 0.1
    }
  }),
  hover: { 
    scale: 1.02,
    y: -8,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { scale: 0.98 }
};

export function HubScreen({ role, onNavigate }: HubScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();

  const hubCards = [
    {
      id: 'ai',
      screen: 'aichat',
      title: t('casaZeroAI'),
      icon: null,
      isImage: true,
      gradient: 'from-brand-sage-500 to-accent-lime-500',
      bgGradient: 'from-brand-sage-50 to-accent-lime-50',
      shadowColor: 'rgba(76, 175, 71, 0.3)',
      hoverColor: '#4CAF47',
      show: permissions.canAccessAI,
    },
    {
      id: 'smarthome',
      screen: 'smarthome',
      title: t('domotica'),
      icon: SmartHome,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      shadowColor: 'rgba(168, 85, 247, 0.3)',
      hoverColor: '#9333ea',
      show: permissions.canAccessSmartHome,
    },
    {
      id: 'chat',
      screen: 'chat',
      title: t('condominiumChat'),
      icon: MessageCircle,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      shadowColor: 'rgba(59, 130, 246, 0.3)',
      hoverColor: '#3b82f6',
      show: permissions.canAccessChat,
    },
    {
      id: 'assistenza',
      screen: 'tickets',
      title: t('assistenza') || 'Assistenza',
      icon: HelpCircle,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      hoverColor: '#f59e0b',
      show: permissions.canCreateTickets,
    },
  ].filter(card => card.show);

  return (
    <div className="pb-20 bg-white min-h-screen relative overflow-hidden">
      {/* CasaZero Cube Logo - Top Center */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.1
        }}
        className="relative pt-12 pb-8 flex justify-center"
      >
        <div className="relative">
          {/* Soft Glow Effect */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-br from-brand-sage-500 to-accent-lime-500 rounded-full blur-3xl"
            style={{ transform: 'scale(1.5)' }}
          />
          
          {/* CasaZero Logo */}
          <motion.img
            src={casazeroLogo}
            alt="CasaZero"
            className="relative h-10 w-auto drop-shadow-lg"
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.3 }
            }}
          />
          
          {/* Subtle Ring Glow */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute inset-0 rounded-full border-2 border-brand-sage-400/30 blur-sm"
            style={{ transform: 'scale(1.3)' }}
          />
        </div>
      </motion.div>

      {/* Hub Cards - Grid Layout */}
      <div className="relative px-6 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {hubCards.map((card, index) => {
            const Icon = card.icon;
            
            return (
              <motion.button
                key={card.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                whileHover="hover"
                whileTap="tap"
                onClick={() => onNavigate(card.screen)}
                className="w-full text-center relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm border border-neutral-line-200/50 shadow-md hover:shadow-xl transition-all duration-300 group"
                style={{
                  boxShadow: `0 2px 8px -2px ${card.shadowColor}, 0 4px 16px -4px ${card.shadowColor}`
                }}
              >
                {/* Background Gradient - subtle */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
                
                {/* Decorative Glow - appears on hover */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${card.gradient} opacity-0 group-hover:opacity-20 rounded-full blur-2xl transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative p-5 flex flex-col items-center justify-center gap-3">
                  {/* Icon Container */}
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex-shrink-0 w-14 h-14 flex items-center justify-center ${!card.isImage ? `rounded-xl bg-gradient-to-br ${card.gradient} shadow-md` : ''}`}
                    style={{
                      boxShadow: card.isImage ? 'none' : `0 4px 12px -2px ${card.shadowColor}`
                    }}
                  >
                    {card.isImage ? (
                      <img 
                        src={aiChatIcon} 
                        alt="CasaZero AI"
                        className="w-14 h-14 drop-shadow-lg"
                      />
                    ) : Icon ? (
                      <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                    ) : null}
                  </motion.div>
                  
                  {/* Title - centered, no description */}
                  <h3 className="font-semibold text-neutral-ink-900 text-sm leading-tight group-hover:text-brand-sage-700 transition-colors duration-300">
                    {card.title}
                  </h3>
                </div>
                
                {/* Accent line on hover */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"
                  style={{
                    background: `linear-gradient(to right, transparent, ${card.hoverColor}, transparent)`
                  }}
                ></div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative mt-8 mx-6 max-w-md mx-auto"
      >
        <div className="bg-gradient-to-r from-brand-sage-50 to-accent-lime-50/50 border border-brand-sage-200/50 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-brand-sage-500 to-accent-lime-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-neutral-ink-700 leading-relaxed">
              {t('hubTip')}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
