import React, { type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from '../../ui/label';
import {
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
} from '../../ui/app-select';

export type ResidenceOption = {
  id?: number | string;
  residence_id?: number | string;
  residence_name?: string;
  name?: string;
};

export type ResidenceSelectProps = {
  id?: string;
  label: string;
  placeholder: string;
  /** Controlled value: residence id as string, or empty string when none */
  value: string;
  onValueChange: (residenceId: string) => void;
  residences: ResidenceOption[];
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** When inside a modal, keeps the dropdown positioned within the panel (see custom Select). */
  containerRef?: RefObject<HTMLElement | null>;
};

export function ResidenceSelect({
  id = 'residence',
  label,
  placeholder,
  value,
  onValueChange,
  residences,
  loading,
  disabled,
  required,
  className,
  containerRef,
}: ResidenceSelectProps) {
  const selectValue = value.trim() === '' ? undefined : value;

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label htmlFor={id} className="text-neutral-ink-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <AppSelect
        value={selectValue}
        onValueChange={onValueChange}
        disabled={disabled || loading}
        containerRef={containerRef}
      >
        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
          <AppSelectValue placeholder={placeholder} />
        </AppSelectTrigger>
        <AppSelectContent className="rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#6A8F7B]" />
            </div>
          ) : (
            residences
              .filter((residence) => {
                const rawId = residence.id ?? residence.residence_id;
                return rawId != null && String(rawId).trim() !== '';
              })
              .map((residence) => {
                const idStr = String(residence.id ?? residence.residence_id).trim();
                const title =
                  residence.residence_name ?? residence.name ?? `Residence ${idStr}`;
                return (
                  <AppSelectItem key={idStr} value={idStr} className="rounded-lg">
                    {title}
                  </AppSelectItem>
                );
              })
          )}
        </AppSelectContent>
      </AppSelect>
    </div>
  );
}
