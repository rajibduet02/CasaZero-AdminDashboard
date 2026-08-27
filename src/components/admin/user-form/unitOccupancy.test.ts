import { describe, expect, it } from 'vitest';
import {
  buildUnitOccupancyMap,
  collectOccupiedUnitIdsFromUsers,
  filterUnitsAvailableForResidentAssignment,
  getUnitResidentUserId,
  unitIdsFromApiUser,
  unitsPayloadHasOccupancySignals,
} from './unitOccupancy';

describe('getUnitResidentUserId', () => {
  it('treats units without assignment fields as vacant', () => {
    expect(getUnitResidentUserId({ id: 1, unit_name: 'A1' })).toBeNull();
  });

  it('reads user_id as the resident assignment', () => {
    expect(getUnitResidentUserId({ id: 1, user_id: 42 })).toBe(42);
  });

  it('does not treat building-admin user_id as occupancy', () => {
    expect(
      getUnitResidentUserId({
        id: 1,
        user_id: 9,
        residence: { residence_admin: 9 },
      }),
    ).toBeNull();
  });

  it('reads nested assigned_user as occupancy', () => {
    expect(
      getUnitResidentUserId({
        id: 1,
        assigned_user: { id: 7, user_name: 'Resident' },
      }),
    ).toBe(7);
  });
});

describe('unitIdsFromApiUser / collectOccupiedUnitIdsFromUsers', () => {
  it('reads unit_id and units[].unit_id / units[].id', () => {
    expect(unitIdsFromApiUser({ unit_id: 5, units: [{ id: 119, unit_name: 'Webpro' }] }).sort()).toEqual([
      '119',
      '5',
    ]);
    expect(unitIdsFromApiUser({ units: [{ unit_id: 10 }] })).toEqual(['10']);
  });

  it('collects occupied units only from residents, excluding the edited user', () => {
    const users = [
      { id: 1, role: 'resident', units: [{ id: 119 }] },
      { id: 2, role: 'client', units: [{ unit_id: 120 }] },
      { id: 3, role: 'admin', units: [{ id: 121 }] },
      { id: 4, role: 'resident', unit_id: 122 },
    ];
    expect(Array.from(collectOccupiedUnitIdsFromUsers(users)).sort()).toEqual(['119', '120', '122']);
    expect(Array.from(collectOccupiedUnitIdsFromUsers(users, 1)).sort()).toEqual(['120', '122']);
  });
});

describe('filterUnitsAvailableForResidentAssignment', () => {
  const units = [
    { id: 1, unit_name: 'Vacant' },
    { id: 2, unit_name: 'Taken' },
    { id: 3, unit_name: 'Mine' },
  ];

  it('hides units that residents already occupy (primary path)', () => {
    const occupied = new Set(['2', '3']);
    expect(
      filterUnitsAvailableForResidentAssignment(units, undefined, undefined, occupied).map(u => u.id),
    ).toEqual([1]);
  });

  it('keeps the current user unit in edit mode even when occupied', () => {
    const occupied = new Set(['2', '3']);
    expect(
      filterUnitsAvailableForResidentAssignment(units, { unitId: 3, userId: 99 }, undefined, occupied).map(
        u => u.id,
      ),
    ).toEqual([1, 3]);
  });

  it('still filters via unit row user_id when occupied set is empty', () => {
    const withUserId = [
      { id: 1, unit_name: 'Vacant', user_id: null },
      { id: 2, unit_name: 'Taken', user_id: 10 },
    ];
    expect(filterUnitsAvailableForResidentAssignment(withUserId).map(u => u.id)).toEqual([1]);
  });

  it('uses occupancy map when unit_by_residence rows omit assignment fields', () => {
    const bare = [
      { id: 1, unit_name: 'A' },
      { id: 2, unit_name: 'B' },
    ];
    const occupancyMap = buildUnitOccupancyMap([
      { id: 1, user_id: null },
      { id: 2, user_id: 10 },
    ]);
    expect(filterUnitsAvailableForResidentAssignment(bare, undefined, occupancyMap).map(u => u.id)).toEqual([
      1,
    ]);
  });
});

describe('unitsPayloadHasOccupancySignals', () => {
  it('detects presence of assignment keys', () => {
    expect(unitsPayloadHasOccupancySignals([{ id: 1, unit_name: 'A' }])).toBe(false);
    expect(unitsPayloadHasOccupancySignals([{ id: 1, unit_name: 'A', user_id: null }])).toBe(true);
  });
});
