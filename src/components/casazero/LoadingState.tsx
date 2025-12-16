import React from 'react';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent, CardHeader } from '../ui/card';

interface LoadingStateProps {
  type?: 'card' | 'list' | 'full';
  count?: number;
}

export function LoadingState({ type = 'list', count = 3 }: LoadingStateProps) {
  if (type === 'full') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-brand-sage-300 border-t-brand-sage-600 animate-spin" />
          <p className="text-sm text-neutral-ink-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
