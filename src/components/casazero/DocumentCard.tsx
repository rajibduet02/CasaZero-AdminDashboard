import React from 'react';
import { Badge } from '../ui/badge';
import { FileText, Download, Share2, MessageSquare, File, FileImage, FileCode } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';

export interface Document {
  id: string;
  title: string;
  type: string; // PDF, DWG, etc.
  category: string;
  date: string;
  size: string;
  tags?: string[];
  status?: string;
}

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onAskAI?: () => void;
}

export function DocumentCard({
  document,
  onView,
  onDownload,
  onShare,
  onAskAI,
}: DocumentCardProps) {
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-danger" />;
      case 'dwg':
      case 'cad':
        return <FileCode className="w-5 h-5 text-brand-sage-600" />;
      case 'jpg':
      case 'png':
      case 'jpeg':
        return <FileImage className="w-5 h-5 text-info" />;
      default:
        return <File className="w-5 h-5 text-neutral-ink-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('energy') || categoryLower.includes('environmental')) {
      return {
        border: 'bg-gradient-to-b from-green-500 via-green-500 to-green-400',
        shadow: 'shadow-[0_2px_8px_-2px_rgba(34,197,94,0.08),0_4px_16px_-4px_rgba(34,197,94,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(34,197,94,0.16),0_12px_32px_-8px_rgba(34,197,94,0.12)]',
        glow: 'bg-gradient-to-r from-green-500/5 to-transparent',
        iconBg: 'bg-gradient-to-br from-green-100 via-green-50 to-white shadow-lg shadow-green-500/20',
        iconGlow: 'bg-green-500/30'
      };
    } else if (categoryLower.includes('technical')) {
      return {
        border: 'bg-gradient-to-b from-purple-500 via-purple-500 to-purple-400',
        shadow: 'shadow-[0_2px_8px_-2px_rgba(168,85,247,0.08),0_4px_16px_-4px_rgba(168,85,247,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(168,85,247,0.16),0_12px_32px_-8px_rgba(168,85,247,0.12)]',
        glow: 'bg-gradient-to-r from-purple-500/5 to-transparent',
        iconBg: 'bg-gradient-to-br from-purple-100 via-purple-50 to-white shadow-lg shadow-purple-500/20',
        iconGlow: 'bg-purple-500/30'
      };
    } else if (categoryLower.includes('compliance') || categoryLower.includes('safety')) {
      return {
        border: 'bg-gradient-to-b from-orange-500 via-orange-500 to-orange-400',
        shadow: 'shadow-[0_2px_8px_-2px_rgba(249,115,22,0.08),0_4px_16px_-4px_rgba(249,115,22,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.16),0_12px_32px_-8px_rgba(249,115,22,0.12)]',
        glow: 'bg-gradient-to-r from-orange-500/5 to-transparent',
        iconBg: 'bg-gradient-to-br from-orange-100 via-orange-50 to-white shadow-lg shadow-orange-500/20',
        iconGlow: 'bg-orange-500/30'
      };
    } else if (categoryLower.includes('ownership') || categoryLower.includes('legal')) {
      return {
        border: 'bg-gradient-to-b from-blue-500 via-blue-500 to-blue-400',
        shadow: 'shadow-[0_2px_8px_-2px_rgba(59,130,246,0.08),0_4px_16px_-4px_rgba(59,130,246,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(59,130,246,0.16),0_12px_32px_-8px_rgba(59,130,246,0.12)]',
        glow: 'bg-gradient-to-r from-blue-500/5 to-transparent',
        iconBg: 'bg-gradient-to-br from-blue-100 via-blue-50 to-white shadow-lg shadow-blue-500/20',
        iconGlow: 'bg-blue-500/30'
      };
    } else {
      return {
        border: 'bg-gradient-to-b from-brand-sage-500 via-brand-sage-500 to-brand-sage-400',
        shadow: 'shadow-[0_2px_8px_-2px_rgba(76,175,71,0.08),0_4px_16px_-4px_rgba(76,175,71,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(76,175,71,0.16),0_12px_32px_-8px_rgba(76,175,71,0.12)]',
        glow: 'bg-gradient-to-r from-brand-sage-500/5 to-transparent',
        iconBg: 'bg-gradient-to-br from-brand-sage-100 via-brand-sage-50 to-white shadow-lg shadow-brand-sage-500/20',
        iconGlow: 'bg-brand-sage-500/30'
      };
    }
  };

  const colors = getCategoryColor(document.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onView}
      className={`relative bg-white/95 backdrop-blur-sm rounded-2xl border border-neutral-line-100/50 cursor-pointer group overflow-hidden transition-all duration-300 ${colors.shadow}`}
    >
      {/* Premium Colored Accent Border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.border}`}></div>
      
      {/* Subtle Glow Effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colors.glow}`}></div>
      
      <div className="relative p-3.5 pl-4">
        <div className="flex gap-3.5 items-start">
          {/* Premium Icon Container */}
          <motion.div 
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            className={`relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm ${colors.iconBg}`}
          >
            {/* Icon Glow */}
            <div className={`absolute inset-0 rounded-xl blur-md opacity-50 ${colors.iconGlow}`}></div>
            
            <div className="relative z-10">
              {getFileIcon(document.type)}
            </div>
          </motion.div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-neutral-ink-800 group-hover:text-brand-sage-600 transition-colors leading-tight">
                {document.title}
              </h4>
              {document.status && (
                <Badge className="bg-brand-sage-600 text-white shadow-sm flex-shrink-0">
                  {document.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-neutral-ink-500 mb-1.5 line-clamp-1 leading-relaxed">
              {document.category}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-ink-400 font-medium uppercase tracking-wide">{document.type}</span>
              <div className="flex-shrink-0 w-1 h-1 rounded-full bg-neutral-ink-300"></div>
              <span className="text-xs text-neutral-ink-400 font-medium">{document.date}</span>
              <div className="flex-shrink-0 w-1 h-1 rounded-full bg-neutral-ink-300"></div>
              <span className="text-xs text-neutral-ink-400 font-medium">{document.size}</span>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {document.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs px-2.5 py-0.5 bg-surface-warm-100 text-neutral-ink-600">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            {(onDownload || onShare || onAskAI) && (
              <div className="flex gap-1 mt-2">
                {onDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onDownload(); }}
                    className="h-8 px-3 hover:bg-brand-sage-50"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {onShare && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="h-8 px-3 hover:bg-brand-sage-50"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
                {onAskAI && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onAskAI(); }}
                    className="h-8 px-3 hover:bg-brand-sage-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
