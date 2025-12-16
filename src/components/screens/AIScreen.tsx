import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Sparkles, FileText, Wrench, Zap, HelpCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useLanguage } from '../../utils/LanguageContext';
import aiChatIcon from 'figma:asset/88b68ee504f343bdee6862cbaaa850243d8833f6.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  category: string;
}

const messageVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const promptVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      type: "spring",
      stiffness: 100
    }
  }),
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.5,
      type: "spring",
      stiffness: 100
    }
  }),
  hover: {
    y: -4,
    transition: { duration: 0.2 }
  }
};

export function AIScreen() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('aiGreeting') || 'Ciao! Come posso aiutarti oggi?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAssistance, setShowAssistance] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestedPrompts = [
    {
      icon: FileText,
      text: t('documentLocation') || 'Dove posso trovare il mio contratto?',
      category: 'Documenti',
    },
    {
      icon: Wrench,
      text: t('maintenanceSchedule') || 'Quando è prevista la prossima manutenzione?',
      category: 'Manutenzione',
    },
    {
      icon: Zap,
      text: t('energyUsage') || 'Come posso ridurre il mio consumo energetico?',
      category: 'Energia',
    },
    {
      icon: FileText,
      text: 'Quali documenti servono per le tasse?',
      category: 'Documenti',
    },
  ];

  const recentTickets: Ticket[] = [
    {
      id: 'T-001',
      subject: 'Rumore eccessivo dall\'unità superiore',
      status: 'in-progress',
      date: '2 Nov 2025',
      category: 'Disturbo',
    },
    {
      id: 'T-002',
      subject: 'Perdita d\'acqua nel bagno',
      status: 'resolved',
      date: '28 Ott 2025',
      category: 'Idraulica',
    },
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowAssistance(false);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Capisco che stai chiedendo informazioni su ' + input + '. In base ai dati della tua residenza, posso aiutarti. Questa è una risposta demo che mostra come CasaZero AI fornirebbe informazioni contestuali sulla tua casa, documenti e necessità di manutenzione.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-56px-64px)] max-w-md mx-auto bg-white">
      {/* Premium Header with Cube Icon */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden flex-shrink-0 bg-white"
      >

        <div className="relative px-6 py-6 text-neutral-ink-900">
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              animate={{ 
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 flex items-center justify-center flex-shrink-0"
            >
              <img src={aiChatIcon} alt="CasaZero AI" className="w-16 h-16 drop-shadow-2xl" />
            </motion.div>
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="tracking-tight text-neutral-ink-900"
                style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}
              >
                CasaZero AI
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-neutral-ink-600"
              >
                Il tuo assistente intelligente
              </motion.p>
            </div>
          </div>

          {/* Info Alert */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Alert className="bg-white/70 backdrop-blur-sm border-brand-sage-200/50 shadow-sm">
              <AlertDescription className="text-xs text-neutral-ink-700 leading-relaxed">
                Le risposte AI sono generate in base ai dati della tua residenza. Per decisioni critiche, verifica con documenti ufficiali.
              </AlertDescription>
            </Alert>
          </motion.div>
        </div>
      </motion.div>

      {/* Messages - takes up remaining space and scrolls */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-4">
          <div className="space-y-4 pb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  layout
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-brand-sage-600 to-brand-sage-500 text-white'
                        : 'bg-white/90 backdrop-blur-sm border border-neutral-line-200/50 text-neutral-ink-900'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <img src={aiChatIcon} alt="AI" className="w-4 h-4" />
                        <span className="text-xs text-brand-sage-600 font-medium">CasaZero AI</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-white/70' : 'text-neutral-ink-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-white/90 backdrop-blur-sm border border-neutral-line-200/50 shadow-md">
                  <div className="flex items-center gap-3">
                    <motion.img 
                      src={aiChatIcon}
                      alt="AI"
                      className="w-4 h-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="text-sm text-neutral-ink-500">{t('thinking') || 'Sto pensando...'}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Assistenza Section - Shows when no chat started */}
            {showAssistance && messages.length === 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-6 pt-2"
              >
                {/* Assistenza (Support/Tickets) Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-sage-100 to-brand-sage-50 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-brand-sage-600" />
                    </div>
                    <h3 className="font-medium text-neutral-ink-800">Assistenza</h3>
                  </div>

                  {/* New Ticket Button */}
                  <motion.button
                    variants={cardVariants}
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                    className="w-full mb-3 p-4 rounded-2xl bg-gradient-to-br from-brand-sage-500 to-accent-lime-500 text-white shadow-lg hover:shadow-xl transition-shadow text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Nuova Richiesta di Assistenza</p>
                        <p className="text-xs opacity-90">Apri un ticket di supporto</p>
                      </div>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>

                  {/* Recent Tickets */}
                  {recentTickets.length > 0 && (
                    <>
                      <p className="text-xs text-neutral-ink-500 mb-3 font-medium">Ticket Recenti</p>
                      <div className="space-y-2">
                        {recentTickets.map((ticket, idx) => (
                          <motion.div
                            key={ticket.id}
                            variants={cardVariants}
                            custom={idx + 1}
                            initial="hidden"
                            animate="visible"
                            whileHover="hover"
                            className="p-3.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-line-200/50 hover:border-brand-sage-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-ink-900 truncate">{ticket.subject}</p>
                                <p className="text-xs text-neutral-ink-500 mt-0.5">{ticket.id}</p>
                              </div>
                              <Badge className={`text-xs flex-shrink-0 ${getStatusColor(ticket.status)}`}>
                                {ticket.status === 'open' ? 'Aperto' : ticket.status === 'in-progress' ? 'In Corso' : 'Risolto'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-ink-500">
                              <Clock className="w-3 h-3" />
                              <span>{ticket.date}</span>
                              <span>•</span>
                              <span>{ticket.category}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Suggested Prompts */}
                <div>
                  <p className="text-xs text-neutral-ink-500 mb-4 font-medium">{t('examplePrompts') || 'Esempi di Domande'}:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {suggestedPrompts.map((prompt, idx) => {
                      const Icon = prompt.icon;
                      return (
                        <motion.button
                          key={idx}
                          custom={idx + 3}
                          variants={promptVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handlePromptClick(prompt.text)}
                          className="flex items-start gap-3 p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-neutral-line-200/50 hover:border-brand-sage-400 hover:shadow-lg transition-all text-left group"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-sage-100 to-brand-sage-50 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                            <Icon className="w-5 h-5 text-brand-sage-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-ink-900 leading-relaxed group-hover:text-brand-sage-600 transition-colors">{prompt.text}</p>
                            <Badge variant="secondary" className="mt-2 text-xs bg-brand-sage-50 text-brand-sage-600 border-brand-sage-200">
                              {prompt.category}
                            </Badge>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Invisible div for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Premium Input - always at bottom */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="border-t border-neutral-line-200/50 bg-white/95 backdrop-blur-xl px-4 py-4 flex-shrink-0 shadow-lg"
      >
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('askAnything') || 'Chiedimi qualsiasi cosa sulla tua casa...'}
            className="flex-1 bg-surface-warm-50/50 border-b-brand-sage-400 focus-visible:bg-white"
            disabled={loading}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 shadow-lg hover:shadow-xl"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
