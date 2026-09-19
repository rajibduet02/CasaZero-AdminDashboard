import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

export type ErrorStateProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
};

/**
 * Inline / full-area error banner with optional Retry.
 * Matches CasaZero admin styling (rounded-2xl, soft red panel).
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  retrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-red-200 bg-red-50',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      <AlertCircle
        className={cn('text-red-500 mb-3', compact ? 'w-8 h-8' : 'w-10 h-10')}
        aria-hidden
      />
      <p className="font-medium text-red-900">{title}</p>
      {message ? (
        <p className="text-sm text-red-800/90 mt-1.5 max-w-md">{message}</p>
      ) : null}
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-xl border-red-300 text-red-900 hover:bg-red-100"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              Retrying…
            </>
          ) : (
            retryLabel
          )}
        </Button>
      ) : null}
    </div>
  );
}
