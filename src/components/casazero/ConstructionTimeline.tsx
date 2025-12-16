import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, HardHat, Building2, Paintbrush, Wrench, Zap, Key } from 'lucide-react';

export interface ConstructionPhase {
  id: string;
  title: string;
  icon: any;
  status: 'completed' | 'in-progress' | 'not-started';
  date?: string;
}

interface ConstructionTimelineProps {
  phases: ConstructionPhase[];
}

export function ConstructionTimeline({ phases }: ConstructionTimelineProps) {
  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          bg: 'bg-aqua-green-600', 
          text: 'text-aqua-green-700', 
          border: 'border-aqua-green-200', 
          fill: 'fill-aqua-green-600',
          cardBg: 'bg-white',
          cardBorder: 'border-neutral-line-200',
          iconBg: 'bg-aqua-green-600'
        };
      case 'in-progress':
        return { 
          bg: 'bg-aqua-green-500', 
          text: 'text-aqua-green-700', 
          border: 'border-aqua-green-300', 
          fill: 'fill-aqua-green-500',
          cardBg: 'bg-white',
          cardBorder: 'border-aqua-green-300',
          iconBg: 'bg-aqua-green-500'
        };
      default:
        return { 
          bg: 'bg-neutral-line-200', 
          text: 'text-neutral-ink-400', 
          border: 'border-neutral-line-200', 
          fill: 'fill-neutral-line-300',
          cardBg: 'bg-white',
          cardBorder: 'border-neutral-line-100',
          iconBg: 'bg-neutral-line-200'
        };
    }
  };

  return (
    <div className="relative py-2">
      {/* Vertical Progress Line Container */}
      <div className="relative">
        {phases.map((phase, idx) => {
          const colors = getPhaseColor(phase.status);
          const isLast = idx === phases.length - 1;
          
          return (
            <div key={phase.id} className="relative">
              {/* Phase Row */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1 + idx * 0.1 
                }}
                className="flex items-start gap-4 relative"
              >
                {/* Left Side: Icon and Connector Line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  {/* Icon Circle */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colors.iconBg} flex items-center justify-center shadow-md border-3 sm:border-4 border-white z-10 transition-all`}
                  >
                    {phase.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="white" />
                    ) : (
                      <phase.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    )}
                    
                    {/* Pulse animation for in-progress */}
                    {phase.status === 'in-progress' && (
                      <>
                        <motion.div
                          animate={{ 
                            scale: [1, 1.4, 1],
                            opacity: [0.4, 0, 0.4]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 rounded-full bg-aqua-green-400 opacity-30"
                        />
                        <motion.div
                          animate={{ 
                            scale: [1, 1.6, 1],
                            opacity: [0.2, 0, 0.2]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.4
                          }}
                          className="absolute inset-0 rounded-full bg-aqua-green-300 opacity-20"
                        />
                      </>
                    )}
                  </motion.div>

                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div className="relative w-0.5 sm:w-1 flex-1" style={{ minHeight: '60px' }}>
                      {/* Background line */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 sm:w-1 h-full bg-neutral-line-100 rounded-full" />
                      
                      {/* Progress line - only show if current or previous phase is completed/in-progress */}
                      {(phase.status === 'completed' || phase.status === 'in-progress') && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ 
                            height: phase.status === 'completed' ? '100%' : '50%'
                          }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + idx * 0.1 }}
                          className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 sm:w-1 bg-gradient-to-b from-aqua-green-500 to-aqua-green-400 rounded-full"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: Content */}
                <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className={`rounded-xl p-3 sm:p-4 border transition-all ${colors.cardBg} ${colors.cardBorder} ${
                      phase.status === 'in-progress' 
                        ? 'shadow-md ring-1 ring-aqua-green-100' 
                        : phase.status === 'completed'
                        ? 'shadow-sm'
                        : 'shadow-sm hover:shadow-md hover:border-neutral-line-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm sm:text-base ${
                          phase.status === 'not-started' 
                            ? 'text-neutral-ink-400' 
                            : 'text-neutral-ink-900'
                        }`}>
                          {phase.title}
                        </h4>
                        {phase.date && (
                          <p className={`text-xs sm:text-sm mt-1 ${
                            phase.status === 'not-started'
                              ? 'text-neutral-ink-300'
                              : 'text-neutral-ink-500'
                          }`}>
                            {phase.date}
                          </p>
                        )}
                      </div>
                      
                      {/* Status Badge - Minimal Design with Aqua */}
                      <div className="flex-shrink-0">
                        {phase.status === 'completed' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.1, type: "spring" }}
                            className="flex items-center gap-1"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-aqua-green-600"></div>
                            <span className="text-[10px] sm:text-xs font-medium text-aqua-green-700">Completato</span>
                          </motion.div>
                        )}
                        {phase.status === 'in-progress' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.1, type: "spring" }}
                            className="flex items-center gap-1"
                          >
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="w-1.5 h-1.5 rounded-full bg-aqua-green-500"
                            ></motion.div>
                            <span className="text-[10px] sm:text-xs font-medium text-aqua-green-700">In Corso</span>
                          </motion.div>
                        )}
                        {phase.status === 'not-started' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.1, type: "spring" }}
                            className="flex items-center gap-1"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-line-300"></div>
                            <span className="text-[10px] sm:text-xs font-medium text-neutral-ink-400">Previsto</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to get default construction phases
export const getDefaultConstructionPhases = (t: (key: string) => string): ConstructionPhase[] => [
  {
    id: 'foundation',
    title: t('gettoPlatea') || 'Getto Platea',
    icon: HardHat,
    status: 'completed',
    date: 'Gen 15',
  },
  {
    id: 'structure',
    title: t('strutturaEdificio') || 'Struttura',
    icon: Building2,
    status: 'completed',
    date: 'Mar 22',
  },
  {
    id: 'facades',
    title: t('facciate') || 'Facciate',
    icon: Paintbrush,
    status: 'in-progress',
    date: 'Nov 10',
  },
  {
    id: 'systems',
    title: t('impianti') || 'Impianti',
    icon: Zap,
    status: 'not-started',
    date: 'Gen 15',
  },
  {
    id: 'finishes',
    title: t('finitureInterne') || 'Finiture',
    icon: Wrench,
    status: 'not-started',
    date: 'Dic 20',
  },
  {
    id: 'delivery',
    title: t('consegnaFinale') || 'Consegna',
    icon: Key,
    status: 'not-started',
    date: 'Feb 28',
  },
];
