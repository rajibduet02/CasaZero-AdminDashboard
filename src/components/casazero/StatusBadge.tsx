import React from 'react';
import { Badge } from '../ui/badge';

export type Priority = 'N1' | 'N2' | 'N3';
export type Status = 'pending' | 'overdue' | 'in-progress' | 'completed' | 'resolved';

interface StatusBadgeProps {
  type: 'priority' | 'status' | 'role' | 'category';
  value: Priority | Status | string;
  className?: string;
}

export function StatusBadge({ type, value, className = '' }: StatusBadgeProps) {
  const getStyles = () => {
    if (type === 'priority') {
      switch (value) {
        case 'N1':
          return 'bg-info/10 text-info border-info/20';
        case 'N2':
          return 'bg-warning/10 text-warning border-warning/20';
        case 'N3':
          return 'bg-brand-sage-300/30 text-brand-sage-600 border-brand-sage-300';
        default:
          return 'bg-muted text-muted-foreground';
      }
    }
    
    if (type === 'status') {
      switch (value) {
        case 'pending':
          return 'bg-neutral-line-200 text-neutral-ink-700 border-neutral-line-200';
        case 'overdue':
          return 'bg-danger/10 text-danger border-danger/20';
        case 'in-progress':
          return 'bg-info/10 text-info border-info/20';
        case 'completed':
        case 'resolved':
          return 'bg-success/10 text-success border-success/20';
        default:
          return 'bg-muted text-muted-foreground';
      }
    }
    
    if (type === 'role') {
      switch (value.toLowerCase()) {
        case 'admin':
        case 'administrator':
          return 'bg-brand-sage-600 text-white border-brand-sage-600';
        case 'super admin':
        case 'owner':
          return 'bg-neutral-ink-900 text-white border-neutral-ink-900';
        default:
          return 'bg-primary/10 text-primary border-primary/20';
      }
    }
    
    return 'bg-muted text-muted-foreground';
  };

  const getLabel = () => {
    if (type === 'priority') return value;
    if (type === 'status') {
      switch (value) {
        case 'pending': return 'Pending';
        case 'overdue': return 'Overdue';
        case 'in-progress': return 'In Progress';
        case 'completed': return 'Completed';
        case 'resolved': return 'Resolved';
        default: return value;
      }
    }
    return value;
  };

  return (
    <Badge variant="outline" className={`${getStyles()} ${className}`}>
      {getLabel()}
    </Badge>
  );
}
