import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge, Priority, Status } from './StatusBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Paperclip, Phone, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export interface MaintenanceTask {
  id: string;
  title: string;
  category: string;
  description: string;
  priority: Priority;
  status: Status;
  frequency: string;
  nextDue?: string;
  dueDate?: string;
  attachments?: number;
  contacts?: Array<{ name: string; role: string; phone?: string }>;
  lastCompleted?: string;
  autoDismissTimer?: number; // For N1 tasks
}

interface MaintenanceCardProps {
  task: MaintenanceTask;
  role: 'client' | 'admin';
  onMarkComplete?: () => void;
  onOpenTicket?: () => void;
  onContactSupplier?: () => void;
  onAskAI?: () => void;
  onTakeCharge?: () => void;
  onViewDetails?: () => void;
  onIgnore?: () => void;
}

export function MaintenanceCard({
  task,
  role,
  onMarkComplete,
  onOpenTicket,
  onContactSupplier,
  onAskAI,
  onTakeCharge,
  onViewDetails,
  onIgnore,
}: MaintenanceCardProps) {
  const isOverdue = task.status === 'overdue';
  const isN1 = task.priority === 'N1';
  const isN2 = task.priority === 'N2';
  const isN3 = task.priority === 'N3';

  return (
    <Card 
      className={`overflow-hidden border-0 shadow-sm shadow-black/5 transition-all cursor-pointer ${
        isOverdue ? 'bg-danger/5 shadow-danger/10' : ''
      } ${isN1 ? 'bg-info/5 shadow-info/10' : ''}`}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge type="priority" value={task.priority} />
            <StatusBadge type="status" value={task.status} />
          </div>
          {isOverdue && (
            <div className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
          )}
        </div>
        <CardTitle>{task.title}</CardTitle>
        <CardDescription>
          <Badge variant="secondary" className="mr-2 bg-surface-warm-100 text-neutral-ink-600">{task.category}</Badge>
          {task.frequency}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        <p className="text-sm text-neutral-ink-700 line-clamp-2 leading-relaxed">{task.description}</p>

        {/* Timing info */}
        <div className="flex flex-wrap gap-3 text-xs text-neutral-ink-500">
          {task.nextDue && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due: {task.nextDue}</span>
            </div>
          )}
          {task.lastCompleted && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Last: {task.lastCompleted}</span>
            </div>
          )}
        </div>

        {/* N1 Auto-dismiss timer */}
        {isN1 && task.autoDismissTimer && role === 'client' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-info/10 rounded-xl border-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-info" />
            </div>
            <span className="text-sm text-info">
              Auto-dismisses in {task.autoDismissTimer}h
            </span>
          </div>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments > 0 && (
          <div className="flex items-center gap-1 text-xs text-neutral-ink-500">
            <Paperclip className="w-3.5 h-3.5" />
            <span>{task.attachments} attachment{task.attachments > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Contacts */}
        {task.contacts && task.contacts.length > 0 && (
          <div className="space-y-1">
            {task.contacts.map((contact, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-neutral-ink-700">{contact.name} ({contact.role})</span>
                {contact.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContactSupplier?.();
                    }}
                    className="text-brand-sage-600 hover:text-brand-sage-500"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Actions based on priority and role */}
      <CardFooter className="pt-4 border-t border-neutral-line-100 flex-wrap gap-2">
        {/* N1 - Client actions */}
        {isN1 && role === 'client' && (
          <>
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onAskAI?.(); }} className="flex-1">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Ask AI
            </Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onIgnore?.(); }} className="flex-1">
              Ignore
            </Button>
          </>
        )}

        {/* N2 - Client actions */}
        {isN2 && role === 'client' && task.status !== 'completed' && (
          <>
            <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onMarkComplete?.(); }} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Complete
            </Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onOpenTicket?.(); }}>
              Open Ticket
            </Button>
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onAskAI?.(); }}>
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Ask AI
            </Button>
          </>
        )}

        {/* N3 - Admin actions */}
        {isN3 && role === 'admin' && task.status === 'pending' && (
          <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onTakeCharge?.(); }} className="flex-1">
            Take Charge
          </Button>
        )}

        {/* N3 - Client view (read-only) */}
        {isN3 && role === 'client' && (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onAskAI?.(); }} className="flex-1">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Ask AI
          </Button>
        )}

        {/* Admin always has full access */}
        {role === 'admin' && task.status === 'in-progress' && (
          <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onMarkComplete?.(); }} className="flex-1">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
