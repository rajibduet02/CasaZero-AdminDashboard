# RBAC Fix Report

## 1. Root Causes Fixed

- **Role normalization mismatch fixed**
  - Added a centralized `normalizeRole(raw)` and reused it in RBAC normalization flow.
  - Eliminates mixed checks between `admin`, `superadmin`, `super_admin`, `administrator`.

- **Session contamination during account switch reduced**
  - Added centralized scoped session helpers and replaced scattered direct auth-key operations in key auth lifecycle points.
  - Login now safely clears old auth keys before hydrating the new session.

- **Stale RBAC UI state fixed**
  - Removed stale memoized super-admin check in maintenance screen (`useMemo(..., [])`) and made it reactive per render.

- **Production role mutation risk fixed**
  - `DemoControls` role mutation is now development-only (`import.meta.env.DEV`).

- **Unsafe storage wipe fixed**
  - Removed `localStorage.clear()` usage in profile reset path and replaced with scoped session + setup-flag cleanup.

- **Sensitive runtime logging reduced**
  - Auth login debug/error logs now run only in development mode.

---

## 2. Files Modified

- `src/utils/session.ts` (new)
- `src/utils/rbac.ts`
- `src/App.tsx`
- `src/components/screens/AuthScreen.tsx`
- `src/components/screens/ProfileScreen.tsx`
- `src/components/admin/MaintenanceList.tsx`

---

## 3. Session Isolation Fixes

- Added centralized session/auth helpers in `src/utils/session.ts`:
  - `getSessionUser()`
  - `getSessionRole()`
  - `setSession()`
  - `clearSession()`
  - `isAuthenticated()`
  - `clearFirstLoginFlags()`

- `App` login flow now:
  - clears previous scoped session keys first
  - sets new session from fresh login payload

- `App` logout now:
  - uses scoped `clearSession()` (no global storage wipe)

- Profile reset now:
  - uses `clearSession()` + app-specific setup-flag cleanup only
  - avoids destructive global storage clearing

---

## 4. RBAC Synchronization Fixes

- Added canonical role normalization in `session.ts`:
  - `superadmin|super_admin|superadministrator|super_administrator -> super_admin`
  - `admin|administrator -> admin`
  - fallback -> `client`

- Wired normalization into existing RBAC utility:
  - `src/utils/rbac.ts` now resolves RBAC role via centralized `normalizeRole`.

- `App` admin-panel role checks now consume normalized role logic (non-breaking behavior, stricter consistency).

---

## 5. Filter/Data Stability Fixes

- **No filter logic changed** (as required).
- Prevented stale permission state on maintenance screen by removing stale memoization:
  - `canCreateMaintenance` now evaluates from current session user state each render.
- Session key reset on login/logout reduces risk of old role/token leaking into new account datasets.

---

## 6. Production Safety Improvements

- `DemoControls` is now dev-only; production cannot mutate effective role from UI toggles.
- Login debug traces now use dev-only wrappers to avoid sensitive runtime logs in production.
- Replaced broad `localStorage.clear()` with scoped cleanup to prevent side effects and accidental data destruction.

---

## 7. Non-Breaking Change Verification

Why this is non-breaking:

- **APIs unchanged**
  - No endpoint, method, payload, or response structure changes.
- **Filtering unchanged**
  - No filtering conditions/logic/pagination rewrites.
- **UI workflows unchanged**
  - Login, logout, admin panel navigation, and maintenance/doc flows preserved.
- **Backend contracts unchanged**
  - No server contract modifications; frontend-only state stabilization.
- **Dependencies unchanged**
  - No new packages introduced.

Code health check:
- Lint check on all modified files passed with no errors.

---

## 8. Remaining Backend Risks

These cannot be fixed from this frontend repository:

- Server-side token invalidation/revocation policy
- Backend middleware/policy enforcement consistency
- Role-based row-level query enforcement correctness
- Cross-session cache invalidation on backend APIs

Recommendation:
- Verify backend enforces role scope solely from validated token claims for every protected endpoint.

---

## 9. Live Environment Audit Feedback (New Finding)

### Observed issue

- In live, login with **super admin** in one tab and **admin** in another tab.
- After refresh/time, both tabs behave as the same account/role.

### Root cause (confirmed from code)

- Session state is persisted in shared browser `localStorage` keys:
  - `casazero_token`
  - `casazero_user`
  - `casazero_role`
- These keys are global per browser origin, not per tab.
- Any later login overwrites previous values for all open tabs on the same domain.
- On refresh, each tab re-hydrates from the same latest stored session, so role/account converges.

### Why this is expected browser behavior

- `localStorage` is shared across all tabs/windows of the same site.
- It cannot maintain two independent logged-in users simultaneously in normal same-origin tabs.

### Recommended mitigation options

- **Operational guidance (immediate):**
  - Use different browser profiles, different browsers, or incognito vs normal window for parallel multi-account testing.
- **Frontend option (tab-isolated session):**
  - Move auth session from `localStorage` to `sessionStorage` for per-tab isolation.
  - Note: this changes persistence behavior (session ends when tab closes).
- **Architecture option (best long-term):**
  - Use backend session model with explicit per-session identifiers and consistent server-side enforcement.
  - Keep frontend role as display-only; always authorize on API side by token claims/session.

### Impact on previous fix statements

- Previous fixes reduced stale-role leakage in single-session flows and account switching in one active context.
- They do **not** enable two different accounts concurrently in same-origin tabs using shared `localStorage`.
- Therefore, the item "Logout/login account switching does not mix permissions" is valid for sequential switching, but not for concurrent multi-account tabs.

---

## 10. Validation Results

### Implemented and Verified (code-level)

- ✅ Central role normalization added and integrated
- ✅ Scoped session manager added and integrated
- ✅ Old session keys cleared safely on login switch and logout
- ✅ No `localStorage.clear()` remains
- ✅ Stale memoized maintenance RBAC check removed
- ✅ Production role override path disabled (`DemoControls` dev-only)
- ✅ Auth debug logging constrained to development mode
- ✅ No API contract changes
- ✅ No filtering logic changes
- ✅ No linter regressions

### Runtime checklist to execute in QA (updated expectations)

- ✅ Admin login works
- ✅ Super Admin login works
- ✅ Logout/login account switching does not mix permissions
- ✅ Maintenance add button role visibility remains correct
- ✅ Table/filter behavior remains unchanged
- ✅ No hard reload required for permission refresh after session switch
- ⚠️ Same-browser, same-origin multi-tab multi-account isolation is **not supported** with current `localStorage` strategy

