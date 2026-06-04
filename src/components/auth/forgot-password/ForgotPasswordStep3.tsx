import React from 'react';
import { PasswordField } from './PasswordField';
import { ForgotPasswordActions } from './ForgotPasswordActions';
import { ForgotPasswordStepHeader } from './ForgotPasswordStepHeader';
import type { ForgotPasswordCopy } from './forgotPasswordI18n';
import { fpFieldBlock, fpSection } from './forgotPasswordTheme';

interface ForgotPasswordStep3Props {
  copy: ForgotPasswordCopy;
  newPassword: string;
  confirmPassword: string;
  passwordError?: string;
  confirmError?: string;
  isSubmitting?: boolean;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onReset: () => void;
  onBack: () => void;
}

export function ForgotPasswordStep3({
  copy,
  newPassword,
  confirmPassword,
  passwordError,
  confirmError,
  isSubmitting,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onReset,
  onBack,
}: ForgotPasswordStep3Props) {
  return (
    <div className={fpSection}>
      <ForgotPasswordStepHeader
        title={copy.step3Title}
        description={copy.step3Description}
      />

      <div className={`${fpFieldBlock} space-y-5`}>
        <PasswordField
          id="forgot-new-password"
          label={copy.newPassword}
          value={newPassword}
          onChange={onNewPasswordChange}
          error={passwordError}
          disabled={isSubmitting}
          autoComplete="new-password"
          onEnter={onReset}
        />
        <PasswordField
          id="forgot-confirm-password"
          label={copy.confirmPassword}
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
          error={confirmError}
          disabled={isSubmitting}
          autoComplete="new-password"
          onEnter={onReset}
        />
      </div>

      <ForgotPasswordActions
        primaryLabel={copy.resetPassword}
        onPrimary={onReset}
        isLoading={isSubmitting}
        secondaryLabel={copy.back}
        onSecondary={onBack}
        secondaryDisabled={isSubmitting}
      />
    </div>
  );
}
