import React, { type RefObject } from 'react';
import { Label } from '../../ui/label';
import {
  AppSelect,
  AppSelectContent,
  AppSelectItem,
  AppSelectTrigger,
  AppSelectValue,
} from '../../ui/app-select';
import type { UserFormRole } from './userFormRoleUtils';
import { normalizeUserFormRole } from './userFormRoleUtils';

export type RoleSelectProps = {
  id?: string;
  value: UserFormRole;
  onChange: (role: UserFormRole) => void;
  label: string;
  placeholder: string;
  residentLabel: string;
  adminLabel: string;
  superAdminLabel: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  containerRef?: RefObject<HTMLElement | null>;
};

/**
 * Controlled role picker — always emits canonical resident | admin | super_admin.
 */
export function RoleSelect({
  id = 'role',
  value,
  onChange,
  label,
  placeholder,
  residentLabel,
  adminLabel,
  superAdminLabel,
  required,
  disabled,
  className,
  containerRef,
}: RoleSelectProps) {
  const normalized = normalizeUserFormRole(value);

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label htmlFor={id} className="text-neutral-ink-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <AppSelect
        value={normalized}
        disabled={disabled}
        onValueChange={(raw) => onChange(normalizeUserFormRole(raw))}
        containerRef={containerRef}
      >
        <AppSelectTrigger className="rounded-xl border-neutral-line-200 focus:border-[#6A8F7B]">
          <AppSelectValue placeholder={placeholder} />
        </AppSelectTrigger>
        <AppSelectContent className="rounded-xl">
          <AppSelectItem value="resident" className="rounded-lg">
            {residentLabel}
          </AppSelectItem>
          <AppSelectItem value="admin" className="rounded-lg">
            {adminLabel}
          </AppSelectItem>
          <AppSelectItem value="super_admin" className="rounded-lg">
            {superAdminLabel}
          </AppSelectItem>
        </AppSelectContent>
      </AppSelect>
    </div>
  );
}
