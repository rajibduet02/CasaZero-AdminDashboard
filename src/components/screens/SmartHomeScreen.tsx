import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Home, 
  Lightbulb, 
  Thermometer, 
  Wind, 
  Lock, 
  Camera, 
  Blinds,
  Power,
  Droplet,
  Zap,
  Settings,
  Clock,
  TrendingUp,
  Sun,
  Moon,
  CloudRain,
  Wifi
} from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { ScopeIndicator } from '../casazero/ScopeIndicator';
import { useLanguage } from '../../utils/LanguageContext';

interface SmartHomeScreenProps {
  role: Role;
}

interface Device {
  id: string;
  name: string;
  type: 'light' | 'climate' | 'security' | 'appliance' | 'blinds';
  room: string;
  status: 'on' | 'off' | 'locked' | 'unlocked';
  value?: number; // for dimmers, thermostats, etc.
  unit?: string;
  icon: any;
  color: string;
}

export function SmartHomeScreen({ role }: SmartHomeScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [activeRoom, setActiveRoom] = useState<string>('all');

  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: t('livingRoomLights') || 'Living Room Lights',
      type: 'light',
      room: 'living',
      status: 'on',
      value: 75,
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
    {
      id: '2',
      name: t('bedroomLights') || 'Bedroom Lights',
      type: 'light',
      room: 'bedroom',
      status: 'off',
      value: 0,
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
    {
      id: '3',
      name: t('thermostat') || 'Thermostat',
      type: 'climate',
      room: 'living',
      status: 'on',
      value: 22,
      unit: '°C',
      icon: Thermometer,
      color: 'text-orange-500'
    },
    {
      id: '4',
      name: t('airConditioner') || 'Air Conditioner',
      type: 'climate',
      room: 'bedroom',
      status: 'off',
      value: 24,
      unit: '°C',
      icon: Wind,
      color: 'text-blue-500'
    },
    {
      id: '5',
      name: t('frontDoorLock') || 'Front Door Lock',
      type: 'security',
      room: 'entrance',
      status: 'locked',
      icon: Lock,
      color: 'text-green-500'
    },
    {
      id: '6',
      name: t('securityCamera') || 'Security Camera',
      type: 'security',
      room: 'entrance',
      status: 'on',
      icon: Camera,
      color: 'text-purple-500'
    },
    {
      id: '7',
      name: t('livingRoomBlinds') || 'Living Room Blinds',
      type: 'blinds',
      room: 'living',
      status: 'on',
      value: 60,
      icon: Blinds,
      color: 'text-gray-500'
    },
    {
      id: '8',
      name: t('kitchenLights') || 'Kitchen Lights',
      type: 'light',
      room: 'kitchen',
      status: 'on',
      value: 90,
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
  ]);

  const rooms = [
    { id: 'all', label: t('allRooms') || 'All Rooms', count: devices.length },
    { id: 'living', label: t('livingRoom') || 'Living Room', count: devices.filter(d => d.room === 'living').length },
    { id: 'bedroom', label: t('bedroom') || 'Bedroom', count: devices.filter(d => d.room === 'bedroom').length },
    { id: 'kitchen', label: t('kitchen') || 'Kitchen', count: devices.filter(d => d.room === 'kitchen').length },
    { id: 'entrance', label: t('entrance') || 'Entrance', count: devices.filter(d => d.room === 'entrance').length },
  ];

  const filteredDevices = activeRoom === 'all' 
    ? devices 
    : devices.filter(d => d.room === activeRoom);

  const toggleDevice = (deviceId: string) => {
    setDevices(devices.map(device => {
      if (device.id === deviceId) {
        if (device.type === 'security') {
          return { 
            ...device, 
            status: device.status === 'locked' ? 'unlocked' : 'locked' as 'locked' | 'unlocked'
          };
        }
        return { 
          ...device, 
          status: device.status === 'on' ? 'off' : 'on' as 'on' | 'off',
          value: device.status === 'on' ? 0 : device.value || 100
        };
      }
      return device;
    }));
  };

  const updateDeviceValue = (deviceId: string, value: number) => {
    setDevices(devices.map(device => {
      if (device.id === deviceId) {
        return { 
          ...device, 
          value,
          status: value > 0 ? 'on' : 'off' as 'on' | 'off'
        };
      }
      return device;
    }));
  };

  const getDeviceStatusColor = (device: Device) => {
    if (device.type === 'security') {
      return device.status === 'locked' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger';
    }
    return device.status === 'on' ? 'bg-success/10 text-success' : 'bg-neutral-ink-200 text-neutral-ink-600';
  };

  const getDeviceStatusLabel = (device: Device) => {
    if (device.type === 'security') {
      return device.status === 'locked' ? t('locked') || 'Locked' : t('unlocked') || 'Unlocked';
    }
    return device.status === 'on' ? t('on') || 'On' : t('off') || 'Off';
  };

  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* Header Stats */}
      <div className="px-6 pt-6 pb-4 space-y-4 max-w-md mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <Power className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl mb-0.5">{devices.filter(d => d.status === 'on').length}</p>
                <p className="text-xs text-neutral-ink-500">{t('active') || 'Active'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl mb-0.5">245W</p>
                <p className="text-xs text-neutral-ink-500">{t('consumption') || 'Usage'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                  <Thermometer className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl mb-0.5">22°C</p>
                <p className="text-xs text-neutral-ink-500">{t('temperature') || 'Temp'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border-0 transition-all duration-300 shadow-sm ${
                activeRoom === room.id
                  ? 'bg-brand-sage-600 text-white shadow-brand-sage-600/20'
                  : 'bg-white text-neutral-ink-700 shadow-black/5 hover:shadow-md'
              }`}
            >
              <span className="text-sm whitespace-nowrap">
                {room.label} ({room.count})
              </span>
            </button>
          ))}
        </div>

        {/* Admin/Super-Admin Scope Indicator */}
        {(role === 'admin' || role === 'super-admin') && (
          <ScopeIndicator 
            role={role} 
            scope={role === 'super-admin' ? 'global' : 'building'}
            message={role === 'super-admin' ? t('managingDevicesGlobal') || 'Managing devices across all buildings' : t('managingDevicesBuilding') || 'Managing devices for your building'}
          />
        )}

        {/* Devices Grid */}
        <div className="space-y-3">
          {filteredDevices.map((device) => {
            const Icon = device.icon;
            const isActive = device.status === 'on' || device.status === 'locked';
            
            return (
              <Card 
                key={device.id}
                className="overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${
                        isActive ? 'bg-brand-sage-100' : 'bg-neutral-ink-100'
                      } flex items-center justify-center transition-all duration-300`}>
                        <Icon className={`w-6 h-6 ${isActive ? device.color : 'text-neutral-ink-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base mb-1">{device.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getDeviceStatusColor(device)}`}
                          >
                            {getDeviceStatusLabel(device)}
                          </Badge>
                          {device.value !== undefined && device.value > 0 && (
                            <span className="text-xs text-neutral-ink-500">
                              {device.value}{device.unit || '%'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleDevice(device.id)}
                      disabled={!permissions.canControlDevices}
                    />
                  </div>

                  {/* Device Controls */}
                  {device.value !== undefined && isActive && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-ink-500">
                        <span>{device.type === 'light' ? t('brightness') || 'Brightness' : device.type === 'blinds' ? t('position') || 'Position' : t('temperature') || 'Temperature'}</span>
                        <span>{device.value}{device.unit || '%'}</span>
                      </div>
                      <Slider
                        value={[device.value]}
                        onValueChange={(values) => updateDeviceValue(device.id, values[0])}
                        max={device.type === 'climate' ? 30 : 100}
                        min={device.type === 'climate' ? 16 : 0}
                        step={1}
                        disabled={!permissions.canControlDevices}
                        className="w-full"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        {permissions.canControlDevices && (
          <Card className="border-0 bg-gradient-to-br from-brand-sage-50 to-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('quickActions') || 'Quick Actions'}</CardTitle>
              <CardDescription>{t('commonScenarios') || 'Common scenarios'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // Turn off all lights
                  setDevices(devices.map(d => 
                    d.type === 'light' ? { ...d, status: 'off' as 'off', value: 0 } : d
                  ));
                }}
              >
                <Moon className="w-4 h-4 mr-2" />
                {t('goodNight') || 'Good Night'} - {t('turnOffAllLights') || 'Turn off all lights'}
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // Turn on all lights to 80%
                  setDevices(devices.map(d => 
                    d.type === 'light' ? { ...d, status: 'on' as 'on', value: 80 } : d
                  ));
                }}
              >
                <Sun className="w-4 h-4 mr-2" />
                {t('goodMorning') || 'Good Morning'} - {t('turnOnAllLights') || 'Turn on all lights'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // Lock all doors
                  setDevices(devices.map(d => 
                    d.type === 'security' && d.icon === Lock ? { ...d, status: 'locked' as 'locked' } : d
                  ));
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                {t('leavingHome') || 'Leaving Home'} - {t('lockAllDoors') || 'Lock all doors'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Weather Info */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-ink-500">{t('outsideTemperature') || 'Outside'}</p>
                  <p className="text-2xl">18°C</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-ink-500">{t('humidity') || 'Humidity'}</p>
                <p className="text-lg">65%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!permissions.canControlDevices && (
          <Card className="border border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm text-warning text-center">
                {t('viewOnlyMode') || 'View-only mode. Contact your administrator for device control access.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
