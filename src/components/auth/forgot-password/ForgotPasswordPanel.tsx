import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../../utils/LanguageContext';
import { ForgotPasswordStep1 } from './ForgotPasswordStep1';
import { ForgotPasswordStep2 } from './ForgotPasswordStep2';
import { ForgotPasswordStep3 } from './ForgotPasswordStep3';
import { resetForgotPassword, sendForgotPasswordOtp } from './forgotPasswordApi';
import { getForgotPasswordCopy } from './forgotPasswordI18n';
import { fpCard } from './forgotPasswordTheme';
import type { ForgotPasswordStep } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordPanelProps {
  onClose: () => void;
  initialEmail?: string;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && String(error).includes('fetch');
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

  const requestOtp = (trimmedEmail: string) => sendForgotPasswordOtp(trimmedEmail);

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) return;

    setIsSubmitting(true);
    setEmailError(undefined);

    try {
      const data = await requestOtp(trimmedEmail);
      toast.success(data.message || copy.otpSentSuccess);
      setCurrentStep(2);
    } catch (error) {
      const message = isNetworkError(error)
        ? copy.networkError
        : error instanceof Error
          ? error.message
          : copy.requestFailed;
      setEmailError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setIsSubmitting(true);
    setOtpError(undefined);

    try {
      const data = await requestOtp(trimmedEmail);
      toast.success(data.message || copy.otpSentSuccess);
    } catch (error) {
      const message = isNetworkError(error)
        ? copy.networkError
        : error instanceof Error
          ? error.message
          : copy.requestFailed;
      setOtpError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setOtpError(copy.otpRequired);
      return;
    }
    setOtpError(undefined);
    setCurrentStep(3);
  };

  const handleResetPassword = async () => {
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

    if (otp.length !== 6) {
      setOtpError(copy.otpRequired);
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await resetForgotPassword({
        email: email.trim(),
        otp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success(data.message || copy.passwordResetSuccess);
      handleClose();
    } catch (error) {
      const message = isNetworkError(error)
        ? copy.networkError
        : error instanceof Error
          ? error.message
          : copy.requestFailed;
      toast.error(message);
      if (message.toLowerCase().includes('otp') || message.toLowerCase().includes('code')) {
        setOtpError(message);
        setCurrentStep(2);
      }
    } finally {
      setIsSubmitting(false);
    }
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
          onResend={handleResendOtp}
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
