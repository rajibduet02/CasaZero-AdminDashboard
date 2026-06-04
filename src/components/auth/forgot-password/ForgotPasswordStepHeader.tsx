import React from 'react';
import { cn } from '../../ui/utils';
import { fpDescription, fpEmailHighlight, fpSubtitle, fpTitle } from './forgotPasswordTheme';

interface ForgotPasswordStepHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  maskedEmail?: string;
  className?: string;
}

export function ForgotPasswordStepHeader({
  title,
  subtitle,
  description,
  maskedEmail,
  className,
}: ForgotPasswordStepHeaderProps) {
  return (
    <header className={cn(className)}>
      <h2 className={fpTitle}>{title}</h2>
      {subtitle && <p className={fpSubtitle}>{subtitle}</p>}
      {description && <p className={fpDescription}>{description}</p>}
      {maskedEmail && <p className={fpEmailHighlight}>{maskedEmail}</p>}
    </header>
  );
}
