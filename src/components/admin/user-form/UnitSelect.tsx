import React, { type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../../utils/LanguageContext';
import { Label } from '../../ui/label';
import {
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
} from '../../ui/app-select';

export type UnitOption = {
  id: number | string;
  name?: string;
  unit_name?: string;
};

export type UnitSelectProps = {
  id?: string;
  label: string;
  placeholderWhenEnabled: string;
  placeholderWhenNoResidence: string;
  /** Controlled value: unit id as string, or empty */
  value: string;
  onValueChange: (unitId: string) => void;
  units: UnitOption[];
  loading?: boolean;
  /** When true, user must pick a residence first — dropdown disabled */
  disabledUntilResidence: boolean;
  required?: boolean;
  className?: string;
  containerRef?: RefObject<HTMLElement | null>;
};

export function UnitSelect({
  id = 'unit',
  label,
  placeholderWhenEnabled,
  placeholderWhenNoResidence,
  value,
  onValueChange,
  units,
  loading,
  disabledUntilResidence,
  required,
  className,
  containerRef,
}: UnitSelectProps) {
  const { t } = useLanguage();
  const blocked = disabledUntilResidence;
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
        disabled={blocked || loading}
        containerRef={containerRef}
      >
        <AppSelectTrigger
          className={`rounded-xl border-neutral-line-200 focus:border-[#6A8F7B] ${
            blocked ? 'bg-neutral-line-100 cursor-not-allowed' : ''
          }`}
        >
          <AppSelectValue
            placeholder={blocked ? placeholderWhenNoResidence : placeholderWhenEnabled}
          />
        </AppSelectTrigger>
        <AppSelectContent className="rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#6A8F7B]" />
            </div>
          ) : units.length === 0 ? (
            <div className="flex items-center justify-center px-2 py-4 text-sm text-neutral-ink-500">
              {blocked ? placeholderWhenNoResidence : t('noUnitsAvailable')}
            </div>
          ) : (
            units.map((unit) => {
              const idStr = String(unit.id);
              const title = unit.unit_name || unit.name || `Unit ${idStr}`;
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
