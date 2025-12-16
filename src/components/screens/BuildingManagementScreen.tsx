import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Building, MapPin, Users, Calendar, Settings, Info, Shield, Edit, HardHat, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { type Role, getPermissions } from '../../utils/permissions';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useLanguage } from '../../utils/LanguageContext';
import { ConstructionTimeline, getDefaultConstructionPhases } from '../casazero/ConstructionTimeline';

interface BuildingManagementScreenProps {
  role: Role;
}

interface BuildingDetails {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  occupiedUnits: number;
  totalResidents: number;
  administrators: number;
  constructionStatus: 'completed' | 'under-construction';
  completionDate?: string;
}

export function BuildingManagementScreen({ role }: BuildingManagementScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const mockBuildings: BuildingDetails[] = [
    {
      id: '1',
      name: 'Residenza Verde Building A',
      address: 'Via Giuseppe Verdi 42, 20121 Milano MI',
      totalUnits: 24,
      occupiedUnits: 18,
      totalResidents: 42,
      administrators: 1,
      constructionStatus: 'completed',
    },
    {
      id: '2',
      name: 'Residenza Verde Building B',
      address: 'Via Giuseppe Verdi 44, 20121 Milano MI',
      totalUnits: 32,
      occupiedUnits: 0,
      totalResidents: 0,
      administrators: 0,
      constructionStatus: 'under-construction',
      completionDate: 'February 2026',
    },
    {
      id: '3',
      name: 'Residenza Sole Tower',
      address: 'Corso Italia 128, 20122 Milano MI',
      totalUnits: 48,
      occupiedUnits: 0,
      totalResidents: 0,
      administrators: 1,
      constructionStatus: 'under-construction',
      completionDate: 'June 2026',
    },
    {
      id: '4',
      name: 'Villa Rosa Complex',
      address: 'Via dei Fiori 18, 20123 Milano MI',
      totalUnits: 16,
      occupiedUnits: 12,
      totalResidents: 28,
      administrators: 1,
      constructionStatus: 'completed',
    },
  ];

  const constructionPhases = getDefaultConstructionPhases(t);

  if (!permissions.canManageBuildings) {
    return (
      <div className="pb-20 bg-gradient-to-b from-white via-brand-sage-50 to-brand-sage-100 min-h-screen">
        <div className="px-4 py-6 max-w-md mx-auto">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access building management.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-white min-h-screen">
      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-xl mb-1">Building Management</h2>
          <p className="text-sm text-neutral-ink-500">
            Configure and monitor all buildings
          </p>
        </div>

        {/* Super Admin Notice */}
        <Alert className="bg-neutral-ink-900 text-white border-neutral-ink-800">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Super Admin:</span> Read-only mobile preview. Full management available on desktop dashboard.
          </AlertDescription>
        </Alert>

        {/* Buildings List */}
        <div className="space-y-4">
          {mockBuildings.map((building) => (
            <Card key={building.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{building.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {building.address}
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      building.constructionStatus === 'completed'
                        ? 'bg-success text-white'
                        : 'bg-warning text-white'
                    }
                  >
                    {building.constructionStatus === 'completed' ? 'Active' : 'In Construction'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-warm-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-neutral-ink-500" />
                      <span className="text-xs text-neutral-ink-500">Units</span>
                    </div>
                    <p className="text-lg">{building.occupiedUnits}/{building.totalUnits}</p>
                    <p className="text-xs text-neutral-ink-500">
                      {Math.round((building.occupiedUnits / building.totalUnits) * 100)}% occupied
                    </p>
                  </div>

                  <div className="bg-surface-warm-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-neutral-ink-500" />
                      <span className="text-xs text-neutral-ink-500">Residents</span>
                    </div>
                    <p className="text-lg">{building.totalResidents}</p>
                    <p className="text-xs text-neutral-ink-500">
                      {building.administrators} admin{building.administrators !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {building.completionDate && (
                    <div className="bg-surface-warm-50 rounded-lg p-3 col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-neutral-ink-500" />
                        <span className="text-xs text-neutral-ink-500">Expected Completion</span>
                      </div>
                      <p className="text-sm">{building.completionDate}</p>
                    </div>
                  )}
                </div>

                {/* Construction Timeline - Only for buildings under construction */}
                {building.constructionStatus === 'under-construction' && (
                  <div className="pt-4 border-t border-neutral-line-100">
                    <div className="flex items-center gap-2 mb-3">
                      <HardHat className="w-4 h-4 text-aqua-green-600" />
                      <h4 className="text-sm font-semibold text-neutral-ink-900">{t('constructionProgress')}</h4>
                      <Sparkles className="w-4 h-4 text-aqua-green-500" />
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-neutral-line-100">
                      <ConstructionTimeline phases={constructionPhases} />
                    </div>
                    <p className="text-xs text-neutral-ink-400 mt-2 text-center">
                      {building.id === '2' 
                        ? 'Current Phase: Facciate (Facades) - In Progress' 
                        : 'Current Phase: Getto Platea (Foundation) - Completed'}
                    </p>
                  </div>
                )}

                {/* Actions - Preview Only for Mobile */}
                <div className="space-y-2 pt-2 border-t border-neutral-line-200">
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure (Preview)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Building Configuration</DialogTitle>
                        <DialogDescription>
                          Preview of building settings (desktop dashboard required for full editing)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="building-name">Building Name</Label>
                          <Input id="building-name" defaultValue={building.name} disabled />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="building-address">Address</Label>
                          <Input id="building-address" defaultValue={building.address} disabled />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-neutral-line-200">
                          <div className="flex items-center justify-between">
                            <Label>Enable Chat</Label>
                            <Switch checked disabled />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Allow Ticket Creation</Label>
                            <Switch checked disabled />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Maintenance Reminders</Label>
                            <Switch checked disabled />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                          Close
                        </Button>
                        <Button disabled>
                          Save Changes (Desktop Only)
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="ghost" size="sm" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    View All Residents
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Global Stats Summary */}
        <Card className="bg-white border border-neutral-line-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aqua-green-500 to-aqua-green-600 flex items-center justify-center shadow-sm">
                <Building className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base text-neutral-ink-900">Portfolio Overview</CardTitle>
                <CardDescription className="text-neutral-ink-500">
                  Total across all buildings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-neutral-line-50">
              <p className="text-2xl text-neutral-ink-900">
                {mockBuildings.reduce((sum, b) => sum + b.totalUnits, 0)}
              </p>
              <p className="text-xs text-neutral-ink-500 mt-1">Total Units</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-neutral-line-50">
              <p className="text-2xl text-neutral-ink-900">
                {mockBuildings.reduce((sum, b) => sum + b.totalResidents, 0)}
              </p>
              <p className="text-xs text-neutral-ink-500 mt-1">Residents</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-neutral-line-50">
              <p className="text-2xl text-neutral-ink-900">{mockBuildings.length}</p>
              <p className="text-xs text-neutral-ink-500 mt-1">Buildings</p>
            </div>
          </CardContent>
        </Card>

        {/* Construction Summary */}
        {mockBuildings.filter(b => b.constructionStatus === 'under-construction').length > 0 && (
          <Alert className="bg-white border border-aqua-green-200/50 shadow-sm">
            <HardHat className="h-4 w-4 text-aqua-green-600" />
            <AlertDescription className="text-neutral-ink-700">
              <span className="font-medium text-neutral-ink-900">Construction Projects:</span> {mockBuildings.filter(b => b.constructionStatus === 'under-construction').length} building{mockBuildings.filter(b => b.constructionStatus === 'under-construction').length > 1 ? 's' : ''} currently under construction
            </AlertDescription>
          </Alert>
        )}

        {/* Info Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <span className="font-medium">Mobile Preview Mode:</span> Full building management features (HVAC controls, access systems, utility monitoring) are available on the desktop dashboard.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
