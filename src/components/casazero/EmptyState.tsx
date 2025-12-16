import React from 'react';
import { FileX, AlertCircle, Wifi, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface EmptyStateProps {
  type: 'empty' | 'error' | 'offline' | 'success';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  imageUrl?: string;
}

export function EmptyState({ type, title, description, action, icon, imageUrl }: EmptyStateProps) {
  const defaultIcons = {
    empty: <FileX className="w-12 h-12 text-neutral-ink-500" />,
    error: <AlertCircle className="w-12 h-12 text-danger" />,
    offline: <Wifi className="w-12 h-12 text-neutral-ink-500" />,
    success: <CheckCircle className="w-12 h-12 text-success" />,
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {imageUrl ? (
        <div className="mb-6 w-48 h-48 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
          <ImageWithFallback 
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="mb-4 opacity-60">
          {icon || defaultIcons[type]}
        </div>
      )}
      <h3 className="mb-2 text-neutral-ink-900">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-ink-500 mb-6 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
}
