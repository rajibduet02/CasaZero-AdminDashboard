import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Settings, User, UserCog, Shield, Home, Construction } from 'lucide-react';

interface DemoControlsProps {
  currentRole: 'client' | 'admin';
  onRoleChange: (role: 'client' | 'admin') => void;
  residenceStatus: 'completed' | 'under-construction';
  onResidenceStatusChange: (status: 'completed' | 'under-construction') => void;
}

export function DemoControls({
  currentRole,
  onRoleChange,
  residenceStatus,
  onResidenceStatusChange,
}: DemoControlsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed top-20 right-4 z-50 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-8 px-3 border bg-surface-white text-foreground hover:bg-accent hover:text-accent-foreground shadow-lg border-brand-sage-300">
          <Settings className="w-4 h-4" />
          Demo
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Demo Controls</SheetTitle>
          <SheetDescription>
            Switch between different roles and property states to test the app
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <h3 className="text-sm">User Role</h3>
            <div className="space-y-2">
              <button
                onClick={() => onRoleChange('client')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  currentRole === 'client'
                    ? 'border-brand-sage-600 bg-brand-sage-50'
                    : 'border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                <User className="w-5 h-5 text-info" />
                <div className="flex-1 text-left">
                  <p className="text-sm">Resident / Client</p>
                  <p className="text-xs text-neutral-ink-500">Standard user access</p>
                </div>
                {currentRole === 'client' && (
                  <Badge className="bg-brand-sage-600 text-white">Active</Badge>
                )}
              </button>

              <button
                onClick={() => onRoleChange('admin')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  currentRole === 'admin'
                    ? 'border-brand-sage-600 bg-brand-sage-50'
                    : 'border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                <UserCog className="w-5 h-5 text-brand-sage-600" />
                <div className="flex-1 text-left">
                  <p className="text-sm">Administrator</p>
                  <p className="text-xs text-neutral-ink-500">Manage properties</p>
                </div>
                {currentRole === 'admin' && (
                  <Badge className="bg-brand-sage-600 text-white">Active</Badge>
                )}
              </button>
            </div>
          </div>

          {/* Property Status */}
          <div className="space-y-3">
            <h3 className="text-sm">Property Status</h3>
            <div className="space-y-2">
              <button
                onClick={() => onResidenceStatusChange('completed')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  residenceStatus === 'completed'
                    ? 'border-brand-sage-600 bg-brand-sage-50'
                    : 'border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                <Home className="w-5 h-5 text-success" />
                <div className="flex-1 text-left">
                  <p className="text-sm">Completed</p>
                  <p className="text-xs text-neutral-ink-500">Move-in ready</p>
                </div>
                {residenceStatus === 'completed' && (
                  <Badge className="bg-brand-sage-600 text-white">Active</Badge>
                )}
              </button>

              <button
                onClick={() => onResidenceStatusChange('under-construction')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  residenceStatus === 'under-construction'
                    ? 'border-brand-sage-600 bg-brand-sage-50'
                    : 'border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                <Construction className="w-5 h-5 text-warning" />
                <div className="flex-1 text-left">
                  <p className="text-sm">Under Construction</p>
                  <p className="text-xs text-neutral-ink-500">Building in progress</p>
                </div>
                {residenceStatus === 'under-construction' && (
                  <Badge className="bg-brand-sage-600 text-white">Active</Badge>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-info/10 rounded-lg border border-info/20">
            <p className="text-xs text-neutral-ink-700">
              <strong>Note:</strong> This demo control panel allows you to test different user
              roles and property states. In production, these would be determined by authentication
              and database records.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
