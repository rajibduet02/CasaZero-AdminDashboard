# RBAC Audit Report

## Scope and Method

This audit is based on **actual code in this repository** (`CasaZero-AdminDashboard`), with emphasis on the reported conflict sequence:

1. Login as Admin  
2. Login as Super Admin  
3. Observe mixed permissions, mismatched filtering, and inconsistent feature access

I audited auth/session state, role resolution, route/page guards, API auth transport, and table filtering paths.

---

## 1. Root Cause Analysis

### RC-1: Frontend role model collapse causes permission ambiguity
- The app collapses multiple backend roles (`admin`, `superadmin`, `super_admin`) into a single frontend role `'admin'` in the root app state.
- This weakens role semantics and can create mixed UI behavior when switching accounts.

```30:49:src/App.tsx
type Role = 'client' | 'admin';

function appRoleFromLoginApi(raw: string): Role {
  return isAdminDashboardRole(raw) ? 'admin' : 'client';
}
```

Impact:
- Root app-level permissions (`getPermissions(role)`) cannot distinguish Admin vs Super Admin.
- Other modules use stricter role logic (`src/utils/rbac.ts`), causing **inconsistent authorization decisions across the app**.

---

### RC-2: Production-visible role switching controls can mutate effective role client-side
- `DemoControls` is mounted in authenticated runtime and changes `role` directly.
- This is a direct source of session contamination and mixed-permission states.

```633:639:src/App.tsx
<DemoControls
  currentRole={role}
  onRoleChange={handleRoleChange}
  residenceStatus={residenceStatus}
  onResidenceStatusChange={setResidenceStatus}
/>
```

```313:325:src/App.tsx
const handleRoleChange = (newRole: Role) => {
  setRole(newRole);
  if (newRole === 'admin') {
    setIsAdminPanel(true);
    setAdminPage('dashboard');
  } else {
    setIsAdminPanel(false);
  }
};
```

Impact:
- Effective UI permissions are mutable without a new verified backend session.
- Admin/Super Admin context can become mixed in one browser lifecycle.

---

### RC-3: Session reset paths are inconsistent and non-scoped
- Normal logout removes a few keys.
- Profile reset uses `localStorage.clear()` and full reload.

```234:247:src/App.tsx
const handleLogout = () => {
  ...
  localStorage.removeItem('casazero_token');
  localStorage.removeItem('casazero_user');
  localStorage.removeItem('casazero_role');
};
```

```327:331:src/components/screens/ProfileScreen.tsx
onClick={() => {
  localStorage.clear();
  window.location.reload();
}}
```

Impact:
- Inconsistent cleanup behavior during role switching/testing.
- Broad storage wipe may break unrelated persistence and produce non-deterministic app state.

---

### RC-4: Mixed auth contracts across APIs (`Authorization` vs `api_token` payload vs unauthenticated calls)
- Different screens use different authorization patterns.
- Some sensitive calls miss bearer headers entirely.

```317:321:src/components/admin/MaintenanceList.tsx
const response = await fetch(`${MAINTENANCE_LIST_API_URL}?_=${Date.now()}`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ api_token: apiToken }),
});
```

```367:373:src/components/admin/AdminApp.tsx
const response = await fetch(`${API_BASE}/user/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateRequestBody),
});
```

```480:485:src/components/admin/DocumentList.tsx
const response = await fetch(apiUrl, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

Impact:
- Increases chance of backend/frontend drift and role leakage.
- Difficult to guarantee consistent per-role enforcement and auditing.

---

### RC-5: Role-derived UI state in `MaintenanceList` is memoized once and can go stale
- Super-admin-only create permission is computed once with empty deps.

```173:176:src/components/admin/MaintenanceList.tsx
const { t, language } = useLanguage();
const canCreateMaintenance = useMemo(() => isSuperAdmin(readSessionUser()), []);
```

Impact:
- After account/role switch in same runtime, button visibility can remain stale until hard remount.
- Contributes directly to “mixed permissions” symptom.

---

### RC-6: Table filter state and data-source mode mismatch risk in document flow
- `DocumentList` alternates between:
  - API pre-filtered mode (`filterByUnit`)
  - local filter mode (`selectedResidence`, `selectedUnit`, `searchQuery`)
- Local filter states are not fully normalized when entering/leaving unit-scoped mode.

```386:393:src/components/admin/DocumentList.tsx
if (filterByUnit && filterByUnit.unit_id) {
  // already filtered by API
} else {
  // Apply manual filters
```

Impact:
- Users can observe mismatched filter UI expectations vs returned dataset.
- Can appear as RBAC conflict when it is partly state contamination.

---

## 2. Security Risks

- **Critical**: Client-side role mutability (`DemoControls`) allows privilege simulation without backend re-auth.
- **High**: Role collapse in app state (`superadmin -> admin`) causes incorrect permission boundary in UI and route-level logic.
- **High**: Inconsistent auth transport can expose endpoints to weaker enforcement patterns.
- **High**: Extensive debug logging of auth/session metadata (including token fragments) increases leak risk.
- **Medium**: Stale memoized RBAC values can expose/hide privileged actions incorrectly.
- **Medium**: Non-scoped storage clearing causes unpredictable session behavior and recovery paths.

---

## 3. Affected Files

### Frontend
- `src/App.tsx`
- `src/components/screens/AuthScreen.tsx`
- `src/components/screens/ProfileScreen.tsx`
- `src/components/admin/AdminApp.tsx`
- `src/components/admin/MaintenanceList.tsx`
- `src/components/admin/DocumentList.tsx`
- `src/utils/permissions.ts`
- `src/utils/rbac.ts`
- `src/utils/api.ts`
- `src/components/admin/ProtectedRoute.tsx`

### Backend
- **Not present in this repository** (external API at `https://smarthome.attoexasolutions.com/api`).

---

## 4. Code-Level Problems

### Problem A: Incompatible role systems coexist
- `App.tsx` uses `Role = 'client' | 'admin'`.
- `rbac.ts` uses canonical `'superadmin' | 'admin'` with normalization.
- `permissions.ts` type excludes super-admin but helper methods still check `'super-admin'` string.

```9:10:src/utils/permissions.ts
export type Role = 'client' | 'admin';
```

```230:238:src/utils/permissions.ts
export function getRoleLabel(role: Role): string {
  switch (role) {
    ...
    case 'super-admin':
      return 'Super Admin';
```

Why this fails:
- Type/system drift creates hidden branches and inconsistent guards.

---

### Problem B: Auth/session bootstrap includes client-trusted first-login completion

```77:83:src/App.tsx
const needsPasswordChange =
  user.is_password_set_by_admin === 'true' || user.is_password_set_by_admin === true;
const setupDone = email.length > 0 && localStorage.getItem(`casazero_setup_${email}`) === 'true';
const firstLogin = !!(needsPasswordChange && !setupDone);
```

Why this fails:
- Security-critical state is trusted from localStorage, not authoritative backend claims.

---

### Problem C: Sensitive logging in auth flow

```154:165:src/components/screens/AuthScreen.tsx
console.log('📦 [LOGIN] Response data:', {
  ...
  user: data.user ? {
    ...
    api_token: data.user.api_token ? `${data.user.api_token.substring(0, 10)}...` : null,
  } : null
});
```

Why this fails:
- Leaks security data into browser logs.

---

## 5. Recommended Fixes

1. **Unify role model (mandatory)**
   - Canonical roles: `resident | admin | super_admin` (or backend equivalent).
   - Normalize once after login and store normalized role in session manager.
   - Remove root-level role collapse from `App.tsx`.

2. **Disable demo role mutation in production**
   - Guard `DemoControls` behind build flag.
   - In production, effective role must come only from backend session payload.

3. **Centralize session management**
   - Create `sessionManager` for read/write/clear of scoped keys.
   - Remove all direct `localStorage.clear()`.

4. **Centralize API client and auth header injection**
   - One `apiClient` that injects `Authorization: Bearer ...`.
   - Use body `api_token` only where backend contract strictly requires it.
   - Add lint rule/code-review gate for direct `fetch` without auth wrapper.

5. **Make RBAC checks reactive**
   - Replace stale `useMemo(..., [])` role checks with session-context driven reactive values.

6. **Reset filter state on context transitions**
   - In `DocumentList`, clear incompatible local filters whenever `filterByUnit` toggles.
   - Show explicit “server-scoped mode” indicator and disable conflicting filters.

7. **Remove sensitive production logs**
   - Wrap debug logs with environment guard and redact tokens/user PII.

---

## 6. Refactored Code Suggestions

### A. Canonical role normalization

```ts
// src/auth/roles.ts
export type CanonicalRole = 'resident' | 'admin' | 'super_admin';

export function normalizeRole(raw: unknown): CanonicalRole {
  const v = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (v === 'superadmin' || v === 'super_admin' || v === 'super_administrator') return 'super_admin';
  if (v === 'admin' || v === 'administrator') return 'admin';
  return 'resident';
}
```

### B. Session manager (scoped clear)

```ts
const KEY_PREFIX = 'casazero_';
const KEYS = ['casazero_token', 'casazero_user', 'casazero_role'] as const;

export function clearSession() {
  for (const k of KEYS) localStorage.removeItem(k);
}
```

### C. Reactive RBAC in maintenance

```ts
const sessionUser = useSessionUser(); // context/store
const canCreateMaintenance = isSuperAdmin(sessionUser);
```

### D. Production guard for demo tools

```tsx
{import.meta.env.DEV && (
  <DemoControls ... />
)}
```

---

## 7. Session & Token Audit

Findings:
- Token stored in `localStorage` (`casazero_token`).
- Session read from localStorage at startup (`readStoredSession`).
- No token rotation/invalidation logic visible in frontend.
- Mixed auth transport patterns reduce assurance of isolation.

Conclusion:
- **Session isolation is not reliably enforced at architecture level in frontend.**
- Token/session correctness depends heavily on backend strictness (not auditable in this repo).

---

## 8. State Management Audit

Findings:
- No centralized auth store; state spread across `App.tsx` + localStorage reads.
- Demo role state mutates permissions independent of backend identity.
- Local memoized RBAC checks can become stale.
- Filter state mixed with API-pre-filtered modes in table components.

Conclusion:
- **State contamination risk is real and reproducible** during account switching and context toggling.

---

## 9. Database & Permission Audit

Status:
- Backend/database schema not present in this repository.

Cannot verify:
- role-permission DB relationships
- row-level access rules
- policy joins and scoped query enforcement

Required backend checks:
- Confirm role is derived from token subject server-side only.
- Confirm all list endpoints apply per-role and per-residence filtering server-side.
- Confirm no endpoint trusts frontend-passed role for authorization.

---

## 10. Middleware Audit

Status:
- No backend middleware code present in this repository.

Required backend checks:
- Auth middleware must rehydrate user context from token each request.
- Middleware must invalidate revoked/rotated tokens.
- Policy middleware must enforce role and ownership checks after auth.

---

## 11. API Audit

Observed frontend API concerns:
- Inconsistent auth patterns across endpoints.
- Some endpoints called without bearer auth headers.
- Some endpoints use body token pattern.
- Role-scoped behavior partly relies on endpoint contract assumptions.

Required backend API validation:
- Verify every sensitive endpoint rejects missing/invalid token.
- Verify endpoint-specific role checks are server-authoritative.
- Verify response datasets differ correctly for admin vs super admin.

---

## 12. Performance & Cache Audit

Findings:
- Some calls use cache-busting query params (`?_=${Date.now()}`), others do not.
- Mixed filtering modes can appear as stale data due to local state carryover.

Risk:
- Users perceive stale authorization/filter behavior after role switches.

Fix:
- Standardize query invalidation strategy and context-keyed cache/session reset on account changes.

---

## 13. Final Severity Report

### Critical
- Client-side role mutation path (`DemoControls`) active in authenticated runtime.

### High
- Role model collapse (`superadmin` indistinguishable from `admin` at app root).
- Inconsistent authorization transport across APIs.
- Sensitive auth/session logging in production paths.

### Medium
- Stale memoized RBAC checks (`MaintenanceList`).
- Filter state contamination in data tables (`DocumentList`).
- Inconsistent session cleanup strategy.

### Low
- Role type drift/legacy literals in helper functions (`permissions.ts`).

---

## 14. Final Recommended Architecture

Adopt a layered RBAC architecture:

1. **Auth Core**
   - `sessionManager` + `authContext` as single source of truth.
   - Canonical role normalization at login ingress only.

2. **Authorization Core**
   - Shared `can()` policy helpers operating on canonical role + scoped claims.
   - No raw string role checks scattered in UI components.

3. **API Layer**
   - One `apiClient` with:
     - automatic bearer injection
     - standardized error handling
     - request tagging (role/session id for diagnostics)

4. **UI Guarding**
   - Route/component guards consume auth context only.
   - Remove production test toggles that alter role.

5. **Data Isolation**
   - Context-key caches keyed by `sessionUser.id + role + residenceScope`.
   - Clear per-user cache on logout and on account switch.

6. **Backend Contract (must enforce)**
   - Authorization server-side on every sensitive endpoint.
   - Never trust frontend role field for permission checks.
   - Row-level filtering done in backend query layer.

---

## Backend Evidence Gap Statement

This repository does **not** include backend auth/middleware/policy/database code.  
Therefore, sections on JWT generation, token invalidation, DB role relations, and middleware enforcement are provided as required verification checkpoints, not confirmed implementation facts.

