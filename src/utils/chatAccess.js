import { getSessionResidenceAdminId } from './api';
import {
  getSessionRoleRaw,
  isSuperAdmin,
  normalizeRbacRole,
  resolveSessionUser,
} from './rbac';

/**
 * Role label for chat access logs / UI.
 * @returns {'super_admin' | 'admin' | 'unknown'}
 */
export function getChatAccessRole(user) {
  const role = normalizeRbacRole(getSessionRoleRaw(user));
  if (role === 'superadmin') return 'super_admin';
  if (role === 'admin') return 'admin';
  return 'unknown';
}

function residenceIdsFromSession(user) {
  const list = user?.residences;
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => Number(r.residence_id ?? r.id))
    .filter((id) => !Number.isNaN(id));
}

/**
 * Validates whether the logged-in user may open Firestore chat for a residence.
 *
 * Super admin: all residences.
 * Admin: residence must be in API catalog and residence_admin must match session user id.
 *
 * @param {{
 *   sessionUser?: object | null,
 *   residenceId: number | null,
 *   allowedResidences?: Array<{ id: number, residence_admin?: number | null }>,
 * }} params
 */
export function validateChatAccess({
  sessionUser,
  residenceId,
  allowedResidences = [],
  catalogLoading = false,
}) {
  const user = sessionUser ?? resolveSessionUser();
  const role = getChatAccessRole(user);

  console.log('🔐 [CHAT ACCESS] Role:', role);
  console.log('🏢 [CHAT ACCESS] Residence ID:', residenceId);

  if (!user) {
    console.log('❌ [CHAT ACCESS] Access denied — not authenticated');
    return { granted: false, role, reason: 'not_authenticated', pending: false };
  }

  if (catalogLoading && !isSuperAdmin(user)) {
    console.log('⏳ [CHAT ACCESS] Waiting for residence catalog…');
    return { granted: false, role, reason: 'catalog_loading', pending: true };
  }

  if (residenceId == null || Number.isNaN(Number(residenceId))) {
    console.log('❌ [CHAT ACCESS] Access denied — invalid residence');
    return { granted: false, role, reason: 'invalid_residence', pending: false };
  }

  const numericResidenceId = Number(residenceId);

  if (isSuperAdmin(user)) {
    console.log('✅ [CHAT ACCESS] Access granted — super admin (all residences)');
    return { granted: true, role, reason: 'super_admin_all', pending: false };
  }

  const adminId = getSessionResidenceAdminId(user);
  const catalogMatch = allowedResidences.find((r) => Number(r.id) === numericResidenceId);

  if (catalogMatch) {
    const assignedAdmin = catalogMatch.residence_admin;
    if (assignedAdmin != null && adminId != null && Number(assignedAdmin) !== adminId) {
      console.log('❌ [CHAT ACCESS] Access denied — residence_admin mismatch', {
        residence_admin: assignedAdmin,
        session_admin_id: adminId,
      });
      return { granted: false, role, reason: 'residence_admin_mismatch', pending: false };
    }
    console.log('✅ [CHAT ACCESS] Access granted — assigned residence (API catalog)');
    return { granted: true, role, reason: 'assigned_residence', pending: false };
  }

  const sessionIds = residenceIdsFromSession(user);
  if (sessionIds.includes(numericResidenceId)) {
    console.log('✅ [CHAT ACCESS] Access granted — assigned residence (session)');
    return { granted: true, role, reason: 'session_residence', pending: false };
  }

  console.log('❌ [CHAT ACCESS] Access denied — residence not assigned to this admin');
  return { granted: false, role, reason: 'not_assigned', pending: false };
}
