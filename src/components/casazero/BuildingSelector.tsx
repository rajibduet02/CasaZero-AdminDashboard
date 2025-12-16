import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Building, ChevronDown } from 'lucide-react';
import { type Role } from '../../utils/permissions';

interface Building {
  id: string;
  name: string;
  address: string;
  units: number;
  residents: number;
}

interface BuildingSelectorProps {
  role: Role;
  currentBuilding: Building;
  buildings?: Building[];
  onBuildingChange?: (buildingId: string) => void;
}

export function BuildingSelector({ role, currentBuilding, buildings = [], onBuildingChange }: BuildingSelectorProps) {
  const [selectedBuilding, setSelectedBuilding] = useState(currentBuilding.id);

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuilding(buildingId);
    onBuildingChange?.(buildingId);
  };

  // Admin can switch buildings, resident sees just their residence
  if (role === 'admin' && buildings.length > 0) {
    return (
      <div className="bg-neutral-ink-900 text-white px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4" />
            <span className="text-xs opacity-75">Building Scope</span>
            <Badge className="bg-white/20 text-white text-xs">Super Admin</Badge>
          </div>
          <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  <div className="flex flex-col">
                    <span>{building.name}</span>
                    <span className="text-xs text-neutral-ink-500">{building.address}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs opacity-75 mt-2">
            {currentBuilding.units} units · {currentBuilding.residents} residents
          </p>
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <div className="bg-brand-sage-600 text-white px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4" />
            <span className="text-xs opacity-90">Managing Building</span>
            <Badge className="bg-white/20 text-white text-xs">Admin</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{currentBuilding.name}</p>
              <p className="text-xs opacity-75">{currentBuilding.address}</p>
            </div>
          </div>
          <p className="text-xs opacity-75 mt-2">
            {currentBuilding.units} units · {currentBuilding.residents} residents
          </p>
        </div>
      </div>
    );
  }

  // Resident view - just shows their residence
  return (
    <div className="bg-surface-warm-50 border-b border-neutral-line-200 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center gap-2 text-sm text-neutral-ink-700">
        <Building className="w-4 h-4 text-neutral-ink-500" />
        <span>{currentBuilding.name}</span>
      </div>
    </div>
  );
}
