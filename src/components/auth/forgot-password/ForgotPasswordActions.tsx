import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { fpActions, fpLinkButton, fpPrimaryButton } from './forgotPasswordTheme';

interface ForgotPasswordActionsProps {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  isLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
}

export function ForgotPasswordActions({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  isLoading = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: ForgotPasswordActionsProps) {
  return (
    <div className={fpActions}>
      <Button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || isLoading}
        className={fpPrimaryButton}
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            <span>{primaryLabel}</span>
          </span>
        ) : (
          primaryLabel
        )}
      </Button>
      {secondaryLabel && onSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          disabled={secondaryDisabled || isLoading}
          className={cn(fpLinkButton, 'disabled:opacity-50 disabled:pointer-events-none')}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
