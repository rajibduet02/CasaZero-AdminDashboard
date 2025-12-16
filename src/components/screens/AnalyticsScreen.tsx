import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Wrench, 
  MessageSquare,
  Building,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Role, getRoleLabel } from '../../utils/permissions';
import { useLanguage } from '../../utils/LanguageContext';

interface AnalyticsScreenProps {
  role: Role;
}

export function AnalyticsScreen({ role }: AnalyticsScreenProps) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Mock data - would come from backend in real app
  const overviewStats = {
    totalResidents: role === 'super-admin' ? 847 : 124,
    totalBuildings: role === 'super-admin' ? 12 : 1,
    activeTickets: role === 'super-admin' ? 43 : 8,
    pendingMaintenance: role === 'super-admin' ? 156 : 23,
    documentUploads: role === 'super-admin' ? 289 : 47,
    chatActivity: role === 'super-admin' ? 1240 : 198,
  };

  const trends = {
    residents: { value: '+12%', isPositive: true },
    tickets: { value: '-8%', isPositive: true },
    maintenance: { value: '+5%', isPositive: false },
    documents: { value: '+23%', isPositive: true },
  };

  const maintenanceBreakdown = [
    { priority: 'N1', count: 45, percentage: 29, color: 'bg-info' },
    { priority: 'N2', count: 78, percentage: 50, color: 'bg-warning' },
    { priority: 'N3', count: 33, percentage: 21, color: 'bg-brand-sage-600' },
  ];

  const ticketStatus = [
    { status: 'Open', count: 18, color: 'bg-danger' },
    { status: 'In Progress', count: 15, color: 'bg-warning' },
    { status: 'Resolved', count: 52, color: 'bg-success' },
  ];

  const topIssues = [
    { issue: 'HVAC Maintenance', count: 23, category: 'Maintenance' },
    { issue: 'Plumbing Issues', count: 18, category: 'Tickets' },
    { issue: 'Electrical Problems', count: 12, category: 'Tickets' },
    { issue: 'Window Sealing', count: 10, category: 'Maintenance' },
    { issue: 'Common Area Cleaning', count: 8, category: 'Tickets' },
  ];

  const recentActivity = [
    { 
      type: 'document',
      title: 'Energy Certificate uploaded',
      building: 'Building A',
      time: '2 hours ago',
      icon: FileText,
      color: 'bg-brand-sage-600'
    },
    { 
      type: 'maintenance',
      title: 'N2 Task completed',
      building: 'Building C',
      time: '4 hours ago',
      icon: CheckCircle2,
      color: 'bg-success'
    },
    { 
      type: 'ticket',
      title: 'New ticket created',
      building: 'Building B',
      time: '6 hours ago',
      icon: AlertCircle,
      color: 'bg-warning'
    },
    { 
      type: 'user',
      title: 'New resident registered',
      building: 'Building A',
      time: '1 day ago',
      icon: Users,
      color: 'bg-info'
    },
  ];

  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* Time Range Selector */}
      <div className="sticky top-14 bg-white/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4 z-30">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all capitalize ${
                  timeRange === range
                    ? 'bg-brand-sage-600 text-white border-brand-sage-600'
                    : 'bg-surface-white text-neutral-ink-700 border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'Last Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {role === 'super-admin' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Building className="w-5 h-5 text-brand-sage-600" />
                  {trends.residents.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div className="text-2xl mb-1">{overviewStats.totalBuildings}</div>
                <div className="text-xs text-neutral-ink-500">Buildings</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-info" />
                {trends.residents.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              <div className="text-2xl mb-1">{overviewStats.totalResidents}</div>
              <div className="text-xs text-neutral-ink-500">
                Residents
                <span className={`ml-2 ${trends.residents.isPositive ? 'text-success' : 'text-danger'}`}>
                  {trends.residents.value}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                {trends.tickets.isPositive ? (
                  <TrendingDown className="w-4 h-4 text-success" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-danger" />
                )}
              </div>
              <div className="text-2xl mb-1">{overviewStats.activeTickets}</div>
              <div className="text-xs text-neutral-ink-500">
                Active Tickets
                <span className={`ml-2 ${trends.tickets.isPositive ? 'text-success' : 'text-danger'}`}>
                  {trends.tickets.value}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="w-5 h-5 text-warning" />
                {trends.maintenance.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              <div className="text-2xl mb-1">{overviewStats.pendingMaintenance}</div>
              <div className="text-xs text-neutral-ink-500">
                Pending Tasks
                <span className={`ml-2 ${trends.maintenance.isPositive ? 'text-danger' : 'text-success'}`}>
                  {trends.maintenance.value}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-brand-sage-600" />
                {trends.documents.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              <div className="text-2xl mb-1">{overviewStats.documentUploads}</div>
              <div className="text-xs text-neutral-ink-500">
                Documents
                <span className={`ml-2 ${trends.documents.isPositive ? 'text-success' : 'text-danger'}`}>
                  {trends.documents.value}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 h-5 text-info" />
              </div>
              <div className="text-2xl mb-1">{overviewStats.chatActivity}</div>
              <div className="text-xs text-neutral-ink-500">Chat Messages</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Maintenance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maintenance Priority Breakdown</CardTitle>
              <CardDescription>Distribution of maintenance tasks by priority level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {maintenanceBreakdown.map((item) => (
                <div key={item.priority}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${item.color} text-white`}>{item.priority}</Badge>
                      <span className="text-sm text-neutral-ink-700">{item.count} tasks</span>
                    </div>
                    <span className="text-sm text-neutral-ink-500">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-neutral-line-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ticket Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Support Ticket Status</CardTitle>
              <CardDescription>Current status of all support tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-neutral-ink-700">{item.status}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
              <div className="pt-4 border-t border-neutral-line-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Tickets</span>
                  <span className="text-lg">
                    {ticketStatus.reduce((sum, item) => sum + item.count, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Issues</CardTitle>
            <CardDescription>Most common issues reported across {role === 'super-admin' ? 'all buildings' : 'the building'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topIssues.map((item, index) => (
                <div key={item.issue} className="flex items-center justify-between p-3 bg-surface-warm-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-sage-500/10 flex items-center justify-center">
                      <span className="text-sm text-brand-sage-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm">{item.issue}</div>
                      <div className="text-xs text-neutral-ink-500">{item.category}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {role === 'super-admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest activity across all buildings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-neutral-line-200 last:border-0 last:pb-0">
                      <div className={`w-10 h-10 rounded-lg ${item.color}/10 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${item.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm mb-0.5">{item.title}</div>
                        <div className="text-xs text-neutral-ink-500">{item.building}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-ink-400">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
