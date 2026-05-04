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
  /** Administrator only: multiple residences (first is also mirrored on `residence_id`). */
  residenceIds?: string[];
  unit_id?: string;
};

/**
 * Build residence/unit fields for the parent save handler.
 * - super_admin: omit both (caller should not send to API)
 * - admin: one or more residences (`residenceIds` when multiple; always set `residence_id` to first when any)
 * - resident: both when set
 */
export function buildAssignmentPayload(
  role: UserFormRole,
  residenceId: string,
  unitId: string,
  adminResidenceValues?: string[],
): UserAssignmentPayload {
  if (role === 'super_admin') return {};

  const res = residenceId.trim();
  const unit = unitId.trim();

  if (role === 'admin') {
    const raw = adminResidenceValues ?? [];
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const s of raw) {
      const id = s.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    if (ordered.length === 0) return {};
    if (ordered.length === 1) return { residence_id: ordered[0] };
    return { residence_id: ordered[0], residenceIds: ordered };
  }

  const out: UserAssignmentPayload = {};
  if (res) out.residence_id = res;
  if (unit) out.unit_id = unit;
  return out;
}
