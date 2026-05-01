# CasaZero Admin Dashboard — Focused Review (Web Console Only)

This document reviews **only the admin web console**: shell (`AdminLayout`), navigation, **role-based access**, and **operational features** implemented under `src/components/admin/` and `src/utils/rbac.ts`. The resident **mobile shell** (`App.tsx` bottom nav, `BottomNav`, mobile screens) is **out of scope**.

---

## 1. What “admin dashboard” means in this codebase

The dashboard is rendered by **`AdminApp`** (`src/components/admin/AdminApp.tsx`), mounted from **`App.tsx`** when the login API returns a role classified as an admin dashboard user (`admin`, `superadmin`, `super_admin`, legacy spellings).

**Shell components**

| Component | Role |
|-----------|------|
| `AdminLayout` | Frame: sidebar (desktop), sheet sidebar (mobile), header, scrollable main, footer |
| `AdminSidebar` | Primary navigation; **filtered by RBAC** |
| `AdminHeader` | Language (IT/EN), user menu, logout, hamburger on small screens |
| `AdminFooter` | Footer strip |

**Session for RBAC**

- `sessionUser` is built with **`resolveSessionUser(userData)`**, which **merges** React `userData` with **`localStorage` `casazero_user`** so role and `residences` survive partial props or refresh.
- All dashboard role checks should go through **`src/utils/rbac.ts`**, not `src/utils/permissions.ts` (the latter targets the mobile permission matrix).

---

## 2. Role model (dashboard layer)

### 2.1 Normalized roles

`rbac.ts` collapses API noise into two dashboard roles:

- **`superadmin`** — portfolio / system operators (full menu and protected routes).
- **`admin`** — **condominium administrator** (single-building scope; reduced menu and page allowlist).

Normalization accepts strings or nested role objects (`slug`, `name`, `value`, etc.) and variants such as `super_admin`, `superadministrator`.

### 2.2 Detection helpers

- **`isSuperAdmin(user)`** — normalized role is `superadmin`.
- **`isAdmin(user)`** — normalized role is **`admin`** (condo admin only, not superadmin).

There is **no third dashboard tier** in code: everything that is not explicitly normalized as `admin` or `superadmin` falls through `normalizeRbacRole` → `null`, which affects `ProtectedRoute` (see below).

### 2.3 Page allowlist for condominium admins

**`SUPERADMIN_ONLY_ADMIN_PAGES`** (`rbac.ts`) lists routes condo admins **must not** use:

- `dashboard`, `users`, `document-list`, `documents`, `support-list`, `company-list`, `construction-phases`, `assign-residences`, `analytics`, `notifications`, `settings`, `buildings`

**Allowed for condo admins** (`canCondominiumAdminAccessPage`):

- `residence-list` / `residences`, `units`, `maintenance-list`
- `condominium-chat` and dynamic `condominium-chat-<id>`

So the product decision is clear: **condo admins manage their building(s), units, maintenance, and scoped chat**; **they do not get** global user management, document management subtree, support tickets list, companies, construction phases, assign-residences, or the overview dashboard in the SPA.

### 2.4 `ProtectedRoute` (superadmin-only content)

Used as `superadminOnly(...)` in `AdminApp`: wraps children with `roles={['superadmin']}`.

**Access rule** (simplified):

- Allow if normalized role is **`superadmin`**, **or**
- Allow if the route is superadmin-only **and** the user is **not** explicitly **`admin`** (condo admin).

**Implication:** Users whose role **does not normalize** to `admin` or `superadmin` are **not** `explicitlyCondoAdmin`, so they may still pass the second branch and see **superadmin-only UI**. That is effectively **fail-open** for malformed or legacy role payloads. **Backend authorization remains mandatory**; the SPA should ideally **fail closed** or map unknown roles to the most restrictive tier explicitly.

### 2.5 `AdminSidebar` vs `sessionUser`

- If **`sessionUser` is falsy** **or** user is **`isSuperAdmin`**: show the **full** menu (dashboard, residences subtree with construction phases, documents, maintenance, support, chat, companies, users).
- If **`isAdmin(sessionUser)`** (condo admin): show **reduced** menu — residences + units only (no construction phases), maintenance, condominium chat submenu from **`sessionUser.residences`** or **`CHAT_MOCK_RESIDENCES`**.

**Gap:** **`!sessionUser` behaves like superadmin navigation** (full tree). If `AdminApp` ever rendered without hydrated `userData`/`localStorage`, the UI would **over-advertise** routes the user cannot complete on the API side. Prefer defaulting missing session to **minimum** navigation or a blocking “session loading / invalid” state.

### 2.6 Navigation guards in `AdminApp`

1. **`useLayoutEffect`** — If **`isAdmin(sessionUser)`** and current page is not allowed, **`setCurrentPage('residence-list')`**.
2. **`handleNavigate`** — Same check before accepting a sidebar navigation.
3. **Chat** — For dynamic chat pages, **`canAccessChatResidence(sessionUser, residenceId)`**: condo admins only see chats for residences listed on their session; **empty `residences` array → allow all** (`return true`). That avoids locking out users when the API omits residences, but it **widens access** unless the backend enforces chat scope.

### 2.7 Initial landing page

```ts
const [currentPage, setCurrentPage] = useState<AdminPage>(() =>
  isAdmin(sessionUser) ? 'residence-list' : 'dashboard',
);
```

Superadmin lands on **`dashboard`**; condo admin on **`residence-list`**. Aligns with who may open the dashboard route.

---

## 3. Feature-by-feature functionality (admin)

Below is what the admin router actually mounts (**`renderContent`** in `AdminApp`), grouped by RBAC.

### 3.1 Superadmin-only (`ProtectedRoute` + sidebar)

| Page ID | Feature | Notes |
|---------|---------|--------|
| `dashboard` | **AdminDashboard** | KPI cards from **`POST …/admin-dashboard/overview`** (`api_token`); trend % and **recent activity** are **static mock** — not API-driven |
| `users` | **UserList** + **UserForm** modal | Create (multipart **`/user/create`**), update (JSON **`/user/update`**), **`client` → `resident`** mapping for API; post-create residence/unit sync via optional second update |
| `document-list` | **DocumentList** + **DocumentForm** | Fetch/edit uses **`GET …/signle/documents/:id`** (typo vs `single` — verify backend) |
| `documents` | **DocumentsScreen** (`role="admin"`) | Reuse of mobile-oriented screen inside admin shell |
| `construction-phases` | **ConstructionPhasesList** | |
| `assign-residences` | **AssignResidences** | |
| `support-list` | **SupportList** + **SupportForm** | Update path calls API; **create** path appears **stubbed** (timeout + toast) — verify intended behavior |
| `company-list` | **CompanyList** | |
| `buildings` | **BuildingManagementScreen** | Legacy/alternate building UX vs `residence-list` |
| `maintenance` | **MaintenanceScreen** | Same pattern as documents — embedded mobile screen |
| `analytics` | **AnalyticsScreen** | |
| `notifications` | **NotificationsScreen** | |
| `settings` | Placeholder copy only | |

**Embedded “superadmin” screens** reuse components that were built for the mobile metaphor (`BuildingManagementScreen`, `DocumentsScreen`, etc.). Functionally workable but UX/visual consistency with the rest of the admin desk may vary.

### 3.2 Condo admin **and** superadmin

| Page ID | Feature | Notes |
|---------|---------|--------|
| `residence-list` / `residences` | **ResidenceList** + **ResidenceForm** | Create **`POST /residences/store`**; update **`POST /residences/update/:id`**; edit prefetch **`GET /single_residence/:id`** with normalization for `residence_admin` |
| `units` | **UnitManagementList** + **UnitForm** | **`/unit_store`**, **`/unit_update`**; filters by **`filteredResidenceId`** auto-set when condo admin session has exactly **one** residence |
| `maintenance-list` | **MaintenanceList** + **MaintenanceForm** | Filter by residence when drilling from residence list |

### 3.3 Chat

- **CondominiumChat** — legacy/general entry.
- **CondominiumChatPage** — per residence; IDs like `condominium-chat-1` parsed from **`parseResidenceIdFromChatPage`** in **`chatMockData`**.

Cross-links from units (**upload document**, **view documents**) open **superadmin-only** document flows; condo admins restricted from those pages cannot use the same drill-down unless product adds a condo-safe document path.

### 3.4 User form RBAC vs API roles

**RoleSelect / `userFormRoleUtils`**: canonical form roles **`resident` | `admin` | `super_admin`**; **`client`** normalizes to **`resident`** for display/rules; **`super_admin`** omits residence (and unit) in payloads when syncing to API.

This is **administration of roles**, separate from **`DashboardRbacRole`**: creating a **`super_admin` user via API does not rename the dashboard **`superadmin`** normalizer**, but **`isAdminDashboardRole`** in `App.tsx` still sends those users into **this same AdminApp**.

---

## 4. Strengths

1. **Clear separation** between superadmin-only pages (**central Set + `ProtectedRoute` + navigation handlers**) and condo admin allowlist — easy to audit in **`rbac.ts`**.
2. **Sidebar duplication of policy** mirrors the Set, reducing accidental orphan links for condo admins (except **`!sessionUser`** case).
3. **Session merge** (`resolveSessionUser`) is pragmatic for SPA refresh.
4. **Real integrations** for core entities (users, residences, units, documents, maintenance, overview) with shared **`API_BASE`** and **`safeJsonParse`** for robust JSON handling.
5. **Chat residence guard** encodes multi-tenant intent for condo admins when `residences` is populated.

---

## 5. Gaps, risks, and recommendations

### 5.1 Security and authorization

- **Client-only RBAC**: All restrictions are UI-level. Every write API must reject unauthorized roles and scope data by building/residence server-side.
- **`ProtectedRoute` fail-open** for non-`admin` users on superadmin routes: document explicitly and consider treating **`normalizeRbacRole === null`** as **no elevated access** (or force re-login).
- **Chat `canAccessChatResidence`**: empty residences allows all IDs — tighten if the API always should send assignments.

### 5.2 Session and sidebar

- **`!sessionUser` ⇒ full menu**: Prefer **loading** or **restricted** menu until user is resolved from memory + `localStorage`.

### 5.3 Product / UX consistency

- **AdminDashboard** quick actions and stat cards deep-link to **`users`**, **`residence-list`**, **`document-list`** — correct for superadmin; condo admin never sees this page, so no conflict, but **duplicate “building” concepts** (`residence-list` vs `buildings` screen) may confuse maintainers.
- **Recent activity** and **trend badges** on the dashboard are **placeholders** — either wire to API or label as demo to avoid misleading operators.

### 5.4 Code quality and maintainability

- **`AdminApp.tsx`** is very large (routing, all save handlers, filters). Splitting by domain (**users**, **residences**, **documents**, etc.) or custom hooks would improve testing and onboarding.
- **Verbose `console.log`** across save paths: strip or guard with `import.meta.env.DEV` for production builds.
- **Typos / API paths**: **`signle/documents`** should be verified against the real endpoint name.

### 5.5 Incomplete flows

- **Support ticket creation** in admin appears **simulated** while update hits the API — confirm roadmap and user messaging.
- **Settings** is a stub — fine if intentional; otherwise track as backlog.

---

## 6. Summary table: who can open what

| Area | Superadmin | Condominium admin (`admin`) |
|------|------------|-----------------------------|
| Dashboard overview | Yes | No (redirect to residence list) |
| User management | Yes | No |
| Document list / doc screen | Yes | No |
| Support list | Yes | No |
| Companies, construction phases, assign residences | Yes | No |
| Analytics, notifications, settings | Yes | No |
| Residences / units | Yes | Yes |
| Maintenance list | Yes | Yes |
| Condominium chat | Yes (all / mock list) | Yes, scoped to `residences` when provided |

---

*This review is based on static analysis of the repository; live API behavior was not executed.*
