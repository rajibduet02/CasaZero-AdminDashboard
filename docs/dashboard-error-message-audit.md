# Admin Dashboard — Error Message & Banner Audit

**Scope:** CasaZero Admin Dashboard (`src/`), audit-only — no code changes.  
**Date:** 2026-09-19  
**Focus:** Missing, silent, or inconsistent user-facing error feedback (toast / banner / inline / form) across API calls, mutations, forms, auth, data fetching, chat, and async flows.

---

## Executive summary

The dashboard **often logs errors to the console** and, for many CRUD mutations, **calls `toast.error` / `toast.success` from the `sonner` package**. However:

1. **Toast UI is effectively disconnected:** `App.tsx` mounts a **stub** `Toaster` from `src/components/ui/sonner.tsx`, while all call sites import `toast` from the **real** `sonner` npm package. The stub never receives those events, so most intended toasts may **never appear**.
2. Many **list/filter/dropdown fetches** and **chat/messenger** paths **swallow errors** (empty arrays, console only) with no banner/toast/inline message.
3. There is **no React Query / global mutation error boundary** pattern; error UX is ad hoc per screen.
4. `reportError` exists for sanitized logging only — it does **not** surface UI.

**Good patterns already present (keep/extend):**

- Inline error banners: `MaintenanceList`, `ResidenceWiseMaintenanceList`, `ConstructionPhasesList` (`listError`), `ConstructionPhasesForm` (`error` / `addPhaseError`), condominium chat (`AdminChat` load + send errors).
- Client form validation with field-level `AlertCircle` messages (User/Residence/Document/Unit/Company/Support forms).
- Centralized `apiFetch` + `authFailure` for 401 / invalid-token logout (session cleared; see gap on user messaging below).

---

## Summary metrics

| Metric | Count |
|--------|------:|
| **Total gap findings** | **40** |
| Critical | 3 |
| High | 14 |
| Medium | 15 |
| Low | 8 |

*(Positive references E-40/E-41 and non-gap E-36 are excluded from totals. Systemic toast wiring is one Critical issue; screens that only toast—with no banner fallback—are still listed where load failures never call toast at all.)*

**Cross-check:** An independent pass ([Audit silent error handling](dce99f25-54ab-4fea-9175-2685f7568fe9)) corroborated the list/catalog/messenger gaps and contributed **E-43** (partial multi-residence maintenance aggregation). That pass did not flag the Sonner stub/`Toaster` mismatch (**E-01**), which remains the top Critical infra finding in this report.

### Critical / High priority (top)

| ID | Severity | Issue |
|----|----------|--------|
| E-01 | Critical | Stub `Toaster` vs real `sonner` toast API — intended toasts may not render |
| E-02 | Critical | Session expiry / 401 logout without user-facing explanation |
| E-03 | Critical | Private messenger: send / open conversation failures silent |
| E-04 | High | Document list primary fetch: empty list, no toast/banner |
| E-05 | High | Support tickets initial load: silent empty list |
| E-06 | High | Company list initial load: silent empty list |
| E-07 | High | Dashboard overview / condo dashboard: failed stats silent |
| E-08 | High | Maintenance form lookup loads (categories/residences/items) silent |
| E-09 | High | Assign residences: buildings network/HTTP fail silent |
| E-10 | High | Unit management residence dropdown fetch silent |
| E-11 | High | User form residences/units fetch often console-only |
| E-12 | High | Document form catalog fetches silent (categories/types/residences/units) |
| E-13 | High | Edit document detail fetch fails → silent stale list payload |
| E-14 | High | Chat residence catalog (`useChatResidences`) silent failure |
| E-15 | High | Messenger conversation/resident load errors not shown in UI |
| E-16 | High | Firebase session restore on boot: console-only (chat broken without notice) |
| E-20 | High | Construction phases form: residence/phase catalog loads silent |

### Common root causes

1. **Disconnected toast infrastructure** (stub Toaster ≠ `sonner` toast).
2. **“Fail soft” fetch pattern:** `catch { setX([]); }` / `.catch(() => {})` with no UI state.
3. **Inconsistent feedback channels:** some screens use banners, some toast-only, some neither.
4. **Fire-and-forget / secondary data** treated as non-fatal without even a subtle hint (filters empty, dropdowns blank).
5. **Messenger optimistic UI** restores input on send failure but shows no message.
6. **Auth failure path** clears session and redirects without toast/banner explaining why.
7. **No shared `notifyError(error, context)`** helper that maps API/`Error` → toast + optional `reportError`.

### Recommended centralized error-handling strategy

1. **Fix toast plumbing first**
   - Mount `<Toaster />` from `sonner` in `App.tsx` (or re-export the real Toaster from `components/ui/sonner.tsx`).
   - Remove or align the stub so `toast` and `Toaster` share one implementation.
   - Optionally wrap `toast.error` in `notifyError(message, { description, error, context })` that also calls `reportError`.

2. **Standardize feedback by error class**

   | Class | UI |
   |-------|-----|
   | Auth / session invalid | Banner or toast **before** redirect (“Session expired — please sign in again”) |
   | Primary list/page load failure | **Inline banner** + retry (not empty list alone) |
   | Mutation create/update/delete | **Toast** (error + success); keep form open on failure |
   | Dependent dropdown/catalog failure | **Inline** under control or toast once per screen |
   | Chat send failure | **Inline** under composer (group chat already does this) |
   | Background poll / push notify | Log only (or soft toast if user-initiated) |

3. **API layer**
   - Keep `apiFetch` auth handling.
   - Add a small `parseApiError(response | unknown)` returning `{ message, code, fieldErrors }` for reuse.
   - Avoid empty `catch` in UI layers; prefer `reportError` + `notifyError` unless explicitly background.

4. **Optional next step:** React Error Boundary around admin routes for render crashes; still use toasts/banners for expected API failures.

---

## Detailed findings

### E-01 — Toast infrastructure mismatch

| Field | Detail |
|-------|--------|
| **File / ref** | `src/App.tsx` (~853); `src/components/ui/sonner.tsx` (entire file); call sites `import { toast } from 'sonner'` across admin/auth |
| **Feature / screen** | Global (all toast-based feedback) |
| **Current behavior** | App mounts stub `Toaster` with its own `toastCallbacks`. App code imports `toast` from npm `sonner`. Stub never receives those calls. |
| **Missing feedback** | Most `toast.error` / `toast.success` intended UX may not appear at all |
| **Error type / source** | Infrastructure / UX wiring |
| **Recommended UI** | Real Sonner `Toaster` (+ keep toast API) |
| **Severity** | **Critical** |
| **Approach** | Replace stub with `export { Toaster, toast } from 'sonner'` (or mount Sonner `Toaster` in `App`). Verify login, CRUD delete, and form submit toasts visually. |

---

### E-02 — Auth failure / session expiry: no user message

| Field | Detail |
|-------|--------|
| **File / ref** | `src/utils/authFailure.ts` (`handleAuthenticationFailure`, ~52–80); `src/App.tsx` (`onAuthenticationFailure` → `handleLogout`, ~322–327) |
| **Feature / screen** | Authentication / session heartbeat |
| **Current behavior** | Clears session, dismisses toasts, redirects to login. No `toast.error` / banner explaining expiry or invalid token. |
| **Missing feedback** | User appears “kicked out” with no reason |
| **Error type / source** | API 401 / invalid token payload / session validation |
| **Recommended UI** | Toast or full-page banner on login: “Your session expired. Please sign in again.” |
| **Severity** | **Critical** |
| **Approach** | Set a short-lived `sessionStorage` flag in `handleAuthenticationFailure`, show message on `AuthScreen` mount; or toast immediately before navigate (after E-01 fix). |

---

### E-03 — Private messenger: silent send & open failures

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/messenger/useMessenger.ts` (`selectConversation` catch ~165–167; `handleSend` catch ~205–212); `MessengerPopup.tsx` / `MessengerChatWindow.tsx` (no error props) |
| **Feature / screen** | Header private messenger |
| **Current behavior** | Open conversation: `console.error` only. Send: restores input/optimistic preview, **no** `sendError` UI. |
| **Missing feedback** | User thinks message sent or chat failed to open with no explanation |
| **Error type / source** | Firestore / private chat mutation |
| **Recommended UI** | Inline error under composer (mirror `AdminChat`); toast on open failure |
| **Severity** | **Critical** |
| **Approach** | Plumb `sendError` / `openError` from hook → `MessengerChatWindow`; show `role="alert"` text. |

---

### E-04 — Document list primary fetch: silent empty

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/DocumentList.tsx` (`fetchDocuments` ~248–259; invalid format ~248–251) |
| **Feature / screen** | Documents |
| **Current behavior** | Catch / invalid response → `setDocuments([])`, console only. (Unit-wise path *does* toast on catch ~190.) |
| **Missing feedback** | Empty list indistinguishable from “no documents” |
| **Error type / source** | GET `/documents` |
| **Recommended UI** | Inline banner + toast; retry button |
| **Severity** | **High** |
| **Approach** | Add `listError` state like `MaintenanceList` / `ConstructionPhasesList`. |

---

### E-05 — Support tickets load: silent empty

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/SupportList.tsx` (`loadTickets` catch ~258–260; issue types/residences `.catch(() => {})` ~268–269) |
| **Feature / screen** | Support |
| **Current behavior** | Ticket load failure → empty array. Filter option fetches swallowed. Mutations use toast. |
| **Missing feedback** | Empty ticket list / empty filters with no error |
| **Error type / source** | Support API fetch |
| **Recommended UI** | Banner for ticket load; soft toast for filter catalog failure |
| **Severity** | **High** |
| **Approach** | `setError` + banner; log filter failures via `reportError` + one toast. |

---

### E-06 — Company list initial load: silent empty

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/CompanyList.tsx` (~75–80) |
| **Feature / screen** | Companies |
| **Current behavior** | `.catch(() => setCompanies([]))` — no toast. Save/delete use toast. |
| **Missing feedback** | Failed load looks like zero companies |
| **Error type / source** | Companies list API |
| **Recommended UI** | Banner or toast.error |
| **Severity** | **High** |
| **Approach** | Track `loadError`; show empty-state error variant. |

---

### E-07 — Dashboard stats: silent failure

| Field | Detail |
|-------|--------|
| **File / ref** | `src/utils/api.ts` (`fetchAdminDashboardOverview` catch → `null`, ~265–266); `AdminDashboard.tsx` (~33–40); `CondominiumAdminDashboard.tsx` (~146–151) |
| **Feature / screen** | Superadmin & condominium dashboards |
| **Current behavior** | Overview/stats fail → `null` / N/A-looking values, no message |
| **Missing feedback** | User may trust stale/blank metrics |
| **Error type / source** | Overview / residences / units / maintenance aggregation |
| **Recommended UI** | Small inline alert on cards: “Couldn’t refresh stats” + retry |
| **Severity** | **High** |
| **Approach** | Return `{ data, error }` from fetch helpers; surface in dashboards. |

---

### E-08 — Maintenance form: lookup fetches silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/MaintenanceForm.tsx` (categories ~324–326; residences ~357–359; items ~398+; priority/frequency ~443–471) |
| **Feature / screen** | Create/edit maintenance |
| **Current behavior** | Failed lookups → empty arrays + console. Submit path has toasts. |
| **Missing feedback** | Blank dropdowns with no explanation |
| **Error type / source** | Catalog GETs |
| **Recommended UI** | Form-level banner or toast once when any catalog fails |
| **Severity** | **High** |
| **Approach** | `setCatalogError` shown above form fields. |

---

### E-09 — Assign residences: buildings fetch silent on network/HTTP

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/AssignResidences.tsx` (~147–159 vs soft-fail with toast at ~168) |
| **Feature / screen** | Assign residences |
| **Current behavior** | Network/HTTP failure: console + `setBuildings([])`, **no toast**. API `status: false` *does* toast. |
| **Missing feedback** | Inconsistent; network fail looks like empty catalog |
| **Error type / source** | Residences catalog |
| **Recommended UI** | toast.error (same as status-false path) |
| **Severity** | **High** |
| **Approach** | Unify error path to always `notifyError`. |

---

### E-10 — Unit management: residence dropdown silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/UnitManagementList.tsx` (`fetchResidences` catch ~328–330) |
| **Feature / screen** | Units list filters |
| **Current behavior** | Console only; unit list fetch/delete use toast |
| **Missing feedback** | Empty residence filter with no error |
| **Error type / source** | Residences catalog |
| **Recommended UI** | Toast or inline under filter |
| **Severity** | **High** |
| **Approach** | Reuse same toast pattern as unit list fetch. |

---

### E-11 — User form: residences / units fetch console-heavy, little UI

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/UserForm.tsx` (residences catch ~379–380; units path logging ~477+; occupancy ~173–195) |
| **Feature / screen** | Create/edit user |
| **Current behavior** | Many fetch failures only `console.error`; submit/validation have toast + field errors |
| **Missing feedback** | Incomplete assignment UI without notice |
| **Error type / source** | Residences/units/occupancy APIs |
| **Recommended UI** | Toast + optional inline under Residence/Unit selects |
| **Severity** | **High** |
| **Approach** | Surface catch with `toast.error` / form banner. |

---

### E-12 — Document form: catalog fetches silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/DocumentForm.tsx` (categories ~159–167; types ~204+; residences ~256+; units ~329–335) |
| **Feature / screen** | Upload/edit document |
| **Current behavior** | Empty arrays + console; file size has inline errors |
| **Missing feedback** | Empty category/type/residence dropdowns unexplained |
| **Error type / source** | Document metadata APIs |
| **Recommended UI** | Form banner / toast |
| **Severity** | **High** |
| **Approach** | Same catalog-error pattern as MaintenanceForm. |

---

### E-13 — Edit document: detail fetch failure silent fallback

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/AdminApp.tsx` (`handleEditDocument` ~981–987) |
| **Feature / screen** | Documents edit |
| **Current behavior** | On failure/unsuccessful response, falls back to list row and opens form — no toast |
| **Missing feedback** | User may edit incomplete data unknowingly |
| **Error type / source** | Single document GET |
| **Recommended UI** | Toast warning: “Couldn’t load full details; showing list data” |
| **Severity** | **High** |
| **Approach** | `toast.warning` / `toast.error` before open; optionally block edit. |

---

### E-14 — `useChatResidences`: silent catalog failure

| Field | Detail |
|-------|--------|
| **File / ref** | `src/hooks/useChatResidences.ts` (~107–114) |
| **Feature / screen** | Condominium chat sidebar residences |
| **Current behavior** | Bad status / catch → empty or session placeholder only; no error return |
| **Missing feedback** | Missing residences in chat nav |
| **Error type / source** | POST `/residences` |
| **Recommended UI** | Expose `error` to sidebar / AdminApp; banner |
| **Severity** | **High** |
| **Approach** | Return `{ items, loading, error }`; render alert in chat nav. |

---

### E-15 — Messenger: conversation/resident errors not rendered

| Field | Detail |
|-------|--------|
| **File / ref** | `src/hooks/useConversations.ts` (`error` state ~139–147, ~169); `useMessenger.ts` does not expose/show `error` |
| **Feature / screen** | Private messenger list |
| **Current behavior** | Hook sets `error`; UI ignores it |
| **Missing feedback** | Empty conversation list with no reason |
| **Error type / source** | Private chat residents API / Firestore subscribe |
| **Recommended UI** | Banner in messenger list pane |
| **Severity** | **High** |
| **Approach** | Pass `error` through `useMessenger` → `MessengerConversationList`. |

---

### E-16 — Firebase restore on app load: console-only

| Field | Detail |
|-------|--------|
| **File / ref** | `src/App.tsx` (~375–387); messenger `ensureFirebaseSession` warn ~114–116 |
| **Feature / screen** | Auth boot / chat readiness |
| **Current behavior** | Failed restore logged in DEV; no production user message |
| **Missing feedback** | Chat may require re-login with no prompt |
| **Error type / source** | Firebase custom token restore |
| **Recommended UI** | Toast/banner when chat opened without Firebase: already partly in `AdminChat` (`authRequired`); extend to messenger |
| **Severity** | **High** |
| **Approach** | Surface `firebaseReady` failure in messenger empty state. |

---

### E-17 — Maintenance list: categories / items fetch silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/MaintenanceList.tsx` (~225–227, ~259–261) |
| **Feature / screen** | Maintenance list (filters / category CRUD helpers) |
| **Current behavior** | Main list has `error` banner; category/item helper fetches only clear arrays |
| **Missing feedback** | Category management UI incomplete without notice |
| **Error type / source** | Categories / items GETs |
| **Recommended UI** | Toast when opening category manager if load failed |
| **Severity** | **Medium** |
| **Approach** | Reuse category toast patterns already used on add/update/delete. |

---

### E-18 — Residence-wise maintenance: residences dropdown silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/ResidenceWiseMaintenanceList.tsx` (~376–378) |
| **Feature / screen** | Residence-wise maintenances |
| **Current behavior** | Residences fail → `[]`; maintenance fetch sets `error` banner |
| **Missing feedback** | Empty residence selector |
| **Error type / source** | Residences catalog |
| **Recommended UI** | Toast or extend existing `error` banner |
| **Severity** | **Medium** |
| **Approach** | Set error when residence load fails. |

---

### E-19 — Residence-wise maintenance form: options load silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/ResidenceWiseMaintenanceForm.tsx` (~200–205) |
| **Feature / screen** | Residence-wise create/edit form |
| **Current behavior** | Options fail → empty; submit has toast |
| **Missing feedback** | Blank maintenance/company options |
| **Error type / source** | Options APIs |
| **Recommended UI** | Toast / inline |
| **Severity** | **Medium** |
| **Approach** | `toast.error` in catch. |

---

### E-20 — Construction phases form: residence/phase lists silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/ConstructionPhasesForm.tsx` (~100–143) |
| **Feature / screen** | Update construction phase dialog |
| **Current behavior** | Empty selects + console; submit/create-phase use inline `error` / `addPhaseError` |
| **Missing feedback** | Empty residence/phase dropdowns look like legitimate empty catalogs |
| **Error type / source** | Under-construction residences / phases APIs |
| **Recommended UI** | Inline error under each selector with Retry |
| **Severity** | **High** |
| **Approach** | Reuse existing form error banner; set on fetch failure / `status:false`. |

---

### E-21 — Support form: issue types silent; ticket details soft-fail

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/SupportForm.tsx` (~83–85 “silently fail”; details catch ~131) |
| **Feature / screen** | Support create/edit |
| **Current behavior** | Issue types empty; details prefilled from row on failure |
| **Missing feedback** | Missing issue-type options / incomplete edit details |
| **Error type / source** | Issue-type list / ticket detail |
| **Recommended UI** | Inline under issue type select; warning toast if detail refresh fails |
| **Severity** | **Medium** |
| **Approach** | Replace empty catch with `setErrors` / toast. |

---

### E-22 — Document list: filter residences/units & category catalog silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/DocumentList.tsx` (~291–293, ~334+, ~376+) |
| **Feature / screen** | Documents filters |
| **Current behavior** | Console only |
| **Missing feedback** | Broken filters look empty |
| **Error type / source** | Filter APIs |
| **Recommended UI** | Soft toast once |
| **Severity** | **Medium** |
| **Approach** | Shared `loadFilterError` flag. |

---

### E-23 — Messenger: mark-as-read failure console-only

| Field | Detail |
|-------|--------|
| **File / ref** | `src/hooks/useMessages.ts` (~135–138) |
| **Feature / screen** | Private chat unread |
| **Current behavior** | `console.warn`; unread may stick |
| **Missing feedback** | Badge may not clear (low urgency) |
| **Error type / source** | Firestore mark read |
| **Recommended UI** | Optional soft retry; toast only if persistent |
| **Severity** | **Medium** |
| **Approach** | Retry once; escalate toast on second failure. |

---

### E-24 — Chat push notifications: fire-and-forget silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/utils/api.ts` (`sendChatNotification` ~845–869; group ~873+) |
| **Feature / screen** | Chat (message may succeed, push may fail) |
| **Current behavior** | `console.warn` only; intentional non-throw |
| **Missing feedback** | Recipient may not get push (acceptable as Low–Medium) |
| **Error type / source** | Push notification API |
| **Recommended UI** | Usually none; optional DEV toast |
| **Severity** | **Medium** |
| **Approach** | Keep silent for background by default; document as known. Optionally soft toast in DEV if delivery must be verified. |

---

### E-25 — Presence set/subscribe: silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/messenger/useMessenger.ts` (~122–127); `src/hooks/usePresence.ts` (~16–27); `src/services/presenceService.ts` |
| **Feature / screen** | Messenger presence |
| **Current behavior** | Set/clear presence: warn / ignore. `usePresence` subscribes without an `onError` callback, so listener failures leave users looking offline. |
| **Missing feedback** | Online status wrong / no “presence unavailable” hint |
| **Error type / source** | Firebase presence write + subscribe |
| **Recommended UI** | “Presence unavailable” label rather than offline; `reportError` on write failures |
| **Severity** | **Low** |
| **Approach** | Pass error callback into `subscribeToUsersPresence`; soft UI badge. |

---

### E-26 — `useFirebaseAuth` claims load failure

| Field | Detail |
|-------|--------|
| **File / ref** | `src/hooks/useFirebaseAuth.js` (~33–37) |
| **Feature / screen** | Firebase readiness |
| **Current behavior** | `ready=false`, console; consumers may hang on loading |
| **Missing feedback** | Depends on screen (AdminChat has panels; messenger weaker) |
| **Error type / source** | Firebase claims |
| **Recommended UI** | Propagate error string to consumers |
| **Severity** | **Medium** |
| **Approach** | Return `error` from hook. |

---

### E-27 — Change password: simulated success (no real API errors)

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/screens/ChangePasswordScreen.tsx` (~60–69) |
| **Feature / screen** | Change password |
| **Current behavior** | `setTimeout` fake success toast — no API, no failure path |
| **Missing feedback** | Real backend failures impossible; false success risk |
| **Error type / source** | Missing integration |
| **Recommended UI** | Wire real API + toast.error on failure |
| **Severity** | **Medium** |
| **Approach** | Replace simulation with `apiFetch`; handle 4xx/5xx. |

---

### E-28 — First login / password screens: toast-dependent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/screens/FirstLoginSetupScreen.tsx`; `AuthScreen.tsx` (generally good toast usage ~78–223); `ForgotPasswordPanel.tsx` (~93–183) |
| **Feature / screen** | Auth |
| **Current behavior** | Auth & forgot-password **attempt** proper toast.error; blocked by E-01 |
| **Missing feedback** | After E-01 fix, these are largely OK; note AuthScreen Firebase secondary failure has toast |
| **Error type / source** | Login / OTP / reset |
| **Recommended UI** | Keep toasts; add inline field errors as enhancement |
| **Severity** | **Medium** |
| **Approach** | Fix E-01; keep AuthScreen patterns as reference. Auth/forgot-password already call `toast.error` correctly. |

---

### E-29 — Unit form submit catch empty (relies on parent toast)

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/UnitForm.tsx` (~224–226) |
| **Feature / screen** | Unit create/edit |
| **Current behavior** | Empty catch; parent `AdminApp.handleSaveUnit` toasts. Form stays open (good). |
| **Missing feedback** | OK if parent toast works (E-01); otherwise silent |
| **Error type / source** | Unit mutation |
| **Recommended UI** | Ensure parent toast; optional form-level banner duplicate |
| **Severity** | **Low** |
| **Approach** | Document contract; after E-01, verify. |

---

### E-30 — Maintenance delete: child item delete non-fatal silent

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/MaintenanceList.tsx` (~543–546) |
| **Feature / screen** | Delete maintenance |
| **Current behavior** | Item delete failure logged, returns false; overall delete may still show success |
| **Missing feedback** | Partial cleanup not explained |
| **Error type / source** | Cascaded item DELETE |
| **Recommended UI** | Warning toast if orphaned items remain |
| **Severity** | **Medium** |
| **Approach** | If any item delete fails, `toast.warning` after success. |

---

### E-31 — Maintenance delete: refresh fail still success toast

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/MaintenanceList.tsx` (~596–605) |
| **Feature / screen** | Delete maintenance |
| **Current behavior** | Refresh fails → optimistic remove + **success** toast |
| **Missing feedback** | Refresh failure hidden (delete may be OK) |
| **Error type / source** | List refresh after delete |
| **Recommended UI** | Success OK; optional info “List refresh failed — showing local update” |
| **Severity** | **Low** |
| **Approach** | `toast.success` + soft warning, or silent if local state correct. |

---

### E-32 — AdminApp document save: generic toast message

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/AdminApp.tsx` (~1138–1143) |
| **Feature / screen** | Document save |
| **Current behavior** | Catch always shows `failedToSaveDocument`, may discard API `message` |
| **Missing feedback** | Low detail (not fully silent) |
| **Error type / source** | Document mutation |
| **Recommended UI** | Prefer `error.message` / API message in description |
| **Severity** | **Low** |
| **Approach** | Pass through thrown `Error` message. |

---

### E-33 — Showcase / mobile screens: mock toasts only

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/screens/UserManagementScreen.tsx`; `NotificationsScreen.tsx`; etc. |
| **Feature / screen** | Non-admin showcase flows |
| **Current behavior** | Mock success toasts; limited real API error paths |
| **Missing feedback** | Out of primary admin CRUD scope |
| **Error type / source** | Mock / local |
| **Recommended UI** | N/A for admin audit; exclude from admin backlog unless productized |
| **Severity** | **Low** |
| **Approach** | Defer. |

---

### E-34 — No React Query / global mutation `onError`

| Field | Detail |
|-------|--------|
| **File / ref** | Architecture-wide (no TanStack Query usage for admin CRUD) |
| **Feature / screen** | All |
| **Current behavior** | Per-component try/catch |
| **Missing feedback** | Easy to miss new endpoints |
| **Error type / source** | Process / architecture |
| **Recommended UI** | Central `notifyError` + conventions |
| **Severity** | **Medium** |
| **Approach** | Document conventions; optional QueryClient later. |

---

### E-35 — `reportError` never drives UI

| Field | Detail |
|-------|--------|
| **File / ref** | `src/utils/reportError.ts` |
| **Feature / screen** | Global |
| **Current behavior** | Sanitized `console.error` only |
| **Missing feedback** | By design today |
| **Error type / source** | Logging |
| **Recommended UI** | Pair with `notifyError` for unexpected errors |
| **Severity** | **Low** |
| **Approach** | Extend helper: `reportAndNotifyError`. |

---

### E-36 — Image load errors (avatars / images)

| Field | Detail |
|-------|--------|
| **File / ref** | `UserList` `onError` image fallback; `figma/ImageWithFallback.tsx` |
| **Feature / screen** | Lists |
| **Current behavior** | Fallback UI (acceptable) |
| **Missing feedback** | None needed |
| **Error type / source** | Asset load |
| **Recommended UI** | Keep fallback |
| **Severity** | **Low** (informational — not a gap) |
| **Approach** | No change. *Excluded from gap totals as non-issue; kept for completeness.* |

*Not counted in the 42 gap total.*

---

### E-37 — Assign residences units fetch

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/AssignResidences.tsx` (~220–221 area) |
| **Feature / screen** | Assign residences |
| **Current behavior** | Units fetch errors console-oriented (verify toast presence vs empty units) |
| **Missing feedback** | Likely empty unit list without toast (pattern matches buildings network path) |
| **Error type / source** | Units by residence |
| **Recommended UI** | toast.error |
| **Severity** | **Medium** |
| **Approach** | Align with users fetch toast path. |

---

### E-38 — Residence form: maintenance/companies toast present; good baseline

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/ResidenceForm.tsx` (~284–308, submit ~396+) |
| **Feature / screen** | Residence form |
| **Current behavior** | Lookup failures **do** toast; submit toasts — **good** (still subject to E-01) |
| **Missing feedback** | None beyond E-01 |
| **Error type / source** | Catalog / mutation |
| **Recommended UI** | Keep; fix toaster |
| **Severity** | **Low** (dependency on E-01) |
| **Approach** | Verify after toast fix. |

---

### E-39 — User list load: toast present (reference)

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/UserList.tsx` (~282–297) |
| **Feature / screen** | Users |
| **Current behavior** | Success + error toasts on load/delete |
| **Missing feedback** | Only E-01 |
| **Error type / source** | Users API |
| **Recommended UI** | Prefer banner for load failure (less noisy than success toast on every load) |
| **Severity** | **Low** |
| **Approach** | Consider removing success toast on every fetch; keep error. |

---

### E-40 — Construction phases list: banner present (reference)

| Field | Detail |
|-------|--------|
| **File / ref** | `src/components/admin/ConstructionPhasesList.tsx` (~150–153, UI ~364–370) |
| **Feature / screen** | Construction phases |
| **Current behavior** | `listError` shown in UI — **good pattern** |
| **Missing feedback** | N/A |
| **Error type / source** | Under-construction fetch |
| **Recommended UI** | Use as template for Documents/Support/Companies |
| **Severity** | *(positive reference — not a gap)* |

---

### E-41 — Group condominium chat: generally good

| Field | Detail |
|-------|--------|
| **File / ref** | `src/pages/AdminChat.jsx` (auth/access/error panels ~158–226; `sendError` ~264–267) |
| **Feature / screen** | Condominium chat |
| **Current behavior** | Load errors + send errors shown inline |
| **Missing feedback** | Push notify failures only (E-24); residence catalog via E-14 |
| **Error type / source** | Firestore |
| **Recommended UI** | Keep; improve catalog error from E-14 |
| **Severity** | *(positive reference)* |

---

### E-42 — No Error Boundary for render crashes

| Field | Detail |
|-------|--------|
| **File / ref** | `src/App.tsx` / admin tree |
| **Feature / screen** | Global |
| **Current behavior** | Uncaught render errors → blank/broken tree (browser default) |
| **Missing feedback** | No friendly recovery UI |
| **Error type / source** | Runtime render |
| **Recommended UI** | Error boundary with “Reload” |
| **Severity** | **Medium** |
| **Approach** | Add boundary around `AdminApp` / routes. |

---

### E-43 — Multi-residence maintenance aggregation: silent partial failure

| Field | Detail |
|-------|--------|
| **File / ref** | `src/utils/api.ts` (`fetchCondominiumAdminMaintenances` / concurrent batch ~801–807) |
| **Feature / screen** | Condominium dashboard / scoped maintenance aggregation |
| **Current behavior** | Per-residence fetch `catch` returns `{ residenceId, rows: [] }` — failures merge as empty batches with no `failedResidenceIds` metadata |
| **Missing feedback** | Incomplete counts/lists look complete; no partial-data warning |
| **Error type / source** | Batched residence-wise maintenance API |
| **Recommended UI** | Return partial-failure metadata; dashboard/list warning banner naming failed residences |
| **Severity** | **Medium** |
| **Approach** | Change batch result to `{ rows, errors[] }`; consumers show banner when `errors.length > 0`. |

---

## Screens with relatively strong mutation feedback (still subject to E-01)

These call `toast.error` / `toast.success` on primary CRUD (verify after toaster fix):

- `AdminApp` — user/residence/unit/document/support save paths  
- `ResidenceList`, `UnitManagementList` (list/delete), `UserList`, `UserForm` submit  
- `MaintenanceList` mutations, `MaintenanceForm` submit  
- `ResidenceWiseMaintenanceList` / `Form` mutations  
- `CompanyList` save/delete  
- `DocumentList` delete/download  
- `AssignResidences` assign/remove  
- `AuthScreen`, `ForgotPasswordPanel`

---

## Suggested implementation order

1. **E-01** Fix Sonner `Toaster` wiring (unblocks most existing toast calls).  
2. **E-02** Session-expiry message.  
3. **E-03 / E-15 / E-16** Messenger + Firebase readiness UX.  
4. **E-04 / E-05 / E-06 / E-07** Primary list & dashboard load banners.  
5. **E-08–E-14, E-17–E-22, E-20** Catalog/dropdown silent failures.  
6. **E-43** Partial multi-residence maintenance aggregation metadata.  
7. **E-27** Real change-password API.  
8. **E-34 / E-35 / E-42** Central helpers + error boundary.

---

## Out of scope / intentional silence

- Peeking JSON in `apiFetch` for invalid-token (internal).  
- Network errors in `validateStoredSession` returning `{ ok: true }` (avoids false logout).  
- Presence offline clear `.catch(() => undefined)`.  
- Image `onError` fallbacks.

---

## Appendix — Key infrastructure files

| File | Role |
|------|------|
| `src/utils/api.ts` | `apiFetch`, overview, chat notify, catalogs |
| `src/utils/authFailure.ts` | 401 / invalid token → logout |
| `src/utils/reportError.ts` | Sanitized console logging |
| `src/components/ui/sonner.tsx` | **Stub** Toaster (mismatch) |
| `src/App.tsx` | Mounts stub Toaster; session validation |
| `package.json` | Depends on `sonner` ^2.0.3 |

---

*End of audit. No application code was modified; this document is the only deliverable.*
