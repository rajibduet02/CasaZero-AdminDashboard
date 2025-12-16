import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, Building, Eye } from 'lucide-react';
import { type Role } from '../../utils/permissions';

interface ScopeIndicatorProps {
  role: Role;
  scope: 'residence' | 'building' | 'global';
  message?: string;
}

export function ScopeIndicator({ role, scope, message }: ScopeIndicatorProps) {
  if (role === 'client') {
    return null; // Residents don't need scope indicators
  }

  if (role === 'admin' && scope === 'building') {
    return (
      <Alert className="bg-brand-sage-500 text-white border-brand-sage-600">
        <Building className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Admin View:</span>{' '}
          {message || 'Viewing data for your building'}
        </AlertDescription>
      </Alert>
    );
  }

  if (role === 'admin' && scope === 'global') {
    return (
      <Alert className="bg-brand-sage-600 text-white border-brand-sage-700">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Administrator:</span>{' '}
          {message || 'Global view across all buildings'}
        </AlertDescription>
      </Alert>
    );
  }

  if (role === 'admin' && scope === 'building') {
    return (
      <Alert className="bg-brand-sage-600 text-white border-brand-sage-700">
        <Eye className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Administrator:</span>{' '}
          {message || 'Viewing single building (can switch buildings)'}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
