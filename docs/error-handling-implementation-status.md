## E-01–E-43 implementation status

Updated after error-handling implementation (2026-09-19).

| Finding | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| E-01 Toast infrastructure | **Fixed** | `src/components/ui/sonner.tsx` re-exports real Sonner `Toaster` + `toast` | App mounts real toaster |
| E-02 Session expiry message | **Fixed** | `authFailure` → `setSessionExpiredNotice`; `AuthScreen` banner | Shown after redirect to login |
| E-03 Messenger send/open | **Fixed** | `useMessenger` + `MessengerPopup` / `MessengerChatWindow` | Inline composer + list errors |
| E-04 Documents list load | **Fixed** | `DocumentList` `listError` + `ErrorState` + Retry | Distinguishes failure vs empty |
| E-05 Support tickets load | **Fixed** | `SupportList` `listError` + `ErrorState`; filter catalog warning | Poll remains soft-fail |
| E-06 Companies list load | **Fixed** | `CompanyList` `listError` + `ErrorState`; `fetchCompanies` throws | |
| E-07 Dashboard stats | **Fixed** | `AdminDashboard` / `CondominiumAdminDashboard` error banners | Partial warning for E-43 |
| E-08 Maintenance form catalogs | **Fixed** | `MaintenanceForm` `catalogError` banner | |
| E-09 Assign residences buildings | **Fixed** | Toasts on network/HTTP building/unit failures | |
| E-10 Unit residence dropdown | **Fixed** | Toast on residence catalog failure | |
| E-11 User form residence/unit | **Fixed** | Toasts on residence/unit load failures | |
| E-12 Document form catalogs | **Fixed** | `DocumentForm` `catalogError` banner | |
| E-13 Document detail fallback | **Fixed** | `toast.warning` before opening list-row fallback | |
| E-14 Chat residences | **Fixed** | `useChatResidences` returns `error`; sidebar + `AdminChat` UI | |
| E-15 Messenger conversations | **Fixed** | List error banner in messenger popup | |
| E-16 Firebase restore | **Fixed** | Toast on restore failure; messenger `firebaseWarn` | |
| E-17 Maintenance category/item helpers | **Already handled** / soft | Primary list had banner; helpers remain non-blocking | Soft warnings optional |
| E-18 Residence-wise residence selector | **Fixed** | Error surfacing on residence load | Via form-patch pass |
| E-19 Residence-wise form options | **Fixed** | Toast on options load failure | |
| E-20 Construction phase catalogs | **Fixed** | `setError` on residence/phase fetch failure | |
| E-21 Support form issue types | **Fixed** | `catalogError` in `SupportForm` | |
| E-22 Document filter catalogs | **Intentionally soft** | Console + empty filters; primary list fixed | Soft secondary data |
| E-23 Mark-as-read | **Intentionally silent** | `console.warn` + no user interrupt | Background |
| E-24 Chat push notify | **Intentionally silent** | Fire-and-forget `console.warn` | Message still sent |
| E-25 Presence | **Intentionally silent** | Background; no toast spam | |
| E-26 Firebase claims hook | **Already handled** | Surfaces via chat `authRequired` / ready flags | |
| E-27 Change password | **Blocked / requires backend** | Fake success removed; user-facing unavailable message | No change-password API (only forgot-password OTP) |
| E-28 Auth toast dependency | **Fixed** | Fixed by E-01 | Login/forgot-password toasts work |
| E-29 Unit form empty catch | **Already handled** | Parent `AdminApp` toasts; form stays open | |
| E-30 Maintenance item delete partial | **Fixed** | `toast.warning` on orphaned item delete | |
| E-31 Maintenance refresh after delete | **Fixed** | `toast.warning` if refresh fails | Delete still success |
| E-32 Document save message | **Fixed** | Prefer thrown `Error.message` when safe | |
| E-33 Showcase screens | **Intentionally silent** | Out of admin CRUD scope | |
| E-34 No React Query | **Already handled** | Conventions via `parseApiError` / `notifyError` / `ErrorState` | No QueryClient added |
| E-35 reportError UI | **Fixed** | `notifyError` pairs toast + `reportError` | |
| E-36 Image onError | **Already handled** | Fallback UI | Non-gap |
| E-37 Assign units fetch | **Fixed** | Toast on unit load failure | |
| E-38 Residence form lookups | **Already handled** | Already had toasts | Verified with E-01 |
| E-39 User list load | **Already handled** | Already had toasts | Consider less success noise later |
| E-40 Construction list banner | **Already handled** | Reference pattern | |
| E-41 Group chat errors | **Already handled** | Reference pattern | |
| E-42 Error boundary | **Fixed** | Enhanced `ErrorBoundary`; used in `main`, `App`, `AdminApp` | |
| E-43 Partial maintenance aggregation | **Fixed** | `failedResidenceIds` + condo dashboard warning | |

### Conventions established

1. **Toast:** real Sonner only (`import { toast } from 'sonner'`; mount `components/ui/sonner` Toaster).
2. **List load failure:** `ErrorState` + Retry — never pretend empty catalog.
3. **Mutation failure:** toast; keep form open.
4. **Catalog failure:** form-level banner or single toast.
5. **Auth expiry:** sessionStorage notice → login banner.
6. **Chat:** inline near composer/list.
7. **Background:** log / `reportError` only.
8. **Safe messages:** `parseApiError` / `notifyError` — no tokens/stacks.
