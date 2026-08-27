export type { UserFormRole, UserAssignmentPayload } from './userFormRoleUtils';
export {
  normalizeUserFormRole,
  getAssignmentVisibility,
  buildAssignmentPayload,
} from './userFormRoleUtils';
export type { UnitOccupancyKeep } from './unitOccupancy';
export {
  getUnitResidentUserId,
  unitsPayloadHasOccupancySignals,
  buildUnitOccupancyMap,
  collectOccupiedUnitIdsFromUsers,
  unitIdsFromApiUser,
  filterUnitsAvailableForResidentAssignment,
  toUnitSelectOption,
} from './unitOccupancy';
export { RoleSelect } from './RoleSelect';
export type { RoleSelectProps } from './RoleSelect';
export { ResidenceSelect } from './ResidenceSelect';
export type { ResidenceOption, ResidenceSelectProps } from './ResidenceSelect';
export { UnitSelect } from './UnitSelect';
export type { UnitOption, UnitSelectProps } from './UnitSelect';
