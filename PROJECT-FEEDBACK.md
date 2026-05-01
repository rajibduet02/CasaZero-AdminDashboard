# CasaZero Admin Dashboard — Project & Role Management Feedback

This document summarizes an end-to-end review of the **CasaZero-AdminDashboard** codebase: architecture, product functionality, and especially **role-based access control (RBAC)**. It is intended as actionable feedback for maintainers, not as user documentation.

---

## 1. Executive summary

The repository is a **Vite + React 18 + TypeScript** SPA that combines:

1. A **mobile-style resident experience** (bottom navigation, CasaZero-branded screens).
2. A **desktop admin console** (`AdminApp`) for operations staff, gated primarily by the API-reported user role.

RBAC is implemented in **two parallel systems**:

- **`src/utils/permissions.ts`** — fine-grained boolean flags for the **mobile shell**, keyed off a simplified `Role` type (`client` | `admin`).
- **`src/utils/rbac.ts`** + **`ProtectedRoute`** + **`AdminSidebar`** — **dashboard-level** separation between **superadmin** and **condominium admin** (`admin`), aligned with backend-style role strings.

Strengths include a clear condominium-admin page allowlist, sidebar filtering, and chat residence scoping. Weaknesses include **documentation and types drifting from implementation**, **several TypeScript/logic inconsistencies around a hypothetical “super-admin” mobile role**, and **client-only enforcement** (expected for SPAs, but worth stating explicitly).

---

## 2. Technical stack & structure

| Area | Choice |
|------|--------|
| Build | Vite 6, `@vitejs/plugin-react-swc` |
| UI | React 18, Tailwind-style utility classes, Radix primitives, `motion`, Recharts, Sonner |
| State | Local React state in `App.tsx` and `AdminApp.tsx` (no global auth store) |
| API | `fetch` to `https://smarthome.attoexasolutions.com/api` via `API_BASE` (`src/utils/api.ts`) |
| i18n | `LanguageProvider` / `useLanguage` (`src/utils/LanguageContext.tsx`) |

**High-level layout**

- `src/App.tsx` — authentication, URL sync (`/login`, `/account-setup`, `/dashboard`, `/`), choice between **AdminApp** vs mobile routes.
- `src/components/admin/*` — admin layout, CRUD lists/forms, RBAC-aware routing.
- `src/components/screens/*` — resident-oriented screens reused in demos or as embedded views.
- `src/components/casazero/*` — shared shell pieces (AppBar, BottomNav, demo controls).
- `src/utils/permissions.ts`, `src/utils/rbac.ts` — permission models (see below).

---

## 3. Authentication & session model

- **Login**: `AuthScreen` posts to `POST /user/web_login` with email/password; on success stores **`casazero_token`** and **`casazero_user`** in `localStorage`.
- **First login**: Users with `is_password_set_by_admin` are forced through `FirstLoginSetupScreen`; completion is tracked per email via `casazero_setup_<email>`.
- **Role routing**: `isAdminDashboardRole()` treats `admin`, `superadmin`, `super_admin`, and legacy spellings as **“open admin dashboard”**. All of these are collapsed to mobile role **`admin`** in `appRoleFromLoginApi()` for `permissions.ts` usage.

**Feedback**

- **Security**: Tokens and profile JSON in `localStorage` are standard for SPAs but vulnerable to XSS; ensure CSP, dependency hygiene, and server-side authorization on every mutation.
- **`AuthScreen.tsx`**: Default state includes **hardcoded email/password** values. These should not ship to production builds; use env-only test accounts or empty defaults.
- **Logging**: Login and many admin flows log detailed payloads (sometimes partial passwords). Reduce or gate behind a dev flag before production hardening.

---

## 4. Role management — how it actually works

### 4.1 Three “role vocabularies” (important)

The codebase uses **different role enums/strings** in different layers:

| Layer | Canonical values | Purpose |
|-------|------------------|---------|
| Mobile permissions (`permissions.ts`) | `client`, `admin` | `getPermissions()`, BottomNav, many screens |
| Dashboard RBAC (`rbac.ts`) | `superadmin`, `admin` (normalized from API) | Sidebar, `ProtectedRoute`, page allowlist |
| User form / API mapping (`userFormRoleUtils.ts`) | `resident`, `admin`, `super_admin` | Create/update user; `client` → `resident` for API |

This split is **reasonable** (UI vs API naming), but it increases onboarding cost and bug risk when documentation refers to a third naming scheme (`super-admin` with hyphen in prose and some UI branches).

### 4.2 Dashboard RBAC (strong point)

`src/utils/rbac.ts` defines:

- **`isSuperAdmin` / `isAdmin`** via `normalizeRbacRole()` on flexible API shapes (string or nested role object).
- **`SUPERADMIN_ONLY_ADMIN_PAGES`** — pages condominium admins must not access (dashboard, users, global documents list, support list, companies, analytics, etc.).
- **`canCondominiumAdminAccessPage()`** — explicit allowlist for condo admins: residences, units, maintenance list, condominium chat pages.

`AdminApp` applies:

- **`useLayoutEffect`** — if the user is a condominium admin and lands on a forbidden page, redirect to **`residence-list`**.
- **`ProtectedRoute`** — wraps superadmin-only sections; if unauthorized, redirects and renders nothing.

**`ProtectedRoute` nuance**: Access is allowed if `roles.includes('superadmin')` **and** the user is **not** explicitly `admin`, **or** if normalized role matches. That means **unknown / unrecognized roles may receive superadmin-level UI** unless the backend normalizes every account to `admin` or `superadmin`. Treat this as **fail-open for unusual payloads** — verify against product intent.

**Chat scoping**: `canAccessChatResidence()` restricts condominium admins to residences present on their session object; others pass through. Clear and appropriate.

### 4.3 Mobile `permissions.ts` (concept vs implementation)

The file documents **two roles** but defines helpers (`getRoleLabel`, `getRoleBadgeColor`) that reference **`super-admin`**, which is **not** in the `Role` union type. Several screens also branch on `'super-admin'` while props are typed as `Role`.

**Effective behavior today**

- After login, **superadmin API roles become `admin`** in `App.tsx` state for the mobile shell.
- **`getPermissions('admin')`** grants **full mobile permission flags**, including `canRemoveResidents`, `canManageAdmins`, `canSwitchBuildings`, `canViewGlobalScope`, etc.

**Mismatch vs design docs**

`src/ROLE-PERMISSIONS.md` describes a **three-tier** model where **condominium admin** cannot remove residents or manage other admins, and **super-admin** has portfolio-wide powers. The **implemented** `permissions.ts` **`admin`** profile matches **super-admin-style** capability in the mobile matrix (everything toggled on).

**Feedback**

- Either **introduce a distinct mobile role** (e.g. `superadmin` vs `condo_admin`) wired from `userData.role`, **or** align documentation with the **binary** mobile model (`client` vs elevated).
- Unify naming: **`super-admin`** vs **`super_admin`** vs **`superadmin`** appears across MD files, UI strings, and RBAC normalizers — pick one canonical form per layer (display slug vs API slug vs TS literal).

### 4.4 Admin sidebar

`AdminSidebar` builds a **full menu** for superadmin or missing `sessionUser`, and a **reduced menu** for condominium `admin`, omitting construction phases, documents management subtree, support, companies, users, etc. This matches `SUPERADMIN_ONLY_ADMIN_PAGES` well.

---

## 5. Functional overview (what the app does)

### 5.1 Resident / mobile shell (`App.tsx`)

When not in `AdminApp`:

- Tabbed navigation via **`BottomNav`** (home, documents, hub/AI entry, maintenance, profile) driven by **`getPermissions(role)`**.
- Optional **BuildingSelector** for `role === 'admin'` on several screens.
- Screens: home, documents, maintenance, AI/hub, tickets, chat, smart home, profile, notifications, analytics/users/buildings when permissions allow.
- **DemoControls** can flip role between client and admin for UX testing.
- Floating actions: switch into **Admin Panel** when `role === 'admin'`.

### 5.2 Admin console (`AdminApp.tsx`)

Large surface area with real API integration:

- **Users**: list/create/edit (`UserForm`), multipart create, JSON update, post-create assignment sync.
- **Residences / buildings**: list, create (`/residences/store`), update (`/residences/update/:id`), detail fetch for edit (`/single_residence/:id`).
- **Units**: list/create/update (`unit_store`, `unit_update`).
- **Documents**: list with filters, create/update (`/documents/store`, `/documents/update`), single-document fetch (note typo in code path `signle/documents`).
- **Maintenance**: list + form with API driven from form.
- **Support tickets**: superadmin-only list; save handler mixes real update API and simulated create delay.
- **Companies**, **construction phases**, **assign residences**: superadmin-only.
- **Condominium chat**: per-residence chat pages; mock residence list when session has no residences.
- **Admin dashboard**: overview stats from `POST /admin-dashboard/overview`.

**Feedback**

- **Single-file complexity**: `AdminApp.tsx` is very large (1500+ lines). Splitting handlers by domain (users, residences, documents, …) would improve testability and reviews.
- **API consistency**: Mix of `api_token` in JSON body vs `Bearer` headers vs `token` field — document what the backend expects and normalize helpers.
- **Typo risk**: `/signle/documents/` will break if the server path is spelled differently; worth verifying against API docs.

---

## 6. Concrete issues & inconsistencies

### 6.1 TypeScript / permission model

1. **`permissions.ts`**: `getRoleLabel` / `getRoleBadgeColor` use `case 'super-admin'` while `Role` is only `'client' | 'admin'` — inconsistent and misleading for developers.
2. **`TicketsScreen`**, **`ProfileScreen`**, **`UserManagementScreen`**: branches on `super-admin` and related labels **do not align** with the `Role` type used by `App.tsx` after login (everything elevated is `'admin'`).
3. **`UserManagementScreen`**: uses **`permissions.canEditUsers`** and **`permissions.canSendNotifications`**, which **are not defined** on the `Permissions` interface in `permissions.ts`. At runtime those expressions are **undefined** (falsy), so related UI never appears — likely **unfinished** or **broken**.

### 6.2 Documentation drift

- **`ROLE-PERMISSIONS.md`** / **`PROJECT-ANALYSIS.md`** describe three roles and capability splits that **do not match** `getPermissions('admin')` today.
- **`permissions.ts` header comment** still says “two user roles” but helpers imply three.

### 6.3 RBAC semantics

- **Condominium admin** is well restricted on **pages**.
- **Mobile permissions** do not distinguish condominium vs super admin — if a condominium admin ever used the mobile shell with `role === 'admin'`, they would **see** capabilities in UI that they should not have unless the backend rejects actions.

---

## 7. Recommendations (prioritized)

1. **Align types with reality**  
   - Extend `Role` or introduce `MobileRole` / `SessionTier` that reflects login mapping.  
   - Remove or implement **`super-admin`** branches consistently.

2. **Fix or extend `Permissions`**  
   - Add **`canEditUsers`** and **`canSendNotifications`**, or remove their usage from `UserManagementScreen`.

3. **Reconcile docs**  
   - Update `ROLE-PERMISSIONS.md` to match either **two-tier mobile + two-tier dashboard**, or implement true three-tier permissions in code.

4. **Hardening**  
   - Remove default credentials from `AuthScreen`; reduce verbose logging; confirm **`ProtectedRoute`** fail-open behavior with product/security owners.

5. **Maintainability**  
   - Split `AdminApp.tsx`; centralize API client (auth header, error mapping, `safeJsonParse` usage).

---

## 8. Closing assessment

The project delivers a **feature-rich admin dashboard** with **thoughtful condominium-admin isolation** in the web shell (`rbac.ts`, sidebar, `ProtectedRoute`). The main gap is **consistency**: mobile **`permissions.ts`**, dashboard **`rbac.ts`**, API role strings, and markdown specifications describe **different mental models**. Tightening that alignment—and fixing the missing permission keys—would materially improve correctness, security posture (via clearer enforcement boundaries), and contributor velocity.

---

*Generated from repository analysis; backend behavior was not executed or verified live.*
