# Dashboard Slowing Issues & Production Readiness

**Project:** CasaZero Admin Dashboard (`CasaZero-AdminDashboard`)  
**Date:** 19 August 2026  
**Scope:** Full frontend codebase (`src/`, Vite config, entry, auth, admin lists, chat, API layer)  
**This document:** performance root causes, production-readiness rating, and a prioritized fix list

---

## 1. Verdict

| Area | Score (out of 10) | Meaning |
|---|---|---|
| **Perceived dashboard speed** | **4.0** | Feels slow on first load and on list pages as data grows |
| **Architecture / maintainability** | **5.5** | Works, but several mega-files and mixed JS/TS |
| **Security / ops hygiene** | **4.5** | Token in `localStorage`, Firebase keys in source, no CSP |
| **Reliability / tests** | **3.0** | No automated tests, no error boundary |
| **Feature completeness (admin)** | **7.0** | Core CRUD, RBAC, routing, chat exist |
| **Overall production readiness** | **5.0 / 10** | **Not production-ready at scale.** Acceptable for a **controlled beta** with small datasets only |

**Bottom line:** The dashboard is slow mainly because it **downloads and animates entire catalogs**, **repeats the same heavy API calls**, and **ships the whole app (admin + resident UI) as one JavaScript bundle**. It is **not** primarily a CSS or layout bug.

---

## 2. Why the dashboard is slow (ranked)

These are the issues that actually cost time on a real admin session. Severity is for typical production data (hundreds of users/units/documents, several residences).

### P0 — Highest impact

#### 2.1 No code splitting: one giant first paint

`src/App.tsx` **statically imports** the admin app **and** every resident screen (home, documents, AI, analytics, tickets, chat, etc.). `src/components/admin/AdminApp.tsx` **statically imports** every list and form.

There is **no** `React.lazy` / `Suspense` anywhere in `src/`.

**Effect:** Opening `/dashboard` still parses resident-app screens, Recharts, large forms (`MaintenanceForm`, `UserForm`, `AssignResidences`), and ~40 Radix UI modules. Time-to-interactive is high even before the overview API returns.

**Where:** `src/App.tsx` (top-level imports), `src/components/admin/AdminApp.tsx` (lines 1–50), `src/main.tsx`.

#### 2.2 Lists fetch **all rows**, then filter in the browser

There is **no server-side pagination** on Users, Residences, Units, Documents, Maintenance, Support, or Companies. The UI pagination component exists (`src/components/ui/pagination.tsx`) but list screens do not use it for API paging.

Each list:

1. Loads the full array into React state.
2. Filters/searches in memory.
3. Renders **every matching row** as a `motion.tr` with staggered `delay: 0.05 * index`.

**Effect:** 200 users ≈ 10 seconds of staggered row animations plus a large DOM. 1,000 rows will lock the main thread.

**Where:**

| Screen | File | Pattern |
|---|---|---|
| Users | `UserList.tsx` | `GET /user/get` → `data.data.map` → `filteredUsers.map` + `AnimatePresence` |
| Residences | `ResidenceList.tsx` | Full catalog, client filter, `motion.tr` per row |
| Units | `UnitManagementList.tsx` | `POST /unit_list` then extra work per unit (see 2.3) |
| Documents | `DocumentList.tsx` | Full list + per-document `console.log` in mapping |
| Maintenance | `MaintenanceList.tsx` | Superadmin: `GET /all_maintenance/admin`; condo: N residence calls |
| Support / companies / phases | `SupportList.tsx`, `CompanyList.tsx`, `ConstructionPhasesList.tsx` | Same full-table pattern |

Row animation example (`UserList.tsx`):

```tsx
transition={{ delay: 0.05 * index, duration: 0.3 }}
```

Row 40 waits **2 seconds** before it even starts fading in.

#### 2.3 Units list: N+1 HTTP calls

`normalizeUnitsFromApiResponse` in `UnitManagementList.tsx` runs `Promise.all` over **every unit**. If assignee name is missing, it calls `GET /single/user/:id` **per unit**.

**Effect:** 80 units with incomplete assignee payloads ≈ **80 extra requests** after the list already returned. The units page is one of the slowest admin screens.

#### 2.4 Condominium home dashboard loads **three full catalogs**

`CondominiumAdminDashboard.tsx` on mount:

1. `POST /residences` (entire assigned catalog)
2. `POST /unit_list` (entire assigned unit catalog)
3. `fetchCondominiumAdminMaintenances` which **first** loads residences again, then calls `POST /residence_wise/maintenance` **once per residence, sequentially** (`for` loop, not `Promise.all`) in `api.ts`

It then **counts array lengths** in the browser to show three numbers, and keeps only 4 maintenance rows for “recent activity”.

**Effect:** Home for a condo admin is the heaviest screen in the product, even though it only needs four numbers and four activity lines. Superadmin home is lighter (`POST /admin-dashboard/overview` once) — but that same overview endpoint is also used as a **heartbeat** (see 2.5).

#### 2.5 Session heartbeat hits the **overview aggregation** every 30 seconds

`validateStoredSession()` in `api.ts` POSTs `/admin-dashboard/overview` (a dashboard stats endpoint) just to see if the token is still valid.

`App.tsx` runs that:

- every **30 seconds**
- on every **window focus**

Meanwhile `AdminDashboard.tsx` and `MaintenanceList.tsx` (superadmin total card) call the **same endpoint** again.

**Effect:** The backend recomputes totals on a timer even when the user is idle. Combined with `apiFetch` cloning JSON on every call (see 2.8), this adds constant network and CPU cost.

#### 2.6 Duplicate residence catalog fetches on every admin page

`AdminSidebar` calls `useChatResidences` → `POST /residences`.

`AdminLayout` mounts **two** sidebars:

- desktop (`hidden lg:block`)
- mobile `Sheet` (always in the tree)

Both run `useChatResidences`. Condo dashboard and several lists fetch residences again.

**Effect:** Typical dashboard visit = **2–4 identical `/residences` posts** on first paint.

---

### P1 — High impact

#### 2.7 Motion on layout + every table row

`motion` from `motion/react` is used in **45+ files**. Admin chrome animates on every page:

- `AdminLayout` main (`opacity` + `y`)
- `AdminHeader` (`y` + `opacity`)
- `AdminSidebar` menu items
- Dashboard cards (`whileHover` scale)

Lists wrap **each table row** in `motion.tr` + `AnimatePresence`. That is expensive: layout measurement, FLIP-style animation, and extra React fibers per row.

**Effect:** Navigation between admin pages feels sluggish even when the API is fast.

#### 2.8 `apiFetch` double-parses every JSON response

On success, `apiFetch` **clones** the response and `json()`-parses it to look for `"Invalid token"`. Callers then parse again (`safeJsonParse` reads `.text()` then `JSON.parse`).

**Effect:** Every API call does **two** full JSON parses and holds **two** copies of large list payloads in memory.

#### 2.9 Messenger Firestore listener stays on even when the popup is closed

`useMessenger` → `useConversations`:

- Resident list fetch is gated with `listEnabled: isOpen` (good).
- Firestore `subscribeToAdminConversations` uses `subscribeActive = firebaseReady && adminId != null` — **not** `listEnabled`.

For condominium admins, `MessengerButton` is always in the header, so a Firestore conversation listener runs for the whole session. Presence uses **one `onSnapshot` per resident** when the popup is open (`presenceService.subscribeToUsersPresence`).

**Effect:** Extra realtime traffic and React re-renders from chat, even on Users/Units screens.

#### 2.10 i18n context recreates `t` every render

`LanguageProvider` defines `t` inline (new function every render) and puts `{ language, setLanguage, t }` in context with **no `useMemo`**. Any `setState` in the provider (or parent remount) re-renders **every** `useLanguage()` consumer — sidebar, header, lists, forms.

`LanguageContext.tsx` is ~2,300 lines of inlined IT/EN strings in the JS bundle.

#### 2.11 God components

Approximate sizes (lines):

| File | Role |
|---|---|
| `LanguageContext.tsx` | ~2,327 — i18n dictionary |
| `MaintenanceList.tsx` | ~2,000+ — list + category CRUD + items + overview |
| `MaintenanceForm.tsx` | ~2,000+ |
| `AdminApp.tsx` | ~1,719 — routing + all save handlers |
| `AssignResidences.tsx` | large, mock delays + heavy logging |
| `App.tsx` | ~800 — auth, resident nav, admin gate |

These files re-render wide subtrees and are hard for the compiler and for humans to optimize.

#### 2.12 Production bundle still includes unused vendor

`vite.config.ts` `manualChunks` always splits **recharts** and **react-hook-form**. Admin dashboard home does not use Recharts; analytics is a side screen. Without route-level lazy loading, the chart vendor still downloads for every admin.

`chunkSizeWarningLimit: 1000` hides large-chunk warnings rather than reducing size.

---

### P2 — Contributes to “jank” and ops pain

#### 2.13 Debug logging in hot paths

List modules log full response bodies (`JSON.stringify(data, null, 2)` in `UserList`, per-document logs in `DocumentList`, emoji-prefixed traces in Units/Maintenance). Vite can drop `console` in production **if** `NODE_ENV === 'production'` when `vite.config.ts` is evaluated. That is easy to get wrong. In **dev**, each log + the `vite.config` console-forwarder (`fetch('/__console')` per `console.log`) makes the dashboard feel much slower.

#### 2.14 Sequential maintenance merge

`fetchCondominiumAdminMaintenances` loops residences with `await` inside `for`. Five residences = five round trips back-to-back instead of parallel.

#### 2.15 `safeJsonParse` reads full body as text

Fine for small payloads; painful for full user/document dumps.

#### 2.16 Firebase Analytics init on every page load

`firebase.js` calls `initFirebaseAnalytics()` as soon as the module loads (admin or not). Extra network before the UI is ready.

#### 2.17 Superadmin “recent activity” is fake

`AdminDashboard.tsx` hard-codes activity and `+12%` / `+156` trend badges. That does not slow the API, but it is misleading in production and the unused “View all” button does nothing.

#### 2.18 Client app still in the same SPA

Even when `isAdminPanel` is true, `App.tsx` still **imported** resident screens at module load. Dead runtime path, live bundle cost.

---

## 3. Request waterfalls (what a slow session looks like)

### Superadmin: open dashboard home

```
JS parse (entire app) 
  → session validate: POST /admin-dashboard/overview
  → AdminDashboard: POST /admin-dashboard/overview   (duplicate)
  → Sidebar ×2: POST /residences                     (unused on this page)
  → every 30s + on focus: POST /admin-dashboard/overview again
```

### Condo admin: open dashboard home

```
JS parse
  → session validate: POST /admin-dashboard/overview
  → Sidebar ×2: POST /residences
  → Dashboard: POST /residences + POST /unit_list
  → Dashboard: POST /residences (again, inside resolveAssignedResidenceIds)
  → then POST /residence_wise/maintenance × N residences (sequential)
  → Messenger: Firestore conversations listener (always)
```

### Superadmin: open Units

```
POST /residences (sidebar ×2)
POST /unit_list (all units)
GET /single/user/:id × (units missing names)
Then motion.tr stagger for every row
```

---

## 4. Production-readiness scorecard

Scoring: **10** = ship with confidence at expected load. **5** = beta. **Below 5** = must fix first.

### 4.1 Performance & scalability — **4 / 10**

| Check | Status |
|---|---|
| Route-based code splitting | Fail |
| Server pagination / limits | Fail |
| Avoid N+1 | Fail (units, maintenance-by-residence) |
| Shared cache for catalogs | Fail (residences fetched many times) |
| Lightweight session ping | Fail (uses overview) |
| Virtualized tables | Fail |
| Images (avatars) lazy / sized | Partial (`img` without `loading="lazy"`) |
| Production console strip | Partial (config-dependent) |

**Will it hold?** Fine for a demo with tens of records. Uncomfortable at hundreds. Unusable at thousands without backend paging.

### 4.2 Security — **4.5 / 10**

| Check | Status |
|---|---|
| Session token | `localStorage` (`casazero_token`) — stolen by any XSS |
| Firebase web config | Hardcoded in `src/firebase/firebase.js` (normal for Firebase **web** keys, but still should be env-driven; rules must be tight) |
| `apiFetch` 401 handling | Present (`authFailure.ts`) |
| HTTPS API | Yes (`https://backend.casazero.site`) |
| CSP / security headers in `index.html` | None |
| Error boundary | None — one render crash blanks the dashboard |
| CSRF | Token-in-body/Bearer SPA; depends on Laravel CORS (dev proxy exists because CORS only allows `casazero.site`) |

### 4.3 Quality / engineering — **4 / 10**

| Check | Status |
|---|---|
| Automated tests | **None** (`*.test` / `*.spec` not found) |
| TypeScript strict project | No root `tsconfig.json` found; many `any`s; mixed `.js` chat/firebase |
| Error/empty/loading states | Present on many lists |
| Observability | `console.log` only, not structured telemetry |
| Accessibility | Partial (some `aria-*` on messenger); tables/modals inconsistent |
| Package name / title | Still `CasaZero WEB_APP_WORKING` in `package.json` and `index.html` |

### 4.4 Product correctness — **6.5 / 10**

| Check | Status |
|---|---|
| Admin URL routing | Improved (`adminRoutes.ts` + React Router) vs older in-memory-only design |
| RBAC | Present (`rbac.ts`, `ProtectedRoute`) |
| Condo vs superadmin dashboards | Split correctly |
| Superadmin activity/trends | **Placeholder data** |
| Support ticket **create** | Fake `setTimeout(500)` in `AdminApp.handleSaveSupportTicket` — not a real API |
| Dual product in one repo | Resident mobile UI + admin; increases risk of shipping the wrong surface |

### 4.5 Operations — **5 / 10**

| Check | Status |
|---|---|
| Vite production build | Configured (`outDir: build`) |
| SPA fallback for `/dashboard/*` | Must be configured on the host (not in this repo) |
| Env-based API URL | `API_HOST` hardcoded; only `import.meta.env.DEV` switches proxy |
| Source maps in prod | Off when `NODE_ENV === development` only — OK |
| Health/version | Footer label `CasaZero Admin v1.0`; not tied to git SHA |

---

## 5. File-level notes (admin-critical)

| File | Finding |
|---|---|
| `src/App.tsx` | Eager imports entire product; 30s overview heartbeat; client history unused in admin |
| `src/main.tsx` | No lazy boundary; title leftover |
| `src/utils/api.ts` | Clone+peek JSON; sequential maintenance; overview used as auth probe |
| `src/utils/LanguageContext.tsx` | Huge dictionary; unstable `t`; full-tree re-renders |
| `src/components/admin/AdminApp.tsx` | All pages imported; all forms mounted via flags; mixed real/fake save paths |
| `src/components/admin/AdminLayout.tsx` | Dual sidebar = dual `useChatResidences`; motion on `<main>` |
| `src/components/admin/AdminDashboard.tsx` | Extra overview fetch; fake activity/trends |
| `src/components/admin/CondominiumAdminDashboard.tsx` | Full lists to compute counts |
| `src/components/admin/UnitManagementList.tsx` | N+1 user fetches; heavy debug logs; row motion |
| `src/components/admin/UserList.tsx` | Full user dump + stringify log + staggered rows |
| `src/components/admin/MaintenanceList.tsx` | Multiple endpoints; second overview fetch; huge UI |
| `src/components/admin/DocumentList.tsx` | Per-row console in mapper |
| `src/components/admin/messenger/useMessenger.ts` + `useConversations.ts` | Firestore always subscribed for condo admins |
| `src/services/presenceService.ts` | One listener per user id |
| `src/firebase/firebase.js` | Config + analytics at import |
| `src/utils/session.ts` | Token in `localStorage` |
| `vite.config.ts` | Console forwarder (dev); high chunk warning; incomplete Radix split |
| `src/components/ui/*` | Large shadcn set; unused pieces still in graph via barrel/static imports |

Resident screens under `src/components/screens/` and `src/ShowcaseScreens.tsx` do not need to load for admin-only production deploys.

---

## 6. What is already in good shape

Do not throw these away while optimizing:

- Central `apiFetch` + 401 logout (`authFailure.ts`)
- Role-scoped residence/unit APIs (`residence_admin` body)
- Admin path mapping (`adminRoutes.ts`) and React Router
- Condo vs superadmin dashboards
- Messenger list fetch gated on popup open
- Vite proxy for local CORS
- Cancellation flags on several dashboard effects

---

## 7. Recommended fix order (performance first)

Do these in order; each step is independently shippable.

1. **Lazy-load routes**  
   `React.lazy` for `AdminApp` vs resident `App` tree, and lazy each admin page in the `switch`. Target: first JS for dashboard home without `MaintenanceForm` / `AssignResidences` / Recharts.

2. **Stop using overview as a ping**  
   Dedicated cheap `POST /auth/check` (or HEAD). Cache overview in memory for 30–60s; share between `AdminDashboard` and `MaintenanceList`.

3. **Condo dashboard counts from a single overview API**  
   Backend should return `{ residences, units, maintenances, recent[4] }`. Frontend must not download all units to show a number.

4. **Paginate list APIs** (`page`, `per_page`, `q`)  
   Start with Users, Units, Documents, Maintenance. Render a window of rows **without** `delay: 0.05 * index`. Prefer plain `<tr>` or a virtualizer (`@tanstack/react-virtual`).

5. **Fix Units N+1**  
   Require assignee name on `unit_list`, or batch `GET /users?ids=`.

6. **One residences catalog**  
   React Query / SWR / a small context. Mount **one** sidebar instance (CSS hide vs unmount).

7. **Gate Firestore**  
   Subscribe to conversations only when messenger is open **or** poll unread every N minutes. Do not attach presence listeners for every resident until the popup is open (already partly gated).

8. **Stabilize i18n**  
   `useCallback`/`useMemo` for `t` and provider value; split locale JSON.

9. **Strip debug logs** in list mappers; confirm `esbuild.drop: ['console']` actually runs on `vite build`.

10. **Production hygiene**  
    Error boundary, env-based `API_HOST`, real support-ticket create, remove fake trends, set a real `<title>`, add CSP on the host, move token to `httpOnly` cookie if the API can.

---

## 8. Production go / no-go

| Audience | Recommendation |
|---|---|
| Internal demo, &lt; 50 users, few residences | **Go**, with known slowness on Units/Maintenance |
| Pilot with several buildings and hundreds of units/docs | **No-go** until pagination + dashboard overview API + lazy routes |
| Public production, many concurrent admins | **No-go** until P0+P1, session storage review, tests on auth/RBAC, and host SPA fallback + security headers |

**Overall rating: 5.0 / 10 — not production-ready for real data volumes.**  
The product is feature-rich; the **data-loading and bundling model** is what makes the dashboard slow and unsafe to scale.

---

## 9. Method

Reviewed:

- Entry: `src/main.tsx`, `src/App.tsx`, `index.html`, `vite.config.ts`, `package.json`
- API/auth: `src/utils/api.ts`, `session.ts`, `authFailure.ts`, `rbac.ts`
- Admin shell: `AdminApp.tsx`, `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`
- Dashboards: `AdminDashboard.tsx`, `CondominiumAdminDashboard.tsx`
- Lists/forms: Users, Residences, Units, Documents, Maintenance (list+form), Support, Companies, Assign Residences
- Chat: `useMessenger.ts`, `useConversations.ts`, `presenceService.ts`, `firebase.js`
- i18n: `LanguageContext.tsx`
- Search for: `React.lazy`, pagination usage, `onSnapshot`, `setInterval`, `console.log`, tests

No production APM traces were available; conclusions are from call graphs and render patterns, which match typical “dashboard got slow after we added real data” reports.
