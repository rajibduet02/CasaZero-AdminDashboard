/**
 * Role + residence/unit assignment rules for the admin user form.
 * Form values stay as resident | admin | super_admin; create/update send the same role string to the API (after client → resident).
 */

export type UserFormRole = 'resident' | 'admin' | 'super_admin';

const ALLOWED: ReadonlySet<string> = new Set(['resident', 'admin', 'super_admin']);

/** Normalize API / UI drift to one of the three canonical roles. */
export function normalizeUserFormRole(raw: string | null | undefined): UserFormRole {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'client') return 'resident';
  if (ALLOWED.has(v)) return v as UserFormRole;
  return 'resident';
}

/** What to show in the assignment section for the current role. */
export function getAssignmentVisibility(role: UserFormRole) {
  return {
    showResidence: role === 'resident' || role === 'admin',
    showUnit: role === 'resident',
  };
}

/** Extra fields merged into the object passed to onSave (create/update). */
export type UserAssignmentPayload = {
  residence_id?: string;
  unit_id?: string;
};

/**
 * Build residence/unit fields for the parent save handler.
 * - super_admin: omit both (caller should not send to API)
 * - admin: residence only
 * - resident: both when set
 */
export function buildAssignmentPayload(
  role: UserFormRole,
  residenceId: string,
  unitId: string,
): UserAssignmentPayload {
  if (role === 'super_admin') return {};

  const res = residenceId.trim();
  const unit = unitId.trim();

  if (role === 'admin') {
    return res ? { residence_id: res } : {};
  }

  const out: UserAssignmentPayload = {};
  if (res) out.residence_id = res;
  if (unit) out.unit_id = unit;
  return out;
}
