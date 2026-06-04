import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { ForgotPasswordActions } from './ForgotPasswordActions';
import { ForgotPasswordStepHeader } from './ForgotPasswordStepHeader';
import type { ForgotPasswordCopy } from './forgotPasswordI18n';
import { fpFieldBlock, fpInput, fpLabel, fpSection } from './forgotPasswordTheme';

interface ForgotPasswordStep1Props {
  copy: ForgotPasswordCopy;
  email: string;
  emailError?: string;
  isSubmitting?: boolean;
  onEmailChange: (value: string) => void;
  onContinue: () => void;
  onBackToLogin: () => void;
  emailLabel: string;
  emailPlaceholder: string;
}

export function ForgotPasswordStep1({
  copy,
  email,
  emailError,
  isSubmitting,
  onEmailChange,
  onContinue,
  onBackToLogin,
  emailLabel,
  emailPlaceholder,
}: ForgotPasswordStep1Props) {
  return (
    <div className={fpSection}>
      <ForgotPasswordStepHeader
        title={copy.step1Title}
        description={copy.step1Description}
      />

      <div className={fpFieldBlock}>
        <Label htmlFor="forgot-step-email" className={fpLabel}>
          {emailLabel}
        </Label>
        <Input
          id="forgot-step-email"
          type="email"
          autoComplete="email"
          placeholder={emailPlaceholder}
          value={email}
          disabled={isSubmitting}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && onContinue()}
          className={fpInput}
        />
        {emailError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {emailError}
          </p>
        )}
      </div>

      <ForgotPasswordActions
        primaryLabel={copy.continue}
        onPrimary={onContinue}
        isLoading={isSubmitting}
        secondaryLabel={copy.backToLogin}
        onSecondary={onBackToLogin}
        secondaryDisabled={isSubmitting}
      />
    </div>
  );
}
