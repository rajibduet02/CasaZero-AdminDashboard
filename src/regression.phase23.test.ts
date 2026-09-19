import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_HOST } from './utils/api';

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Phase 2 — code splitting & table regressions', () => {
  it('keeps AdminApp screens lazy-loaded', () => {
    const source = readSrc('src/components/admin/AdminApp.tsx');
    expect(source).toMatch(/const UserList = lazy\(/);
    expect(source).toMatch(/const ResidenceList = lazy\(/);
    expect(source).toMatch(/const MaintenanceList = lazy\(/);
    expect(source).toMatch(/Suspense/);
  });

  it('keeps App-level AdminApp lazy-loaded', () => {
    const source = readSrc('src/App.tsx');
    expect(source).toMatch(/const AdminApp = lazy\(/);
  });

  it('does not reintroduce motion.tr or index-based row delays in large admin lists', () => {
    const lists = [
      'src/components/admin/UserList.tsx',
      'src/components/admin/ResidenceList.tsx',
      'src/components/admin/UnitManagementList.tsx',
      'src/components/admin/DocumentList.tsx',
      'src/components/admin/MaintenanceList.tsx',
      'src/components/admin/SupportList.tsx',
      'src/components/admin/CompanyList.tsx',
      'src/components/admin/ConstructionPhasesList.tsx',
    ];

    for (const file of lists) {
      const source = readSrc(file);
      expect(source, file).not.toMatch(/motion\.tr/);
      expect(source, file).not.toMatch(/delay:\s*0\.05\s*\*\s*index/);
    }
  });

  it('keeps Units list free of per-unit /single/user fetches', () => {
    const source = readSrc('src/components/admin/UnitManagementList.tsx');
    expect(source).not.toMatch(/\/single\/user\//);
    expect(source).toMatch(/fetchUsersCatalog/);
  });

  it('memoizes LanguageContext t and provider value', () => {
    const source = readSrc('src/utils/LanguageContext.tsx');
    expect(source).toMatch(/const t = useCallback/);
    expect(source).toMatch(/const value = useMemo/);
    expect(source).toMatch(/casazero_language/);
  });
});

describe('Phase 2/3 — Firebase presence gating & security config', () => {
  it('gates presence on messenger open and keeps conversation listener independent', () => {
    const messenger = readSrc('src/components/admin/messenger/useMessenger.ts');
    const conversations = readSrc('src/hooks/useConversations.ts');

    expect(messenger).toMatch(/if \(!isOpen \|\| adminId == null \|\| !firebaseReady\) return/);
    expect(messenger).toMatch(/setUserPresence\(adminId, false\)/);
    expect(conversations).toMatch(/enabled: listEnabled && firebaseReady/);
    expect(conversations).toMatch(/Conversation snapshots stay active/);
  });

  it('preserves VITE_API_HOST configuration source', () => {
    const source = readSrc('src/utils/api.ts');
    expect(source).toMatch(/import\.meta\.env\.VITE_API_HOST/);
    expect(API_HOST.length).toBeGreaterThan(0);
    expect(API_HOST).not.toMatch(/\/$/);
  });

  it('does not put api_token in query strings in API helpers', () => {
    const source = readSrc('src/utils/api.ts');
    expect(source).not.toMatch(/\?api_token=/);
    expect(source).not.toMatch(/api_token=/);
  });

  it('keeps production security headers in public/.htaccess', () => {
    const htaccess = readSrc('public/.htaccess');
    expect(htaccess).toMatch(/Content-Security-Policy/);
    expect(htaccess).toMatch(/X-Content-Type-Options/);
    expect(htaccess).toMatch(/Referrer-Policy/);
    expect(htaccess).toMatch(/Permissions-Policy/);
    expect(htaccess).toMatch(/Strict-Transport-Security/);
    expect(htaccess).toMatch(/frame-ancestors 'none'/);
    expect(htaccess).toMatch(/RewriteRule \^ index\.html/);
  });
});
