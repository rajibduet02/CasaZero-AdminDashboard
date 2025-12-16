import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatusBadge } from '../casazero/StatusBadge';
import { EmptyState } from '../casazero/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Image as ImageIcon, Clock, MessageCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { type Role, getPermissions } from '../../utils/permissions';
import { ScopeIndicator } from '../casazero/ScopeIndicator';
import { useLanguage } from '../../utils/LanguageContext';

interface Ticket {
  id: string;
  title: string;
  category: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority?: 'low' | 'medium' | 'high';
  created: string;
  updated: string;
  attachments?: number;
  updates?: number;
  assignedTo?: string;
  createdBy?: string;
}

interface TicketsScreenProps {
  role: Role;
}

export function TicketsScreen({ role }: TicketsScreenProps) {
  const permissions = getPermissions(role);
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  const allTickets: Ticket[] = [
    {
      id: '1',
      title: 'Bathroom sink faucet leaking',
      category: 'Plumbing',
      description: 'The main bathroom sink faucet has a slow leak that needs attention.',
      status: 'in-progress',
      priority: 'high',
      created: 'Oct 30, 2025',
      updated: '2 hours ago',
      attachments: 2,
      updates: 3,
      assignedTo: 'Mario Rossi - Plumber',
      createdBy: 'Marco (Unit 4B)',
    },
    {
      id: '2',
      title: 'Living room light switch not working',
      category: 'Electrical',
      description: 'The main light switch in the living room is unresponsive.',
      status: 'open',
      priority: 'medium',
      created: 'Nov 1, 2025',
      updated: '1 day ago',
      attachments: 1,
      createdBy: 'Marco (Unit 4B)',
    },
    {
      id: '3',
      title: 'Window condensation issue',
      category: 'Building Envelope',
      description: 'Excessive condensation forming on bedroom windows.',
      status: 'resolved',
      priority: 'low',
      created: 'Oct 15, 2025',
      updated: '5 days ago',
      attachments: 3,
      updates: 5,
      assignedTo: 'Giuseppe Verdi - Building Manager',
      createdBy: 'Marco (Unit 4B)',
    },
    {
      id: '4',
      title: 'Common area heating not working',
      category: 'HVAC',
      description: 'Hallway heating system needs attention.',
      status: 'open',
      priority: 'high',
      created: 'Nov 2, 2025',
      updated: '3 hours ago',
      createdBy: 'Lucia (Unit 2A)',
    },
  ];

  // Filter tickets based on role permissions
  const mockTickets = permissions.canViewAllTickets 
    ? allTickets 
    : allTickets.filter(ticket => ticket.createdBy === 'Marco (Unit 4B)');

  const filteredTickets = mockTickets.filter((ticket) => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const categories = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Building Envelope',
    'Appliances',
    'Safety',
    'Other',
  ];

  const handleCreateTicket = () => {
    console.log('Creating ticket:', newTicket);
    setIsCreateOpen(false);
    setNewTicket({
      category: '',
      title: '',
      description: '',
      priority: 'medium',
    });
  };

  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* Filter Tabs */}
      <div className="sticky top-14 bg-white/95 backdrop-blur-sm border-b border-neutral-line-100 px-6 py-4 z-30">
        <div className="max-w-md mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'open', 'in-progress', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all capitalize ${
                  filter === f
                    ? 'bg-brand-sage-600 text-white border-brand-sage-600'
                    : 'bg-surface-white text-neutral-ink-700 border-neutral-line-200 hover:border-brand-sage-300'
                }`}
              >
                {f === 'all' ? t('tutte') : f === 'open' ? t('open') : f === 'in-progress' ? t('inProgress') : t('resolved')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Role indicator for Admins */}
        {permissions.canViewAllTickets && (
          <ScopeIndicator 
            role={role} 
            scope={role === 'super-admin' ? 'global' : 'building'}
            message={role === 'super-admin' ? 'Viewing all tickets across all buildings' : 'Viewing all tickets from residents in your building'}
          />
        )}

        {/* Create Ticket Button */}
        {permissions.canCreateTickets && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              {t('createTicket')}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe the issue you're experiencing and we'll get back to you soon.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) =>
                    setNewTicket({ ...newTicket, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={newTicket.title}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about the issue..."
                  rows={4}
                  value={newTicket.description}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) =>
                    setNewTicket({ ...newTicket, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High - Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full">
                <ImageIcon className="w-4 h-4 mr-2" />
                Add Photos
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>Create Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}

        {/* Tickets List */}
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="secondary">{ticket.category}</Badge>
                  <StatusBadge type="status" value={ticket.status} />
                </div>
                <CardTitle className="text-base">{ticket.title}</CardTitle>
                <CardDescription className="text-sm">
                  {ticket.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex flex-wrap gap-3 text-xs text-neutral-ink-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Created {ticket.created}</span>
                  </div>
                  {ticket.attachments && (
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{ticket.attachments} photo{ticket.attachments > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {ticket.updates && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{ticket.updates} update{ticket.updates > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {ticket.status === 'in-progress' && (
                  <div className="mt-3 p-3 bg-info/10 rounded-lg border border-info/20">
                    <p className="text-xs text-info">
                      <strong>Update:</strong> Technician assigned. Expected visit on Nov 5, 2025.
                    </p>
                  </div>
                )}

                {ticket.status === 'resolved' && (
                  <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="text-xs">
                        <strong>Resolved:</strong> Issue fixed on {ticket.updated}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t border-neutral-line-200">
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" size="sm">
                    View Details
                  </Button>
                  {permissions.canAssignTickets && !ticket.assignedTo && ticket.status === 'open' && (
                    <Button variant="default" size="sm" onClick={() => console.log('Assign ticket', ticket.id)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Assign
                    </Button>
                  )}
                  {permissions.canResolveTickets && ticket.status !== 'resolved' && (
                    <Button variant="default" size="sm" onClick={() => console.log('Resolve ticket', ticket.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <EmptyState
            type="empty"
            title="No tickets in this category"
            description="Create a new ticket if you need assistance"
          />
        )}
      </div>
    </div>
  );
}
