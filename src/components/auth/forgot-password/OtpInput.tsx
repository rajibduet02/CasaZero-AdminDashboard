import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '../../ui/utils';

const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  'aria-label'?: string;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  idPrefix = 'otp',
  'aria-label': ariaLabel = 'Verification code',
}: OtpInputProps) {
  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusIndex = useCallback((index: number) => {
    const el = inputRefs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const updateDigits = useCallback(
    (next: string[]) => {
      const joined = next.join('').replace(/\s/g, '').slice(0, OTP_LENGTH);
      onChange(joined);
    },
    [onChange],
  );

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits.map((d) => (d === ' ' ? '' : d))];
    next[index] = digit;
    updateDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const current = digits[index] === ' ' ? '' : digits[index];
      if (!current && index > 0) {
        e.preventDefault();
        const next = [...digits.map((d) => (d === ' ' ? '' : d))];
        next[index - 1] = '';
        updateDigits(next);
        focusIndex(index - 1);
      } else if (current) {
        const next = [...digits.map((d) => (d === ' ' ? '' : d))];
        next[index] = '';
        updateDigits(next);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusIndex(index + 1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const focusAt = Math.min(pasted.length, OTP_LENGTH - 1);
    requestAnimationFrame(() => focusIndex(focusAt));
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => focusIndex(0));
    return () => cancelAnimationFrame(frame);
  }, [focusIndex]);

  useEffect(() => {
    if (value.length === 0) {
      inputRefs.current[0]?.blur();
    }
  }, [value]);

  return (
    <div
      className="flex justify-center items-center gap-2 max-w-full mx-auto"
      role="group"
      aria-label={ariaLabel}
      onPaste={handlePaste}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, index) => {
        const char = digits[index] === ' ' ? '' : digits[index];
        const filled = char.length > 0;
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            id={`${idPrefix}-${index}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={char}
            disabled={disabled}
            aria-label={`${ariaLabel} digit ${index + 1}`}
            className={cn(
              'size-10 sm:size-11 shrink-0 text-center text-base font-semibold rounded-full',
              'border bg-white text-neutral-ink-900',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#6A8F7B]/30 focus:ring-offset-1',
              filled
                ? 'border-[#6A8F7B] bg-[#6A8F7B]/5'
                : 'border-neutral-line-200',
              'focus:border-[#6A8F7B] focus:ring-1 focus:ring-[#6A8F7B]/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
          />
        );
      })}
    </div>
  );
}
