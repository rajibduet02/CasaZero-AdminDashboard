import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../../utils/LanguageContext';
import { ForgotPasswordStep1 } from './ForgotPasswordStep1';
import { ForgotPasswordStep2 } from './ForgotPasswordStep2';
import { ForgotPasswordStep3 } from './ForgotPasswordStep3';
import { getForgotPasswordCopy } from './forgotPasswordI18n';
import { fpCard } from './forgotPasswordTheme';
import type { ForgotPasswordStep } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordPanelProps {
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordPanel({ onClose, initialEmail = '' }: ForgotPasswordPanelProps) {
  const { language, t } = useLanguage();
  const copy = getForgotPasswordCopy(language);

  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [otpError, setOtpError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFlow = useCallback(() => {
    setCurrentStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailError(undefined);
    setOtpError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);
    setIsSubmitting(false);
  }, []);

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  useEffect(() => {
    setEmail(initialEmail.trim());
    setCurrentStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailError(undefined);
    setOtpError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);
  }, [initialEmail]);

  const validateEmail = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError(copy.emailRequired);
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(copy.emailInvalid);
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSendOtp = () => {
    if (!validateEmail(email)) return;
    setIsSubmitting(true);
    console.log('[ForgotPassword] handleSendOtp', { email: email.trim() });
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentStep(2);
    }, 300);
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setOtpError(copy.otpRequired);
      return;
    }
    setOtpError(undefined);
    setIsSubmitting(true);
    console.log('[ForgotPassword] handleVerifyOtp', { email: email.trim(), otp });
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentStep(3);
    }, 300);
  };

  const handleResetPassword = () => {
    let valid = true;
    if (!newPassword.trim()) {
      setPasswordError(copy.passwordRequired);
      valid = false;
    } else {
      setPasswordError(undefined);
    }
    if (!confirmPassword.trim()) {
      setConfirmError(copy.confirmRequired);
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError(copy.passwordsMismatch);
      valid = false;
    } else {
      setConfirmError(undefined);
    }
    if (!valid) return;

    setIsSubmitting(true);
    console.log('[ForgotPassword] handleResetPassword', {
      email: email.trim(),
      otp,
      newPasswordLength: newPassword.length,
    });
    setTimeout(() => {
      setIsSubmitting(false);
      handleClose();
    }, 300);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setOtp('');
      setOtpError(undefined);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(undefined);
      setConfirmError(undefined);
    }
  };

  return (
    <div className={fpCard}>
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 p-1 rounded-lg text-neutral-ink-400 hover:text-neutral-ink-700 hover:bg-neutral-line-100 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {currentStep === 1 && (
        <ForgotPasswordStep1
          copy={copy}
          email={email}
          emailError={emailError}
          isSubmitting={isSubmitting}
          onEmailChange={(v) => {
            setEmail(v);
            if (emailError) setEmailError(undefined);
          }}
          onContinue={handleSendOtp}
          onBackToLogin={handleClose}
          emailLabel={t('email')}
          emailPlaceholder={t('emailPlaceholder')}
        />
      )}
      {currentStep === 2 && (
        <ForgotPasswordStep2
          copy={copy}
          email={email}
          otp={otp}
          otpError={otpError}
          isSubmitting={isSubmitting}
          onOtpChange={(v) => {
            setOtp(v);
            if (otpError) setOtpError(undefined);
          }}
          onVerify={handleVerifyOtp}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <ForgotPasswordStep3
          copy={copy}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          passwordError={passwordError}
          confirmError={confirmError}
          isSubmitting={isSubmitting}
          onNewPasswordChange={(v) => {
            setNewPassword(v);
            if (passwordError) setPasswordError(undefined);
          }}
          onConfirmPasswordChange={(v) => {
            setConfirmPassword(v);
            if (confirmError) setConfirmError(undefined);
          }}
          onReset={handleResetPassword}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
