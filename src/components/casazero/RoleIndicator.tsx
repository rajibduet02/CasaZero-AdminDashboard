import React from 'react';
import { Badge } from '../ui/badge';
import { Shield, Info } from 'lucide-react';
import { type Role, getRoleLabel } from '../../utils/permissions';

interface RoleIndicatorProps {
  role: Role;
  showDetails?: boolean;
}

export function RoleIndicator({ role, showDetails = false }: RoleIndicatorProps) {
  const getRoleColor = () => {
    switch (role) {
      case 'client':
        return 'bg-info/10 border-info/20 text-info';
      case 'admin':
        return 'bg-brand-sage-600/10 border-brand-sage-600/20 text-brand-sage-900';
      default:
        return 'bg-neutral-ink-500/10 border-neutral-ink-500/20 text-neutral-ink-700';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'client':
        return 'You have access to your documents, maintenance tasks, and support tickets.';
      case 'admin':
        return 'You can manage building residents, assign tasks, and access analytics across all buildings.';
      default:
        return '';
    }
  };

  if (!showDetails) {
    return (
      <Badge className={`${getRoleColor()} border`}>
        <Shield className="w-3 h-3 mr-1" />
        {getRoleLabel(role)}
      </Badge>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${getRoleColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-current/10 flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{getRoleLabel(role)}</span>
          </div>
          <p className="text-xs opacity-80">
            {getRoleDescription()}
          </p>
        </div>
      </div>
    </div>
  );
}
