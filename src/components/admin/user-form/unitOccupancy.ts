/**
 * Resident occupancy for the user-form unit picker.
 *
 * Assignment truth for this app lives on resident users (`GET /user/get` →
 * `units[].unit_id` / `units[].id`), not on `POST /unit_by_residence` rows.
 * Unit-list nested `user` is only a secondary signal (and may be the building admin).
 */

export type UnitOccupancyKeep = {
  /** Current user's assigned unit — always remain selectable in edit mode. */
  unitId?: string | number | null;
  /** Current user id — keep a unit occupied by this user. */
  userId?: string | number | null;
};

function idsMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const left = String(a).trim();
  const right = String(b).trim();
  if (left === '' || right === '') return false;
  return left === right;
}

function toPositiveId(value: unknown): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return null;
  return String(n);
}

function toUserId(value: unknown): number | null {
  const id = toPositiveId(value);
  return id == null ? null : Number(id);
}

function isResidentRole(role: unknown): boolean {
  if (role != null && typeof role === 'object' && !Array.isArray(role)) {
    const o = role as Record<string, unknown>;
    return isResidentRole(o.slug ?? o.name ?? o.value ?? o.role ?? o.label);
  }
  const v = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return v === 'resident' || v === 'client';
}

/** Extract unit ids assigned on a user row (supports list + single-user shapes). */
export function unitIdsFromApiUser(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const row = user as Record<string, any>;
  const ids = new Set<string>();

  const top = toPositiveId(row.unit_id);
  if (top) ids.add(top);

  const units = Array.isArray(row.units) ? row.units : [];
  for (const u of units) {
    if (!u || typeof u !== 'object') continue;
    const id = toPositiveId(u.unit_id ?? u.id);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

/**
 * Occupied unit ids from residents in GET /user/get.
 * Optionally skip one user (the resident currently being edited).
 */
export function collectOccupiedUnitIdsFromUsers(
  users: unknown[],
  excludeUserId?: string | number | null,
): Set<string> {
  const occupied = new Set<string>();
  for (const user of users) {
    if (!user || typeof user !== 'object') continue;
    const row = user as Record<string, any>;
    if (!isResidentRole(row.role)) continue;
    const uid = toPositiveId(row.id ?? row.user_id);
    if (excludeUserId != null && uid != null && idsMatch(uid, excludeUserId)) {
      continue;
    }
    for (const unitId of unitIdsFromApiUser(row)) {
      occupied.add(unitId);
    }
  }
  return occupied;
}

/** Resident user id on a unit row, or null if vacant / admin-only contact. */
export function getUnitResidentUserId(unit: unknown): number | null {
  if (!unit || typeof unit !== 'object') return null;
  const row = unit as Record<string, any>;

  const adminId = toUserId(row.residence?.residence_admin);

  const nested =
    row.assigned_user ||
    row.assignedUser ||
    row.client ||
    row.resident ||
    row.tenant ||
    row.assignee ||
    null;
  if (nested && nested.id != null && nested.id !== '') {
    return toUserId(nested.id);
  }

  const rawUserId = toUserId(row.user_id);
  if (rawUserId != null) {
    if (adminId != null && rawUserId === adminId) return null;
    return rawUserId;
  }

  const apiUser = row.user;
  if (apiUser && apiUser.id != null && apiUser.id !== '') {
    const uid = toUserId(apiUser.id);
    if (uid == null) return null;
    if (adminId != null && uid === adminId) return null;
    return uid;
  }

  return null;
}

export function buildUnitOccupancyMap(rows: unknown[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = toPositiveId((row as { id?: unknown }).id);
    if (!id) continue;
    map.set(id, getUnitResidentUserId(row));
  }
  return map;
}

/**
 * Keep vacant units (and optionally the unit already assigned to the user being edited).
 * `occupiedUnitIds` from resident users is the primary source of truth.
 */
export function filterUnitsAvailableForResidentAssignment(
  units: unknown[],
  keep?: UnitOccupancyKeep,
  occupancyMap?: Map<string, number | null>,
  occupiedUnitIds?: Set<string>,
): any[] {
  return units.filter(unit => {
    if (!unit || typeof unit !== 'object') return false;
    const row = unit as Record<string, unknown>;
    const id = toPositiveId(row.id);
    if (!id) return false;

    if (keep?.unitId != null && idsMatch(id, keep.unitId)) return true;

    if (occupiedUnitIds?.has(id)) {
      if (keep?.userId != null && occupancyMap?.get(id) != null) {
        if (idsMatch(occupancyMap.get(id), keep.userId)) return true;
      }
      return false;
    }

    const occupantFromUnit =
      occupancyMap && occupancyMap.has(id)
        ? occupancyMap.get(id) ?? null
        : getUnitResidentUserId(unit);

    if (occupantFromUnit == null) return true;
    if (keep?.userId != null && idsMatch(occupantFromUnit, keep.userId)) return true;
    return false;
  });
}

export function toUnitSelectOption(unit: any): { id: unknown; name: string; unit_name: string } {
  const label = unit.unit_name || unit.name || '';
  return {
    id: unit.id,
    name: label,
    unit_name: label,
  };
}

/** @deprecated kept for tests / callers that only need key detection */
export function unitHasOccupancySignal(unit: unknown): boolean {
  if (!unit || typeof unit !== 'object') return false;
  const row = unit as Record<string, unknown>;
  return ['user_id', 'assigned_user', 'assignedUser', 'user', 'client', 'resident', 'tenant', 'assignee'].some(
    key => Object.prototype.hasOwnProperty.call(row, key),
  );
}

export function unitsPayloadHasOccupancySignals(units: unknown[]): boolean {
  return units.some(unitHasOccupancySignal);
}
