import React, { useState } from 'react';
import { DocumentCard, Document } from '../casazero/DocumentCard';
import { EmptyState } from '../casazero/EmptyState';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Filter, Upload, Plus, FileText, X, Paperclip } from 'lucide-react';
import { Button } from '../ui/button';
import { type Role, getPermissions } from '../../utils/permissions';
import { ScopeIndicator } from '../casazero/ScopeIndicator';
import { useLanguage } from '../../utils/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentsScreenProps {
  role: Role;
  onAskAI: () => void;
}

export function DocumentsScreen({ role, onAskAI }: DocumentsScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    type: '',
    description: '',
  });

  const getCategoryColors = (categoryId: string) => {
    switch (categoryId) {
      case 'mydocuments':
        return {
          bg: 'bg-brand-sage-500',
          text: 'text-white',
          shadow: 'shadow-brand-sage-500/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      case 'energy':
        return {
          bg: 'bg-green-500',
          text: 'text-white',
          shadow: 'shadow-green-500/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      case 'technical':
        return {
          bg: 'bg-purple-500',
          text: 'text-white',
          shadow: 'shadow-purple-500/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      case 'compliance':
        return {
          bg: 'bg-orange-500',
          text: 'text-white',
          shadow: 'shadow-orange-500/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      case 'ownership':
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          shadow: 'shadow-blue-500/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      case 'administrative':
        return {
          bg: 'bg-brand-sage-600',
          text: 'text-white',
          shadow: 'shadow-brand-sage-600/30',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
      default: // 'all'
        return {
          bg: 'bg-brand-sage-600',
          text: 'text-white',
          shadow: 'shadow-brand-sage-600/20',
          badgeBg: 'bg-white/20',
          badgeText: 'text-white'
        };
    }
  };

  const categories = [
    { id: 'all', label: t('allCategories') || 'All Categories', count: 41 },
    { id: 'mydocuments', label: t('myDocuments') || 'My Documents', count: 3 },
    { id: 'ownership', label: t('ownershipLegal') || 'Ownership & Legal', count: 5 },
    { id: 'technical', label: t('technicalBuilding') || 'Technical Building', count: 8 },
    { id: 'energy', label: t('energyEnvironmental') || 'Energy & Environmental', count: 10 },
    { id: 'compliance', label: t('complianceSafety') || 'Compliance & Safety', count: 7 },
    { id: 'administrative', label: t('administrativeMaintenance') || 'Administrative & Maintenance', count: 11 },
  ];

  const documentTypes = [
    { value: 'personal', label: t('personal') || 'Personal' },
    { value: 'invoices', label: t('invoices') || 'Invoices' },
    { value: 'guarantees', label: t('guarantees') || 'Guarantees' },
    { value: 'others', label: t('others') || 'Others' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocument.title) {
        setNewDocument({ ...newDocument, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleUploadDocument = () => {
    console.log('Uploading document:', newDocument, selectedFile);
    setIsUploadDialogOpen(false);
    setNewDocument({ title: '', type: '', description: '' });
    setSelectedFile(null);
  };

  const mockDocuments: Document[] = [
    {
      id: 'md1',
      title: 'Appliance Warranty - Dishwasher',
      type: 'PDF',
      category: 'My Documents',
      date: 'Nov 3, 2025',
      size: '1.1 MB',
      tags: ['Personal', 'Guarantees'],
    },
    {
      id: 'md2',
      title: 'Renovation Invoice - Kitchen',
      type: 'PDF',
      category: 'My Documents',
      date: 'Oct 20, 2025',
      size: '0.8 MB',
      tags: ['Personal', 'Invoices'],
    },
    {
      id: 'md3',
      title: 'Interior Design Plans',
      type: 'JPG',
      category: 'My Documents',
      date: 'Oct 5, 2025',
      size: '3.2 MB',
      tags: ['Personal', 'Others'],
    },
    {
      id: '1',
      title: 'Energy Performance Certificate 2025',
      type: 'PDF',
      category: 'Energy & Environmental',
      date: 'Oct 28, 2025',
      size: '2.4 MB',
      tags: ['Energy', 'Compliance'],
      status: 'New',
    },
    {
      id: '2',
      title: 'Building Technical Specifications',
      type: 'PDF',
      category: 'Technical Building',
      date: 'Sep 15, 2025',
      size: '5.8 MB',
      tags: ['Technical', 'Specifications'],
    },
    {
      id: '3',
      title: 'Property Deed - Unit 4B',
      type: 'PDF',
      category: 'Ownership & Legal',
      date: 'Aug 10, 2025',
      size: '1.2 MB',
      tags: ['Legal', 'Ownership'],
    },
    {
      id: '4',
      title: 'HVAC System Drawings',
      type: 'DWG',
      category: 'Technical Building',
      date: 'Jul 22, 2025',
      size: '12.5 MB',
      tags: ['Technical', 'HVAC'],
    },
    {
      id: '5',
      title: 'Fire Safety Compliance Report',
      type: 'PDF',
      category: 'Compliance & Safety',
      date: 'Jun 30, 2025',
      size: '3.1 MB',
      tags: ['Safety', 'Compliance'],
    },
  ];

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesCategory = activeCategory === 'all';
    if (activeCategory === 'mydocuments') {
      matchesCategory = doc.category === 'My Documents';
    } else if (activeCategory !== 'all') {
      matchesCategory = doc.category.toLowerCase().includes(activeCategory);
    }
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-20 bg-white min-h-screen relative">
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsUploadDialogOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: '#4CAF47' }}
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addDocument') || 'Add Document'}</DialogTitle>
            <DialogDescription>
              {t('uploadDocumentDesc') || 'Upload a personal document to your collection'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">{t('file') || 'File'}</Label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-neutral-line-300 rounded-xl hover:border-brand-sage-400 transition-colors cursor-pointer bg-surface-warm-50/50"
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
                        {t('clickToUpload') || 'Click to upload file'}
                      </span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-neutral-ink-500">
                {t('supportedFormats') || 'Supported formats: PDF, DOC, DOCX, JPG, PNG'}
              </p>
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="doc-type">{t('documentType') || 'Document Type'}</Label>
              <Select
                value={newDocument.type}
                onValueChange={(value) => setNewDocument({ ...newDocument, type: value })}
              >
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder={t('selectType') || 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="doc-title">{t('title') || 'Title'} ({t('optional') || 'Optional'})</Label>
              <Input
                id="doc-title"
                placeholder={t('documentTitlePlaceholder') || 'Enter document title'}
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="doc-description">{t('description') || 'Description'} ({t('optional') || 'Optional'})</Label>
              <Textarea
                id="doc-description"
                placeholder={t('documentDescPlaceholder') || 'Add notes or description'}
                rows={3}
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleUploadDocument}
              disabled={!selectedFile || !newDocument.type}
              style={{ backgroundColor: !selectedFile || !newDocument.type ? undefined : '#6A8F7B' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('upload') || 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Bar */}
      <div className="sticky top-14 bg-surface-warm-50/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4 z-30">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-ink-400" />
            <Input
              type="search"
              placeholder={t('searchDocuments') || 'Search documents...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 bg-white border-0 shadow-sm shadow-black/5 h-11 rounded-xl"
            />
            <Button size="sm" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 h-8">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-6 space-y-5 max-w-md mx-auto">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {categories.map((category) => {
            const colors = getCategoryColors(category.id);
            const isActive = activeCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full border-0 transition-all duration-300 shadow-sm ${
                  isActive
                    ? `${colors.bg} ${colors.text} ${colors.shadow}`
                    : 'bg-white text-neutral-ink-700 shadow-black/5 hover:shadow-md'
                }`}
              >
                <span className="text-sm whitespace-nowrap">
                  {category.label}
                  <Badge
                    variant="secondary"
                    className={`ml-2 border-0 ${
                      isActive
                        ? `${colors.badgeBg} ${colors.badgeText}`
                        : 'bg-surface-warm-100 text-neutral-ink-600'
                    }`}
                  >
                    {category.count}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>

        {/* Admin/Super-Admin Scope Indicator */}
        {(role === 'admin' || role === 'super-admin') && (
          <ScopeIndicator 
            role={role} 
            scope={role === 'super-admin' ? 'global' : 'building'}
            message={permissions.canUploadDocuments ? (role === 'super-admin' ? 'Managing documents across all buildings' : 'Managing documents for your building') : undefined}
          />
        )}

        {/* Documents List */}
        {filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => console.log('View', doc.id)}
                onDownload={() => console.log('Download', doc.id)}
                onShare={permissions.canShareDocuments ? () => console.log('Share', doc.id) : undefined}
                onDelete={permissions.canDeleteDocuments ? () => console.log('Delete', doc.id) : undefined}
                onAskAI={onAskAI}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            type="empty"
            title={searchQuery ? t('noDocumentsFound') || 'No documents found' : t('noDocumentsYet') || 'No documents yet'}
            description={
              searchQuery
                ? t('tryAdjustingSearch') || 'Try adjusting your search terms'
                : t('adminWillUpload') || 'Your administrator will upload documents here'
            }
          />
        )}
      </div>
    </div>
  );
}
