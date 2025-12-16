import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

export interface TimelineMilestone {
  id: string;
  title: string;
  description?: string;
  date?: string;
  completed: boolean;
  current?: boolean;
}

interface ProgressTimelineProps {
  milestones: TimelineMilestone[];
}

export function ProgressTimeline({ milestones }: ProgressTimelineProps) {
  return (
    <div className="space-y-1">
      {milestones.map((milestone, idx) => {
        const isLast = idx === milestones.length - 1;
        
        return (
          <div key={milestone.id} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className={`relative ${
                milestone.completed
                  ? 'text-success'
                  : milestone.current
                  ? 'text-brand-sage-600'
                  : 'text-neutral-line-200'
              }`}>
                {milestone.completed ? (
                  <CheckCircle className="w-6 h-6 fill-current" />
                ) : (
                  <Circle className="w-6 h-6" strokeWidth={2} />
                )}
                {milestone.current && !milestone.completed && (
                  <div className="absolute inset-0 rounded-full bg-brand-sage-500 opacity-20 animate-ping" />
                )}
              </div>
              
              {!isLast && (
                <div className={`w-0.5 h-12 mt-1 ${
                  milestone.completed ? 'bg-success' : 'bg-neutral-line-200'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
              <h4 className={`text-sm mb-1 ${
                milestone.completed || milestone.current
                  ? 'text-neutral-ink-900'
                  : 'text-neutral-ink-500'
              }`}>
                {milestone.title}
              </h4>
              {milestone.description && (
                <p className="text-xs text-neutral-ink-500 mb-1">
                  {milestone.description}
                </p>
              )}
              {milestone.date && (
                <p className={`text-xs ${
                  milestone.completed
                    ? 'text-success'
                    : milestone.current
                    ? 'text-brand-sage-600'
                    : 'text-neutral-ink-500'
                }`}>
                  {milestone.date}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
