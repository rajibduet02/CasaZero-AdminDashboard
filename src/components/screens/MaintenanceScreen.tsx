import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Calendar, 
  Paperclip, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  X,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Upload
} from 'lucide-react';
import { useLanguage } from '../../utils/LanguageContext';
import { EmptyState } from '../casazero/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type MaintenancePriority = 'Facoltative' | 'Obbligatorie' | 'Condominiali' | 'Personal';
export type MaintenanceStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export interface MaintenanceTask {
  id: string;
  title: string;
  category: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  frequency: string;
  nextDue?: string;
  attachments?: Array<{ name: string; type: string; url: string }>;
  contacts?: Array<{ name: string; role: string; phone?: string; email?: string }>;
  lastCompleted?: string;
}

interface MaintenanceScreenProps {
  role: 'client' | 'admin' | 'super-admin';
  onAskAI: () => void;
}

const priorityColors = {
  'Facoltative': {
    bg: '#CFE2D7',
    text: '#2D5F3F',
    border: '#A8C9B5',
  },
  'Obbligatorie': {
    bg: '#FFE6B3',
    text: '#8B5E00',
    border: '#F4D399',
  },
  'Condominiali': {
    bg: '#D7E2EA',
    text: '#2C5F7F',
    border: '#B5CFE0',
  },
  'Personal': {
    bg: '#E8F5E9',
    text: '#6A8F7B',
    border: '#6A8F7B',
  },
};

const statusColors = {
  'pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'completed': 'bg-green-100 text-green-700 border-green-200',
  'overdue': 'bg-red-100 text-red-700 border-red-200',
};

export function MaintenanceScreen({ role, onAskAI }: MaintenanceScreenProps) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    frequency: '',
    notes: '',
  });

  const filters = [
    { id: 'all', label: t('tutte'), count: 14 },
    { id: 'personal', label: t('personal') || 'Personal', count: 2 },
    { id: 'facoltative', label: t('facoltative'), count: 3 },
    { id: 'obbligatorie', label: t('obbligatorie'), count: 5 },
    { id: 'condominiali', label: t('condominiali'), count: 4 },
    { id: 'pending', label: t('pending'), count: 6 },
    { id: 'overdue', label: t('scadute'), count: 2 },
  ];

  const maintenanceCategories = [
    { value: 'appliances', label: t('appliances') || 'Appliances' },
    { value: 'hvac', label: t('hvac') || 'HVAC' },
    { value: 'plumbing', label: t('plumbing') || 'Plumbing' },
    { value: 'electrical', label: t('electrical') || 'Electrical' },
    { value: 'cleaning', label: t('cleaning') || 'Cleaning' },
    { value: 'other', label: t('others') || 'Other' },
  ];

  const frequencyOptions = [
    { value: 'weekly', label: t('weekly') || 'Weekly' },
    { value: 'monthly', label: t('monthly') || 'Monthly' },
    { value: 'quarterly', label: t('quarterly') || 'Quarterly' },
    { value: 'biannually', label: t('biannually') || 'Every 6 months' },
    { value: 'annually', label: t('annually') || 'Annually' },
    { value: 'custom', label: t('custom') || 'Custom' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCreateTask = () => {
    console.log('Creating maintenance task:', newTask, selectedFile);
    setIsCreateDialogOpen(false);
    setNewTask({ title: '', category: '', frequency: '', notes: '' });
    setSelectedFile(null);
  };

  const mockTasks: MaintenanceTask[] = [
    {
      id: 'p1',
      title: 'Filter Replacement - Kitchen Hood',
      category: 'Appliances',
      description: 'Replace grease filters in kitchen ventilation hood for optimal performance.',
      priority: 'Personal',
      status: 'pending',
      frequency: 'Every 3 months',
      nextDue: '10 Nov 2025',
      lastCompleted: '10 Aug 2025',
    },
    {
      id: 'p2',
      title: 'Fridge Coil Cleaning',
      category: 'Appliances',
      description: 'Clean refrigerator coils to improve efficiency and reduce energy consumption.',
      priority: 'Personal',
      status: 'in-progress',
      frequency: 'Every 6 months',
      nextDue: '5 Dec 2025',
      attachments: [
        { name: 'cleaning_guide.pdf', type: 'PDF', url: '#' },
      ],
    },
    {
      id: '1',
      title: 'Ispezione Annuale Sistema HVAC',
      category: 'Climatizzazione',
      description: 'Ispezione annuale e sostituzione dei filtri per il sistema di riscaldamento, ventilazione e climatizzazione. Richiesto per la conformità alla garanzia e per garantire l\'efficienza energetica ottimale.',
      priority: 'Obbligatorie',
      status: 'overdue',
      frequency: 'Annualmente',
      nextDue: '30 Ott 2025',
      lastCompleted: '28 Ott 2024',
      attachments: [
        { name: 'Certificato_Ispezione_2024.pdf', type: 'PDF', url: '#' },
        { name: 'Manuale_HVAC.pdf', type: 'PDF', url: '#' },
      ],
      contacts: [
        { name: 'TechClima Services', role: 'Specialista HVAC', phone: '+39 02 1234 5678', email: 'info@techclima.it' },
      ],
    },
    {
      id: '2',
      title: 'Controllo Pressione Caldaia',
      category: 'Riscaldamento',
      description: 'Controllo di routine della pressione e ottimizzazione del sistema. Raccomandato per prestazioni ottimali ed efficienza energetica.',
      priority: 'Facoltative',
      status: 'pending',
      frequency: 'Ogni 6 mesi',
      nextDue: '15 Nov 2025',
      lastCompleted: '10 Mag 2025',
    },
    {
      id: '3',
      title: 'Ispezione Sicurezza Ascensore',
      category: 'Sistemi Edificio',
      description: 'Ispezione di sicurezza obbligatoria secondo le normative edilizie. Gestito dall\'amministratore condominiale.',
      priority: 'Condominiali',
      status: 'in-progress',
      frequency: 'Annualmente',
      nextDue: '8 Nov 2025',
      attachments: [
        { name: 'Certificato_Sicurezza.pdf', type: 'PDF', url: '#' },
      ],
      contacts: [
        { name: 'SafeLift Italia', role: 'Ispettore Certificato', phone: '+39 02 9876 5432' },
      ],
    },
    {
      id: '4',
      title: 'Sostituzione Batterie Rilevatori di Fumo',
      category: 'Sicurezza',
      description: 'Sostituire le batterie in tutti i rilevatori di fumo per garantire il corretto funzionamento. Requisito di sicurezza critico.',
      priority: 'Obbligatorie',
      status: 'pending',
      frequency: 'Ogni 12 mesi',
      nextDue: '20 Nov 2025',
      lastCompleted: '18 Nov 2024',
    },
    {
      id: '5',
      title: 'Manutenzione Scaldabagno',
      category: 'Idraulica',
      description: 'Decalcificazione e controllo dell\'efficienza. Aiuta a prevenire guasti e prolunga la vita dell\'apparecchiatura.',
      priority: 'Facoltative',
      status: 'pending',
      frequency: 'Ogni 18 mesi',
      nextDue: '1 Dic 2025',
      lastCompleted: '1 Giu 2024',
    },
    {
      id: '6',
      title: 'Ispezione Guarnizioni Finestre',
      category: 'Involucro Edificio',
      description: 'Controllare e mantenere le guarnizioni delle finestre per l\'efficienza energetica. Raccomandato prima della stagione invernale.',
      priority: 'Facoltative',
      status: 'pending',
      frequency: 'Annualmente',
      nextDue: '5 Nov 2025',
    },
    {
      id: '7',
      title: 'Controllo Estintori',
      category: 'Sicurezza',
      description: 'Ispezione annuale obbligatoria di tutte le attrezzature antincendio.',
      priority: 'Obbligatorie',
      status: 'pending',
      frequency: 'Annualmente',
      nextDue: '12 Nov 2025',
      lastCompleted: '10 Nov 2024',
      contacts: [
        { name: 'FireSafe Solutions', role: 'Ispettore Sicurezza' },
      ],
    },
    {
      id: '8',
      title: 'Aggiornamento Illuminazione Aree Comuni',
      category: 'Sistemi Edificio',
      description: 'Progetto di aggiornamento LED per corridoi e spazi comuni dell\'edificio. Gestito dall\'amministratore.',
      priority: 'Condominiali',
      status: 'pending',
      frequency: 'Progetto una tantum',
      nextDue: '25 Nov 2025',
    },
  ];

  const filteredTasks = mockTasks.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'personal') return task.priority === 'Personal';
    if (activeFilter === 'facoltative') return task.priority === 'Facoltative';
    if (activeFilter === 'obbligatorie') return task.priority === 'Obbligatorie';
    if (activeFilter === 'condominiali') return task.priority === 'Condominiali';
    if (activeFilter === 'pending') return task.status === 'pending';
    if (activeFilter === 'overdue') return task.status === 'overdue';
    return true;
  });

  const toggleExpanded = (taskId: string) => {
    setExpandedCard(expandedCard === taskId ? null : taskId);
  };

  const getPriorityStyle = (priority: MaintenancePriority) => {
    const colors = priorityColors[priority];
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border,
    };
  };

  const getStatusLabel = (status: MaintenanceStatus) => {
    switch (status) {
      case 'pending': return t('pending');
      case 'in-progress': return t('inProgress');
      case 'completed': return t('completed');
      case 'overdue': return t('overdue');
      default: return status;
    }
  };

  return (
    <div className="pb-20 bg-white min-h-screen relative">
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCreateDialogOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: '#4CAF47' }}
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Create Maintenance Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addMaintenance') || 'Add Maintenance Task'}</DialogTitle>
            <DialogDescription>
              {t('createPersonalMaintenanceDesc') || 'Create a personal maintenance task to track'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">{t('title') || 'Title'}</Label>
              <Input
                id="task-title"
                placeholder={t('maintenanceTaskPlaceholder') || 'e.g., Filter replacement'}
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="task-category">{t('category') || 'Category'}</Label>
              <Select
                value={newTask.category}
                onValueChange={(value) => setNewTask({ ...newTask, category: value })}
              >
                <SelectTrigger id="task-category">
                  <SelectValue placeholder={t('selectCategory') || 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="task-frequency">{t('frequency') || 'Frequency'}</Label>
              <Select
                value={newTask.frequency}
                onValueChange={(value) => setNewTask({ ...newTask, frequency: value })}
              >
                <SelectTrigger id="task-frequency">
                  <SelectValue placeholder={t('selectFrequency') || 'Select frequency'} />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="task-notes">{t('notes') || 'Notes'} ({t('optional') || 'Optional'})</Label>
              <Textarea
                id="task-notes"
                placeholder={t('maintenanceNotesPlaceholder') || 'Add any additional details...'}
                rows={3}
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="task-file">{t('attachment') || 'Attachment'} ({t('optional') || 'Optional'})</Label>
              <div className="relative">
                <input
                  id="task-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="task-file"
                  className="flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-neutral-line-300 rounded-xl hover:border-brand-sage-400 transition-colors cursor-pointer bg-surface-warm-50/50"
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-5 h-5" style={{ color: '#6A8F7B' }} />
                      <div className="text-left">
                        <p className="text-sm text-neutral-ink-900">{selectedFile.name}</p>
                        <p className="text-xs text-neutral-ink-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                        }}
                        className="ml-auto p-1 hover:bg-neutral-line-200 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-neutral-ink-400" />
                      <span className="text-sm text-neutral-ink-600">
                        {t('attachFile') || 'Attach file or photo'}
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!newTask.title || !newTask.category || !newTask.frequency}
              style={{ 
                backgroundColor: !newTask.title || !newTask.category || !newTask.frequency ? undefined : '#6A8F7B' 
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Pills */}
      <div className="sticky top-14 bg-white/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4 z-30 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all ${
                  activeFilter === filter.id
                    ? 'bg-brand-sage-600 text-white border-brand-sage-600 shadow-md'
                    : 'bg-surface-white text-neutral-ink-700 border-neutral-line-200 hover:border-brand-sage-300 hover:shadow-sm'
                }`}
              >
                <span className="text-sm whitespace-nowrap">
                  {filter.label}
                  <Badge
                    variant="secondary"
                    className={`ml-2 ${
                      activeFilter === filter.id
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-line-200 text-neutral-ink-700'
                    }`}
                  >
                    {filter.count}
                  </Badge>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        {filteredTasks.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => {
              const isExpanded = expandedCard === task.id;
              const isOverdue = task.status === 'overdue';

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                      isOverdue ? 'ring-2 ring-red-300/50' : ''
                    }`}
                    onClick={() => toggleExpanded(task.id)}
                  >
                    {/* Compact Card View */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge 
                            className="text-xs border"
                            style={getPriorityStyle(task.priority)}
                          >
                            {task.priority}
                          </Badge>
                          <Badge className={`text-xs border ${statusColors[task.status]}`}>
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex-shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-neutral-ink-500" /> : <ChevronDown className="w-5 h-5 text-neutral-ink-500" />}
                        </motion.div>
                      </div>

                      <h3 className="font-semibold text-neutral-ink-900 mb-1">{task.title}</h3>
                      
                      <div className="flex items-center gap-2 text-xs text-neutral-ink-500 mb-3">
                        <Badge variant="secondary" className="bg-surface-warm-100 text-neutral-ink-600">
                          {task.category}
                        </Badge>
                        <span>•</span>
                        <span>{task.frequency}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-neutral-ink-500">
                        {task.nextDue && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {t('scadenza')}: {task.nextDue}
                            </span>
                          </div>
                        )}
                        {task.lastCompleted && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{t('ultima')}: {task.lastCompleted}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          
                          <div className="p-4 space-y-4 bg-surface-warm-50/30">
                            {/* Full Description */}
                            <div>
                              <p className="text-xs font-medium text-neutral-ink-500 mb-2">{t('descrizioneCompleta')}</p>
                              <p className="text-sm text-neutral-ink-700 leading-relaxed">{task.description}</p>
                            </div>

                            {/* Attachments */}
                            {task.attachments && task.attachments.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-neutral-ink-500 mb-2">{t('allegati')}</p>
                                <div className="space-y-2">
                                  {task.attachments.map((file, idx) => (
                                    <motion.div
                                      key={idx}
                                      whileHover={{ x: 4 }}
                                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-neutral-line-200/50 hover:border-brand-sage-300 hover:shadow-sm transition-all cursor-pointer"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-sage-100 to-brand-sage-50 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-brand-sage-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-neutral-ink-900 truncate">{file.name}</p>
                                        <p className="text-xs text-neutral-ink-500">{file.type}</p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contacts */}
                            {task.contacts && task.contacts.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-neutral-ink-500 mb-2">{t('contatti')}</p>
                                <div className="space-y-2">
                                  {task.contacts.map((contact, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-xl bg-white border border-neutral-line-200/50"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-neutral-ink-900">{contact.name}</p>
                                          <p className="text-xs text-neutral-ink-500 mb-2">{contact.role}</p>
                                          {contact.phone && (
                                            <a 
                                              href={`tel:${contact.phone}`}
                                              className="flex items-center gap-1.5 text-xs text-brand-sage-600 hover:text-brand-sage-700"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Phone className="w-3.5 h-3.5" />
                                              {contact.phone}
                                            </a>
                                          )}
                                          {contact.email && (
                                            <a 
                                              href={`mailto:${contact.email}`}
                                              className="flex items-center gap-1.5 text-xs text-brand-sage-600 hover:text-brand-sage-700 mt-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MessageSquare className="w-3.5 h-3.5" />
                                              {contact.email}
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Mark complete', task.id);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                {t('segnaCompletato')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Schedule visit', task.id);
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-1.5" />
                                {t('programma')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAskAI();
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-1.5" />
                                {t('chiediAI')}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <EmptyState
            type="empty"
            title={t('noMaintenance')}
            description={t('noMaintenanceDesc')}
          />
        )}
      </div>
    </div>
  );
}
