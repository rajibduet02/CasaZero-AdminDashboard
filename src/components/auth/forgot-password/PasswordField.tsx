import React, { useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../ui/utils';
import { fpInput, fpLabel } from './forgotPasswordTheme';

interface PasswordFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onEnter?: () => void;
  autoComplete?: string;
  className?: string;
}

export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  error,
  disabled = false,
  onEnter,
  autoComplete = 'new-password',
  className,
}: PasswordFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn('space-y-2.5', className)}>
      <Label htmlFor={id} className={fpLabel}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className={cn(
            fpInput,
            'h-11 pr-12',
            error && 'border-red-400/90 focus:border-red-400 focus:ring-red-200/40',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-[#6A8F7B] transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 pt-0.5">{error}</p>}
    </div>
  );
}
