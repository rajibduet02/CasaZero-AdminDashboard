import React from 'react';
import { Badge } from '../ui/badge';
import { Shield, UserCog, User } from 'lucide-react';

interface RoleBadgeProps {
  role: 'client' | 'admin';
  showIcon?: boolean;
}

export function RoleBadge({ role, showIcon = true }: RoleBadgeProps) {
  const getRoleConfig = () => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrator',
          icon: UserCog,
          className: 'bg-brand-sage-600 text-white',
        };
      default:
        return {
          label: 'Resident',
          icon: User,
          className: 'bg-info/10 text-info border-info/20',
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      {showIcon && <Icon className="w-3 h-3 mr-1.5" />}
      {config.label}
    </Badge>
  );
}
