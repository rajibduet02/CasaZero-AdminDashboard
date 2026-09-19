# CasaZero Admin Dashboard — Production Performance Audit

**Date:** 19 September 2026  
**Scope:** Analysis only. No application code, API behavior, UI, or build configuration was changed.  
**Method:** Full `src/` inspection, production `vite build` output, and request/listener path tracing.

---

## Executive Summary

The admin dashboard is **usable at small scale** (a handful of residences, tens to low hundreds of rows) because several important mitigations already exist: route-level lazy loading, residence-catalog request dedupe, support-ticket poll visibility guards, and messenger popup unmounting.

It is **not production-scalable** in its current data-loading architecture. The dominant risks are not React micro-optimizations. They are:

1. **Linear API fan-out by residence** on the condominium dashboard (one maintenance request per assigned residence).
2. **Unbounded Firestore message history** loaded into memory on every chat open.
3. **Full-catalog list screens** (users, units, documents, tickets, maintenances) with no pagination and no virtualization.
4. **A 6.5 MB login background image** on the critical first-paint path.
5. **A 670 KB main JavaScript chunk** that includes Firebase, translations, and the eager login screen.

Biggest production risks: condominium dashboard load time and backend load as residence count grows; Firestore read/write and browser memory as chats age; list screens becoming unresponsive once catalogs reach thousands of rows; login remaining slow on typical networks because of the uncompressed background photo.

---

## Metrics

### Production build (existing `npm run build`, Vite 6)

| Asset | Raw | Gzip | Notes |
| ----- | --- | ---- | ----- |
| `index-*.js` (main entry) | **686.5 KB** | **215.5 KB** | Eager: App, AuthScreen, LanguageContext, Firebase auth restore, `motion` |
| `react-vendor-*.js` | 150.1 KB | 48.9 KB | React + react-router |
| `AdminApp-*.js` | **95.4 KB** | 25.9 KB | Eager dashboards + layout + header messenger import graph |
| `ui-vendor-*.js` | 67.2 KB | 23.3 KB | Partial Radix split |
| `UserForm-*.js` | 36.7 KB | 9.6 KB | Largest lazy admin form |
| `ResidenceWiseMaintenanceList-*.js` | 33.2 KB | 8.5 KB | |
| `MaintenanceForm-*.js` | 31.3 KB | 6.6 KB | |
| `MaintenanceList-*.js` | 30.1 KB | 6.5 KB | |
| `chart-vendor-*.js` | 0.41 KB | 0.27 KB | Preloaded in `index.html` but **recharts is unused** |
| CSS `index-*.css` | present | — | |
| Login background PNG | **6,657 KB** | n/a | `af8ff57797d14df91ef70730582bc16d71c05087.png` |
| AI icon PNG | 116 KB | n/a | |
| Home residence PNG | 37 KB | n/a | |
| Logo PNG | 11 KB | n/a | |

Lucide icons are split into many ~0.2 KB chunks (good). Admin lists/forms are lazy-loaded (good). Showcase/StyleGuide are not imported (good, tree-shaken).

### API calls per major screen (mount)

Independent of the 30s session heartbeat.

| Screen | Typical request count | Endpoints | Sequential? |
| ------ | --------------------- | --------- | ----------- |
| Superadmin dashboard | **1** | `POST /admin-dashboard/overview` (`force: true`) | n/a |
| Condominium dashboard | **2 + N** | `POST /residences` → then parallel `POST /unit_list` + **N ×** `POST /residence_wise/maintenance` (concurrency 5) | Residences first, then fan-out |
| Users | **1** | `GET /user/get` (entire catalog) | n/a |
| Residences | **1** (often cached) | `POST /residences` | n/a |
| Units | **2–4** | `POST /residences` + `POST /unit_list` (full dump, client-filtered); optional `GET /user/get`; **duplicate `/unit_list` on residence filter** | Parallel catalogs, then extra fetch |
| Documents | **3** | `GET /documents` + `GET /document_categories` + `POST /residences` | Parallel |
| Maintenance (global) | **3–4** | `GET /all_maintenance/admin?_={Date.now()}` + categories + items + overview total | Parallel |
| Residence-wise maintenance | **2** | `POST /residences` + `POST /maintenance/dashboard` (condo: full nested payload, then client pick-by-id) | Residences then dashboard |
| Support tickets | **3** + **6/min poll** | `POST /all-support-tickets` + `POST /issue-type/list` + `POST /residences`; poll tickets every **10s** | Parallel mount |
| Companies | **1** | `POST /get_all/company` | n/a |
| Construction phases | **1** | `POST /residence-status/get-under-construction` | n/a |
| Assign residences | **2+** | `POST /get_users_by_role` + `POST /residences`; `POST /unit_by_residence` per building | Parallel then on-select |
| User form (resident) | **3+** | residences catalog (sometimes twice) + `GET /user/get` + `POST /unit_list` for occupancy + `POST /unit_by_residence` | Sequential occupancy |
| Maintenance form | **5+** | categories, residences, items, priorities, frequencies; edit adds `maintenance/show` | Parallel catalogs |
| Messenger (popup closed) | **0 HTTP** + **1 Firestore listener** | conversations `onSnapshot` | always-on |
| Messenger (popup open) | **1 HTTP + 1 + N listeners** | `POST /private-chat/residents` + conversations + **N presence docs** | |
| Messenger (thread open) | previous + **1 unbounded message listener** | `conversations/{id}/messages` no `limit` | |
| Group chat send | **1 + R** | `POST /private-chat/residents` then **R ×** `POST /send-chat-notification` | Parallel pushes |

N = assigned residences. R = residents in that residence excluding sender.

### Firebase / Firestore listeners

| Listener | Limit | Cleanup | When active |
| -------- | ----- | ------- | ----------- |
| Admin conversations | no (all convos for admin) | yes | **Always** for condominium admin (header messenger mounted) |
| Private messages | **none** | yes | Popup open + thread selected |
| Group messages `groups/group_{id}/messages` | **none** | yes | Condominium chat page |
| Presence `presence/user_{id}` | n/a (doc) | yes | **1 per resident** while popup open |
| `onAuthStateChanged` | n/a | yes | Per `useFirebaseAuth` instance (messenger + group chat = 2) |
| Preview helper `limit(1)` | yes | yes | **Dead code** (never called) |

Typical condominium admin on dashboard, messenger closed: **1 Firestore listener + 1 auth listener**.  
Messenger open with 80 residents: **1 + 80 presence**.  
Thread open: **2 + 80**.  
Plus group chat page: **+1 unbounded message query**.

### Polling / background

| Task | Interval | Hidden-tab behavior | Cleanup |
| ---- | -------- | ------------------- | ------- |
| Session revalidate (`App.tsx`) | **30s** + window `focus` | still runs (no visibility check) | yes |
| Support tickets (`SupportList.tsx`) | **10s** | skipped when `document.hidden`; catch-up on visible | yes |
| Forgot-password OTP countdown | 1s while step 2 | n/a | yes |

No `AbortController` anywhere in `src/`.  
No `debounce` / `useDebounce` anywhere in `src/`.  
No list virtualization (`react-window` / `@tanstack/react-virtual` / Virtuoso) anywhere in `src/`.  
`src/components/ui/pagination.tsx` exists and is **not used** by any admin list.

### Duplicate / extra request patterns already confirmed

| Pattern | Evidence |
| ------- | -------- |
| `apiFetch` clones and JSON-parses **every** JSON response to peek for “Invalid token”, then the caller parses again | `src/utils/api.ts` `apiFetch` |
| Residences catalog: in-memory cache + in-flight share (good) | `fetchResidencesCatalog` |
| Unit list: **no** equivalent cache | `fetchUnitListCatalog` |
| Overview cache TTL **5s**, but superadmin dashboard always `force: true` | `AdminDashboard.tsx`, `OVERVIEW_CACHE_MS` |
| Units: selecting a residence fetches `/unit_list`, then URL update retriggers `fetchUnits()` | `UnitManagementList.tsx` + `AdminApp.handleUnitFilterChange` |
| Condo dashboard does **not** use the nested `/maintenance/dashboard` payload that residence-wise list already knows how to parse | `fetchCondominiumAdminMaintenances` vs `fetchMaintenanceDashboard` |

### Large source modules (render/parse cost, not runtime DOM)

| File | Approx. size in production chunk |
| ---- | -------------------------------- |
| `LanguageContext.tsx` | ~2,360 lines of IT+EN strings in the **main** bundle |
| `AdminApp.tsx` | ~1,780 lines, mutation hub, not lazy internally |
| `MaintenanceForm.tsx` | ~2,448 lines (lazy) |
| `MaintenanceList.tsx` | ~1,612 lines (lazy) |
| `UserForm.tsx` | ~1,591 lines (lazy) |

---

## Findings

| ID | Severity | Area | File | Issue | Impact | Evidence | Recommendation |
| -- | -------- | ---- | ---- | ----- | ------ | -------- | -------------- |
| P-01 | **Critical** | Dashboard / API | `src/utils/api.ts`, `src/components/admin/CondominiumAdminDashboard.tsx` | E-43-style aggregation issues **one HTTP request per assigned residence** (`POST /residence_wise/maintenance`), capped at 5 concurrent workers. Residences catalog runs first; units + maintenance fan-out after. | Load time and backend usage scale with residence count: 100 residences ≈ 102 calls and ~20 round-trip waves; 500 ≈ 502 calls; 1000+ is a production incident. Client then maps/sorts the merged set just to show 3 cards and 4 recent rows. | `MAINTENANCE_FETCH_CONCURRENCY = 5`; `fetchCondominiumAdminMaintenances`; dashboard `useEffect` awaits catalog then `Promise.all([fetchUnitListCatalog, fetchCondominiumAdminMaintenances])`. | Prefer a **single aggregate endpoint** (or reuse nested `POST /maintenance/dashboard` which the residence-wise list already parses). Until then, request counts/totals only, not full maintenance rows. |
| P-02 | **Critical** | Firestore | `src/services/privateChatService.ts`, `src/firebase/firestoreChat.js` | Live message queries have **no `limit()`**. Every snapshot rebuilds the full history into React state. | Chat memory, first-paint, and billed reads grow with message age. A 5,000-message thread re-delivers 5,000 docs on each new message. Group chat re-sorts after an already-ordered query. | `query(messagesRef, orderBy('createdAt', 'asc'))` in both private and group subscribers; `setMessages(nextMessages)` / `onMessages(messages)`. | Paginate with `limitToLast` + older-page fetch. Process `docChanges()` instead of full snapshot mapping. |
| P-03 | **Critical** | Assets / loading | `src/components/screens/AuthScreen.tsx`, `src/assets/af8ff57797d14df91ef70730582bc16d71c05087.png` | Login (eager, not lazy) paints a **6.5 MB PNG** as CSS `backgroundImage`. Same asset is reused on first-login and change-password screens. | First visit / logout→login is dominated by a 6.5 MB image. On a 10 Mbps link that is ~5s of image download alone, before considering JS. | File size 6,657 KB; AuthScreen import + `backgroundImage: url(${buildingBg})`. AuthScreen is a static import in `App.tsx`. | Compress/resize (target &lt;150 KB WebP/AVIF), or serve from CDN with srcset. Do not ship a raw Figma export on the login path. |
| P-04 | **High** | Lists / API | `UserList.tsx`, `UnitManagementList.tsx`, `DocumentList.tsx`, `MaintenanceList.tsx`, `SupportList.tsx` | Admin tables download **entire catalogs** and render **every row**. No server pagination. No virtualization. `pagination.tsx` is unused. | Hundreds of rows: slow TTI and janky scroll. Thousands: main-thread filter + full table DOM. Payloads include nested residences/units/users. | `GET /user/get`, `POST /unit_list`, `GET /documents`, `GET /all_maintenance/admin`, `POST /all-support-tickets` with client `.filter` + `.map`. | Add API page size 25–50. Virtualize only after pages can still exceed ~150 DOM rows. |
| P-05 | **High** | Polling | `src/components/admin/SupportList.tsx` | While the Support page is mounted, the **full ticket dump** is refetched every **10 seconds**. | 6 full-list downloads per minute per open admin tab. Multiplies P-04 and `apiFetch` double-parse (P-09). Visibility skip and `inFlight` guard are correct; the interval is still too aggressive. | `TICKET_POLL_INTERVAL_MS = 10_000`; `setInterval(pollTickets, ...)`; skips `document.hidden`. | Raise to 60s+ or use realtime/SSE. Poll a cheap “updated since” endpoint, not the full dump. |
| P-06 | **High** | Bundle | `src/App.tsx`, `src/firebase/firebaseAuth.js`, `src/utils/LanguageContext.tsx` | Main chunk is **686 KB / 216 KB gzip**. Firebase is initialized because App restores Firebase on boot. Full bilingual dictionary ships in the entry. AuthScreen is eager. `chart-vendor` is preloaded despite recharts being unused. | Slow Time-to-Interactive on login even after the PNG is fixed. Superadmin pays Firebase parse cost. | Build output; `App.tsx` imports `restoreFirebaseSessionFromUser` / `logoutFirebase`; `LanguageProvider` wraps the tree; `index.html` preloads `chart-vendor`. | Defer Firebase until chat is needed. Split i18n by language. Lazy-load AuthScreen. Stop preloading empty chart chunk. |
| P-07 | **High** | Firestore / presence | `src/services/presenceService.ts`, `src/hooks/usePresence.ts` | Opening messenger creates **one `onSnapshot` per resident**. Any `userIds` change tears down and recreates **all** listeners. Each presence event clones a `Map` and setStates. | 100 residents = 100 extra listeners while the popup is open. 500+ will strain the client and Firestore. No `onDisconnect`, so crash leaves `online: true`. | `uniqueIds.forEach(subscribeToUserPresence)`; `usePresence` depends on `userIds.join(',')`. | Use a single query/collection group, or presence only for visible rows. Add `onDisconnect`. Incremental subscribe. |
| P-08 | **High** | Firestore | `src/hooks/useConversations.ts`, `src/components/admin/AdminHeader.tsx` | Conversations listener stays **always on** so the closed FAB can show an unread badge. Header **statically** imports `MessengerButton`, so Firebase/messenger code is in the AdminApp graph for **superadmin too** (button hidden, module still loaded). | Persistent Firestore connection for every condominium admin session. Superadmin still downloads messenger/Firebase via AdminHeader import. | Comment in `useConversations`: snapshots stay active while header messenger is mounted. `AdminHeader` `import { MessengerButton }`. | Lazy-import messenger only for condominium admin. Consider a cheap unread count listener (`limit` / aggregated field) instead of the full conversation set. |
| P-09 | **High** | API layer | `src/utils/api.ts` (`apiFetch`) | Every JSON response is **cloned and parsed** to detect invalid-token payloads, then the caller parses the body again (`json()` or `safeJsonParse` → `text()` + `JSON.parse`). No request `signal`. | CPU and peak memory scale with payload size. A 2 MB `user/get` is parsed twice. In-flight work continues after unmount (no AbortController in the repo). | `response.clone().json()` in `apiFetch`; grep `AbortController` = 0 matches. | Peek only on suspicious status/content-length, or parse once and share. Pass `AbortController` from list `useEffect` cleanups. |
| P-10 | **High** | Lists / API | `src/components/admin/UnitManagementList.tsx` | Always fetches **all units**, then filters by `residence_id` in the browser. Choosing a residence calls `/unit_list` **and** updates the URL, which retriggers `fetchUnits()`. Missing assignee names trigger a **full** `GET /user/get`. | Double network on a common filter action. Unit + user catalogs downloaded to show one building. | `handleResidenceSelect` → `fetchUnitListCatalog`; `onFilterChange` → `useEffect([filteredResidenceId])` → `fetchUnits()`; `fetchUserDisplayMap`. | Single fetch path. Ask the API for `residence_id`. Replace user-catalog enrichment with fields already on `unit_list`. |
| P-11 | **High** | Chat / API | `src/utils/api.ts` `sendResidenceGroupChatNotifications`, `src/pages/AdminChat.jsx` | Every group send: fetch **all** private-chat residents, client-filter to one residence, then `Promise.all` of **one HTTP notify per resident**. | Message send latency and backend spikes with occupancy. 200 residents = 201 extra HTTP calls per message, unbounded concurrency. | Called after `sendResidenceMessage` success. | Backend should fan out from `residence_id`. If client must notify, cap concurrency and use a bulk endpoint. |
| P-12 | **High** | Firestore writes | `src/hooks/useMessages.ts`, `src/services/privateChatService.ts` | Opening a thread with U unread resident messages: `getDocs` all unread + **U message writes** + 1 conversation write. Firestore batch max 500. | Write amplification and possible batch failure at 499+ unread. Snapshot then re-fires. Always-on conversation listener also sees `unreadAdmin` updates. | `markConversationReadForAdmin`; effect depends on `unreadFromResident`. | Store unread on the conversation doc only, or cap batched reads. Server-side mark-read. |
| P-13 | **High** | Forms / API | `UserForm.tsx`, `UnitForm.tsx`, `MaintenanceForm.tsx` | Forms reload **global catalogs** to populate dropdowns. Resident occupancy uses full `GET /user/get` **and** full `POST /unit_list`. Maintenance form mounts 5+ catalog APIs. UserForm may call residences twice (`is_null` true then false). | Opening “Add user” can rival UserList + UnitList in network cost. | `loadOccupancyForResidence`; UnitForm `/user/get`; MaintenanceForm categories/residences/items/priority/frequency. | Scoped occupancy endpoint. Cache catalogs at session level (units currently have none). |
| P-14 | **High** | API / payload | `AdminApp.tsx` document/residence save | Create/update sends **base64 data URLs** inside JSON (`file_url`, `residence_photo`). | Multi-megabyte request bodies, main-thread stringify, and Laravel JSON limits. | `residences/store`, `documents/store`, `documents/update` omit file unless `data:` prefix — still base64 when new. | Multipart or direct-to-storage upload; send URL/id only. |
| P-15 | **Medium** | Dashboard | `CondominiumAdminDashboard.tsx` | UI waits for residences **and** all maintenance batches before painting stats. Retry is `window.location.reload()`. Independent cards could show residences/units earlier. | Perceived waterfall; full app reload on retry (re-validates session, re-downloads chunks). | `setLoading(true)` until the whole `try` finishes; ErrorState `onRetry={() => window.location.reload()}`. | Stream stats: residences/units first, maintenance count when ready. Retry should call `loadDashboard`, not reload the document. |
| P-16 | **Medium** | Dashboard | `src/utils/api.ts` `fetchMaintenanceDashboard` vs condo dashboard | Residence-wise list already consumes a **nested all-residences** dashboard payload for condo admins (`api_token` only, then pick by id). Condo home dashboard ignores that and fans out N `residence_wise` calls. | Duplicate architectures. Nested payload may be large, but it is still one round trip vs N. | Comments in `fetchMaintenanceDashboard`; ResidenceWiseMaintenanceList `sendResidenceId: isCurrentUserSuperAdmin`. | One backend shape for counts + recent activity. Do not download every maintenance row to display four activity items. |
| P-17 | **Medium** | API | `src/utils/api.ts` `fetchUnitListCatalog` | Unlike residences, unit catalog has **no in-memory cache / in-flight dedupe**. | Units + UserForm occupancy + dashboard can each hit `/unit_list` in one session. | `fetchUnitListCatalog` always `apiFetch`s. | Same cache pattern as `fetchResidencesCatalog`, with invalidation on unit mutations. |
| P-18 | **Medium** | Search | all major lists | Search is **client-side on every keystroke**, no debounce. Several lists copy filtered arrays into extra state via `useEffect` (double render per key). UserList filters during render (better) but rebuilds residence label strings each time. | Not an API-per-keystroke problem today. At 2,000+ rows it is main-thread jank. Extra `setFiltered*` state is unnecessary. | Grep `debounce` = 0. Support/Units/Documents/Maintenance filter effects. | Debounce UI at 150–300ms. Derive filtered lists with `useMemo`. Server `q` only after pagination exists. |
| P-19 | **Medium** | React | `src/App.tsx`, `src/components/admin/AdminApp.tsx` | `AdminApp` is a large state hub (many refresh counters + form flags). `handleNavigate` is **not** `useCallback`. Dashboards are **eagerly imported** (not lazy). `renderContent()` runs every parent render. | Opening any admin route parses both dashboard modules. Parent re-renders are cheap relative to P-01/P-04; memoizing lists blindly would not fix payload size. | `AdminApp.tsx` static import of `AdminDashboard` / `CondominiumAdminDashboard`; lists are `lazy()`. | Lazy-load the two dashboard components. Memoize `handleNavigate`. Do **not** wrap every table row in `React.memo` until row props are stable and lists are virtualized. |
| P-20 | **Medium** | React / animation | list pages + `motion/react` | Page chrome uses `motion.div` enter animations. `motion` is imported across admin and client screens and is in the main graph via App/Auth. | Animation cost is real on first paint of a page, not on every keystroke. Library weight contributes to P-06. | Widespread `import { motion } from 'motion/react'`. | Keep motion on dashboards/modals; use CSS for list chrome. Dynamic-import `motion` if login TTI needs it. |
| P-21 | **Medium** | Memory / races | list `useEffect` fetches | Many list fetches have **no cancelled flag** (UserList, Support initial load, MaintenanceList). Combined with no AbortController, a fast page switch still completes parse/setState. React 18 usually ignores unmounted setState; wasted work remains. | Extra CPU/network after navigation. Occasional stale overwrite if a slow response finishes after a newer refresh (Support poll has a revision ref; UserList does not). | `UserList` `useEffect(() => { fetchUsers(); }, [refreshKey])` with no cleanup. | Standard `let cancelled = false` + abort on unmount (already done well on CondominiumAdminDashboard). |
| P-22 | **Medium** | Session polling | `src/App.tsx`, `validateStoredSession` | Heartbeat every **30s** plus `focus`. If `/auth/check` is missing, falls back to **`POST /admin-dashboard/overview`**. No `document.hidden` skip. Needed for security; overview fallback is the perf issue. | 120 overview-sized calls/hour/tab if auth/check is 404/405. Runs in background while the admin works. Cleanup is correct. | `setInterval(revalidate, 30_000)`; `SESSION_OVERVIEW_FALLBACK_URL`. | Keep heartbeat. Ensure `/auth/check` is deployed. Skip when tab hidden. Never use overview as a ping. |
| P-23 | **Medium** | Images | `UserList.tsx`, `ImageWithFallback.tsx` | Avatars have CSS size but no `loading="lazy"` / `decoding="async"`. Failed images update a `Set` in state (re-render whole table). `ImageWithFallback` is a stateful wrapper without lazy. | Many remote avatars contend with list JSON on first paint. One broken image re-renders all rows. | `UserList` `<img src={user.profile_image}>`; no `loading=` in src. | `loading="lazy"` below the fold; cache failed ids in a ref; initials without setState. |
| P-24 | **Medium** | Firestore / auth | `App.tsx`, `useMessenger.ts`, `useFirebaseAuth.js` | Firebase session restore can run from **App boot and messenger**. Group chat + messenger each call `useFirebaseAuth` (**two** `onAuthStateChanged`). Analytics initializes on `firebase.js` import. | Extra token/claims work; possible double `signInWithCustomToken`. Analytics + Firestore pulled when Firebase module loads. | `restoreFirebaseSessionFromUser` in App; `ensureFirebaseSession` in `useMessenger`; `initFirebaseAnalytics()` at module load. | Single restore owner. One auth hook at app shell. Defer analytics. |
| P-25 | **Medium** | Lists | `ResidenceWiseMaintenanceList.tsx`, `AdminApp.tsx` | Parent remounts the list with a `key` when navigating with a residence id. Condo path still downloads nested **all-residence** dashboard JSON to display one building. | Remount resets state (OK for filters, extra fetch). Large JSON for a scoped view. | `key={residence-wise-${id}}`; `sendResidenceId: false` for condo. | Superadmin already sends `residence_id`. Condo should too, or use a count endpoint. |
| P-26 | **Low** | Dashboard | `AdminDashboard.tsx` | Superadmin overview uses `force: true`, bypassing the 5s cache. “Recent activity” and trend percentages are **hardcoded**, not from the API. | One extra uncached overview call per dashboard visit. Fake trends are a product issue, not a scale issue. | `fetchAdminDashboardOverview({ force: true })`; `change: '+12%'`. | Drop `force` on first load (cache + inflight already exist). |
| P-27 | **Low** | React | `UserList.tsx` filter | `filteredUsers` is derived during render (good) but not memoized; residence labels rebuilt per user per keystroke. | Cheap at &lt;200 users. Unnecessary at thousands (after P-04). | Lines ~377–395. | `useMemo` once lists can be large; still secondary to pagination. |
| P-28 | **Low** | Lists | `ResidenceWiseMaintenanceList.tsx` | Fallback row key uses array index. Construction phases key includes `updated_at` (row remount on refresh). | Possible unnecessary row remount; not a scale bottleneck. | `` `m-${id}-${index}` ``; `` `${row.id}-${row.residence_id}-${row.updated_at}` ``. | Stable ids only. |
| P-29 | **Low** | Bundle | `package.json`, `src/components/ui/chart.tsx` | `recharts`, `react-hook-form`, carousel/calendar/form primitives are largely **unused** by admin routes. `manualChunks` still emits/preloads `chart-vendor`. Figma `ShowcaseScreens` / `StyleGuide` are not imported (already excluded). | Install/CI weight more than runtime. Preload of a 0.4 KB chunk is noise. | Grep: `chart.tsx` is the only recharts import; no admin import of `ui/chart`. | Remove unused deps when convenient; fix `index.html` preload list. |
| P-30 | **Low** | Memory | `firestoreChat.js`, vite `esbuild.pure` | Hot-path `console.log` on every snapshot. Production config marks `console.log` as pure (likely dropped). `console.error` remains. | Low if stripped; noise in staging if `NODE_ENV` is wrong. | `console.log('🔥 [FIRESTORE]...')` inside `onSnapshot`. | Keep logs behind `import.meta.env.DEV` regardless of esbuild. |
| P-31 | **Low** | Cache | `fetchResidencesCatalog` | Session-long cache with **no TTL** until `invalidateResidencesCatalog()`. | Good for duplicate mounts. Stale names until a mutation invalidates — correctness, not perf. | `residencesCatalogCache` Map. | Optional TTL (e.g. 60s) if stale catalogs become a support issue. |
| P-32 | **Low** | Client shell | `src/App.tsx` | Keyboard/swipe listeners stay registered while the **admin** shell is shown. Demo buildings/history state live in App even for admin. | Negligible CPU. | Effects before `isAdminPanel` return. | Admin-only early return for those listeners. |

---

## Top Priority Issues

Fix these first. They dominate production cost.

1. **P-01 — Condominium dashboard N+1 maintenance fetches**  
   This is the E-43 scalability problem. Counts and “recent activity” must not require one request per residence.

2. **P-03 — 6.5 MB login background**  
   Highest-confidence, immediately measurable win. Independent of backend work.

3. **P-02 — Unbounded Firestore message queries**  
   Chat will get slower and more expensive the longer the product is in production.

4. **P-04 + P-05 — Full list dumps + 10s ticket polling**  
   Users/units/documents/tickets/maintenances will not survive thousands of rows. Polling multiplies the ticket dump.

5. **P-06 — Main bundle / eager Firebase**  
   Login TTI after the image is fixed.

6. **P-10 / P-13 — Repeat full `unit_list` and `user/get`**  
   Units screen and user/unit forms re-download catalogs the lists already fetched.

---

## Quick Wins

Safe, high impact, no product redesign:

| Win | Why it is safe |
| --- | -------------- |
| Compress/replace the 6.5 MB login PNG | Visual change only if quality is preserved |
| Stop `force: true` on overview when cache/inflight already exist | Same data, less duplicate overview |
| Raise Support poll from 10s to 60s+ (keep hidden-tab skip) | Behavior unchanged, far less load |
| Remove duplicate `/unit_list` on residence filter (one code path) | Same UI, half the filter traffic |
| Lazy-import `MessengerButton` for condominium admin only | Superadmin bundle/runtime win |
| Do not preload empty `chart-vendor` | `index.html` only |
| Add `cancelled` + `AbortController` to list effects | Prevents work after navigation |
| Skip session heartbeat when `document.hidden` | Same security when the tab is used |
| `loading="lazy"` on list avatars | Layout already has CSS size |
| Gate Firestore `console.log` with `import.meta.env.DEV` | No user-facing change |
| Share a session cache for `/unit_list` like residences | Fewer identical POSTs |

---

## Medium-Term Improvements

| Improvement | Intent |
| ----------- | ------ |
| **Aggregate dashboard API** (counts + last 4 maintenances) | Kill N+1 without downloading every row |
| **Server pagination + search `q`** on users, units, documents, tickets, maintenances | Make tables scale |
| **Virtualize** tables that still render 100+ rows per page | Only after pagination |
| **Cursor-paginated Firestore messages** (`limitToLast`) | Bound chat memory and reads |
| **Unread counter on conversation doc** instead of scanning all unread messages | Bound mark-as-read writes |
| **Bulk/residence push notify** on the backend | Stop N HTTP calls per group message |
| **Multipart / storage uploads** instead of base64 JSON | Bound request size |
| **Split i18n** and defer Firebase until messenger/chat | Shrink main chunk |
| **One occupancy endpoint** for UserForm | Stop pairing full user catalog + full unit catalog |
| **Lazy dashboards** inside AdminApp | Smaller AdminApp parse on first admin route |

Do not start with wrapping list rows in `React.memo`. Row memoization does not reduce 2 MB JSON parse or 1,000 DOM nodes.

---

## Scalability Risks

Assumptions: concurrency 5, ~200ms RTT, maintenance/unit payloads not tiny.

### Residences

| Scale | What breaks first |
| ----- | ----------------- |
| **~20 residences** | Condo dashboard is already a multi-request waterfall but usually acceptable. |
| **100 residences** | ~102 dashboard calls; ~20 serial waves of maintenance (~4s+ network). Unit list downloads all units for all buildings. Presence = 100 listeners if messenger is open. |
| **500 residences** | Dashboard ~502 HTTP calls; browser and Laravel will feel it. Nested `/maintenance/dashboard` (if used) becomes a huge JSON parse. Sidebar chat residence list and messenger residents list are full in-DOM. |
| **1,000+ residences** | Current condo dashboard design is not viable. Need aggregates, pagination, and scoped queries. Firestore conversation listener (all convos) also grows. |

### Users / units / documents / tickets / messages

| Dataset | Current behavior | Risk |
| ------- | ---------------- | ---- |
| Thousands of **users** | One `GET /user/get`; full table; same dump reused for occupancy and unit name enrichment | Parse + DOM + double-parse via `apiFetch` |
| Thousands of **units** | Full `POST /unit_list` even when filtering one residence | Same |
| Thousands of **documents** | `GET /documents` all | Same |
| Thousands of **tickets** | Full dump **every 10s** while Support is open | API + CPU |
| Thousands of **chat messages** | Entire history in one listener | Memory + Firestore reads every new message |
| Thousands of **unread** in one thread | U+1 batched writes, fails around 500 | Mark-as-read errors / storms |

---

## Recommended Implementation Order

Practical sequence: measurable wins first, architecture next, polish last.

### Phase 0 — This week (no backend required)

1. Replace/compress login background (P-03).  
2. Support poll 10s → 60s+ (P-05).  
3. Remove units double-fetch (P-10).  
4. Overview without `force: true` on first paint (P-26).  
5. Hidden-tab skip for session heartbeat (P-22).  
6. Lazy messenger for condominium admin only (P-08).  

### Phase 1 — Dashboard scale (backend + frontend contract)

7. Single aggregate for condominium dashboard counts + recent activity (P-01, P-16).  
8. Cache `unit_list` like residences (P-17).  
9. Stop downloading full maintenance rows to compute a number (P-15).  

### Phase 2 — Lists

10. Paginate the five hot catalogs (P-04).  
11. Derive filters with `useMemo`; debounce search (P-18).  
12. Virtualize only if a page can still exceed ~150 rows.  
13. Scoped occupancy API for forms (P-13).  

### Phase 3 — Chat / Firestore

14. `limitToLast` + pagination for messages (P-02).  
15. Conversation-level unread; stop per-message mark-read storms (P-12).  
16. Presence for visible rows or a single query (P-07).  
17. Backend fan-out for group push (P-11).  

### Phase 4 — Payload and bundle

18. Parse JSON once in `apiFetch`; abort in-flight list requests (P-09, P-21).  
19. Multipart uploads (P-14).  
20. Split i18n; defer Firebase; drop unused vendor preload (P-06, P-29).  

---

## What is already in good shape

These should be preserved while fixing the issues above:

- Admin **list/form route splitting** (`lazy()` in `AdminApp` and `App`).  
- **Residence catalog** in-flight + cache (`fetchResidencesCatalog`).  
- Overview **in-flight share** (when `force` is not used).  
- Support poll **visibility** + **inFlight** + **revision** guards.  
- Messenger popup **unmounts** when closed; message/presence gated on `isOpen`.  
- Conversation map updates skip React setState when nothing meaningful changed.  
- Condo dashboard **cancelled** flag on unmount.  
- Maintenance fan-out **concurrency cap of 5** (do not raise it).  
- Session interval and DOM listeners in App **do clean up**.  
- Firestore/auth/presence hooks **unsubscribe** on unmount (classic leak risk is low).  
- `DemoControls` is `import.meta.env.DEV` only.  
- `ShowcaseScreens` / `StyleGuide` are unused (not in the production graph).  
- Lucide icons code-split into tiny files.

---

## Audit trail

```text
Performance Audit Complete
↓
Issues identified
↓
Impact measured/estimated
↓
Prioritized recommendations
↓
Implementation plan
```

No application code was modified in this audit. The only deliverable is this report.
