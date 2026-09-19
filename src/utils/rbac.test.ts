import { describe, expect, it } from 'vitest';
import {
  canCondominiumAdminAccessPage,
  getSafeRole,
  isAdmin,
  isSuperAdmin,
  normalizeRbacRole,
  SUPERADMIN_ONLY_ADMIN_PAGES,
  ADMIN_ONLY_ADMIN_PAGES,
} from './rbac';

describe('RBAC', () => {
  it('normalizes superadmin and admin role spellings', () => {
    expect(normalizeRbacRole('superadmin')).toBe('superadmin');
    expect(normalizeRbacRole('super_admin')).toBe('superadmin');
    expect(normalizeRbacRole('Super Administrator')).toBe('superadmin');
    expect(normalizeRbacRole('admin')).toBe('admin');
    expect(normalizeRbacRole('client')).toBe('unknown');
  });

  it('fail-closes unknown roles to restricted (admin) tier via getSafeRole', () => {
    expect(getSafeRole({ role: 'superadmin' })).toBe('superadmin');
    expect(getSafeRole({ role: 'admin' })).toBe('admin');
    expect(getSafeRole({ role: 'client' })).toBe('admin');
    expect(getSafeRole(null)).toBe('admin');
  });

  it('identifies superadmin vs condominium admin', () => {
    expect(isSuperAdmin({ role: 'super_admin' })).toBe(true);
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'superadmin' })).toBe(false);
  });

  it('allows condominium admin on permitted pages only', () => {
    expect(canCondominiumAdminAccessPage('dashboard')).toBe(true);
    expect(canCondominiumAdminAccessPage('residences')).toBe(true);
    expect(canCondominiumAdminAccessPage('units')).toBe(true);
    expect(canCondominiumAdminAccessPage('residence-wise-maintenances')).toBe(true);
    expect(canCondominiumAdminAccessPage('condominium-chat')).toBe(true);
    expect(canCondominiumAdminAccessPage('condominium-chat-12')).toBe(true);

    for (const page of SUPERADMIN_ONLY_ADMIN_PAGES) {
      expect(canCondominiumAdminAccessPage(page)).toBe(false);
    }
  });

  it('allows residence-wise maintenances for both roles (shared residence-scoped module)', () => {
    expect(ADMIN_ONLY_ADMIN_PAGES.has('residence-wise-maintenances')).toBe(false);
    expect(SUPERADMIN_ONLY_ADMIN_PAGES.has('residence-wise-maintenances')).toBe(false);
    expect(canCondominiumAdminAccessPage('residence-wise-maintenances')).toBe(true);
  });
});
