import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { ForgotPasswordActions } from './ForgotPasswordActions';
import { ForgotPasswordStepHeader } from './ForgotPasswordStepHeader';
import { maskEmail, type ForgotPasswordCopy } from './forgotPasswordI18n';
import { fpOtpSection, fpResend, fpSection } from './forgotPasswordTheme';

const RESEND_COUNTDOWN_SECONDS = 60;

interface ForgotPasswordStep2Props {
  copy: ForgotPasswordCopy;
  email: string;
  otp: string;
  otpError?: string;
  isSubmitting?: boolean;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onBack: () => void;
}

export function ForgotPasswordStep2({
  copy,
  email,
  otp,
  otpError,
  isSubmitting,
  onOtpChange,
  onVerify,
  onBack,
}: ForgotPasswordStep2Props) {
  const [resendSeconds, setResendSeconds] = useState(RESEND_COUNTDOWN_SECONDS);

  useEffect(() => {
    setResendSeconds(RESEND_COUNTDOWN_SECONDS);
    const timer = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [email]);

  const handleResendPlaceholder = () => {
    console.log('[ForgotPassword] Resend code placeholder', { email });
    setResendSeconds(RESEND_COUNTDOWN_SECONDS);
  };

  return (
    <div className={fpSection}>
      <ForgotPasswordStepHeader
        title={copy.step2Title}
        subtitle={copy.step2Subtitle}
        description={copy.step2SentMessage}
        maskedEmail={maskEmail(email)}
      />

      <div className={fpOtpSection}>
        <OtpInput
          value={otp}
          onChange={onOtpChange}
          disabled={isSubmitting}
          aria-label={copy.step2Subtitle}
        />
        {otpError && (
          <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1.5 mt-4">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {otpError}
          </p>
        )}
      </div>

      <div className={fpResend}>
        {resendSeconds > 0 ? (
          <p className="leading-relaxed">
            {copy.resendIn}{' '}
            <span className="font-semibold text-neutral-ink-800 tabular-nums">
              {resendSeconds}
              {copy.seconds}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResendPlaceholder}
            disabled={isSubmitting}
            className="font-medium text-[#6A8F7B] hover:text-[#5a7a68] underline underline-offset-[3px] decoration-[#6A8F7B]/40 hover:decoration-[#6A8F7B] transition-colors disabled:opacity-50"
          >
            {copy.resendCode}
          </button>
        )}
      </div>

      <ForgotPasswordActions
        primaryLabel={copy.verifyAndContinue}
        onPrimary={onVerify}
        primaryDisabled={otp.length !== 6}
        isLoading={isSubmitting}
        secondaryLabel={copy.back}
        onSecondary={onBack}
        secondaryDisabled={isSubmitting}
      />
    </div>
  );
}
