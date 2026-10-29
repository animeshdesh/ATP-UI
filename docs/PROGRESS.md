# Frontend progress

Status legend: `todo` · `in-progress` · `done` · `blocked`.
Frontend levels unlock as backend contracts land (see `../atp-backend/docs/PROGRESS.md`).
Screens are built ahead of the contract on the in-memory mock (D-012); an F3 level is done when its screens run against the real API.

| Level | Scope                                                                              | Depends on            | Status                               |
| ----- | ---------------------------------------------------------------------------------- | --------------------- | ------------------------------------ |
| F0    | Design import & inventory                                                          | `/design-login`       | done                                 |
| F1    | Scaffold (Vite, React, TS, Tailwind, PWA, routing, API client, MSW)                | F0 tokens             | done                                 |
| F2    | UI kit + all V1 screens on mock data                                               | F0, F1                | done                                 |
| F3a   | Auth + app shell + role-aware nav                                                  | backend L2 contract   | done                                 |
| F3b   | Quick-add entry, ledger list, edit/delete, receipt upload, offline queue           | backend L3 contract   | done                                 |
| F3c   | Settlement view + mark settled                                                     | backend L4            | done                                 |
| F3d   | Dashboard                                                                          | backend L5            | done                                 |
| F3e   | Budgets & funds                                                                    | backend L6            | done                                 |
| F3f   | Reports: PDF/CSV/XLSX download, share sheet                                        | backend L7            | done                                 |
| F4    | Settings: categories, partners, roles, members, invites                            | backend L2–L3         | in-progress (on real API; leftovers) |
| F5    | Monorepo split: `apps/money`, `packages/ui`, `packages/core` (no behaviour change) | —                     | done                                 |
| F6    | `apps/patients` scaffold: PWA, routes, auth, permission nav, mocks                 | F5, backend V2 spec   | done                                 |
| F7    | Public `/book` + inquiry queue                                                     | Claude Design, L11    | done (real API)                      |
| F8    | Calendar, appointment sheet, availability                                          | Claude Design, L10    | done (real API)                      |
| F9    | Patients: list, profile, notes, visits, packages, payments; money patient picker   | Claude Design, L9/L12 | done (real API); money picker todo   |
| F10   | Staff phone features: account, member edit, install tip, dues + plan, push         | backend L15, L16      | done (B needs backend release)       |

## F0 — Design import · `done`

- [x] Run `/design-login` in Claude Code — 2026-10-14
- [x] Import `ATP Clinic OS Screens.dc.html` and what it embeds (`ATP Clinic OS.dc.html`, `clinic-os.js`, `assets/modernist.css`), `assets/atp-logo.svg`, `assets/atp-mark.svg`, `support.js` → `design/` — 2026-10-14
- [x] `docs/DESIGN.md`: screen inventory mapped to PRD IDs, tokens, components list — 2026-10-14

## F1 — Scaffold · `done`

- [x] Vite 8 + React 19 + TS 6.0 + Tailwind 4; ESLint 10 / Prettier / Vitest 5 — 2026-10-14
- [x] PWA: `vite-plugin-pwa` (manifest, Workbox SW, autoUpdate), icons from `atp-mark.svg` via `pwa-assets-generator` — 2026-10-14
- [x] React Router 8 (auth guard, permission guards), TanStack Query — 2026-10-14
- [x] `openapi-typescript` (`pnpm api:types`) + `openapi-fetch` client (`src/api/client.ts`) — 2026-10-14
- [x] MSW 3 worker for contract endpoints (`src/mocks`), on when `VITE_API_MOCKING=true` in dev — 2026-10-14
- [x] Ports: dev/preview on 5553 with `strictPort`, API base 4553 — 2026-10-14

## F2 — UI kit + screens · `done`

- [x] Design tokens as a closed Tailwind palette (`src/styles.css`) — 2026-10-14
- [x] UI kit (`src/components/ui`): Button, Segmented, Field/Input/Select, Panel, SectionHeader, StatGrid/Stat, Tag, Avatar, Sheet, Dialog, Toast — 2026-10-14
- [x] App shell: desktop sidebar + top bar, mobile header + tab bar with centre add button (F-07) — 2026-10-14
- [x] All 14 V1 screens + quick-add sheet + invite dialog, mobile and desktop, three roles — 2026-10-14

## F3a — Auth & RBAC · `done`

- [x] Supabase Auth sign-in (email or phone, +91 normalised), magic link, sign-out, "keep me signed in" (local vs tab storage) — 2026-10-14
- [x] Session from `GET /v1/me`: permissions gate nav, routes and actions; clinic picker when `activeClinic` is null; deactivated member → signed out with a message — 2026-10-14
- [x] API client middleware: bearer token + `x-clinic-id`; `unwrap` maps `error.code` → `ApiError`, fetch failures → `NetworkError` — 2026-10-14
- [x] Roles matrix = `GET /v1/permissions` × `GET /v1/roles`, optimistic cell edits (`PATCH /v1/roles/{id}`), Own only where supported, Owner locked; New role — 2026-10-14
- [x] Users: members (deactivate/reactivate), pending invites (revoke), invite dialog → one-time link with Share / WhatsApp / Copy — 2026-10-14
- [x] Invite accept at `/invite/:token`: status screens (expired/used/revoked), accept → sign-in, `account_exists` → sign in first — 2026-10-14
- [x] Audit log from `GET /v1/audit` (raw rows → readable lines, table filter, paging) — 2026-10-14
- [x] Add-entry hidden without `finance.entry.create` (CA) — 2026-10-14
- [x] Mock mode keeps contract shapes (`src/api/mock/l2.ts`); 36 tests; verified live against local backend in Chrome — 2026-10-14
- [x] Feature flags `VITE_PHONE_AUTH` / `VITE_MAGIC_LINK`: off in deployed builds (no SMS provider / SMTP yet), so sign-in and invites are email-only; on in dev and tests — 2026-10-27
- [x] Users & roles moved to the patients app (`/settings/users`, `/settings/roles`; D-051); money links there and old money URLs redirect. Matrix groups: Patients & appointments, Finance, Settings, Later versions (v3+) — 2026-10-29
- [x] Own entry scope = entries I recorded (D-050): mocks drop the party clause — 2026-10-29
- [x] Distinct phone icons: patients = blue tile + white mark (`apps/patients/pwa-assets.config.ts`), money renamed "ATP Money"; `apple-mobile-web-app-title` in both — 2026-10-29
- [x] Mobile audit (Playwright, 360 and 390 px, 4 roles, 124 screens): 16px fields on phones (no iOS zoom), 44px touch targets (link/sm buttons, phone links, switch, branch picker), permissions shown role by role on phones, branch card overflow fixed — 2026-10-29
- [x] Member edit in the patients app: rename (`displayName`) and replace roles (`PATCH /v1/members/{id}`), `last_admin` message — 2026-10-29
- [x] `/account` in both apps (`@atp/core` `AccountPage`): own name (`PATCH /v1/me`), change password (re-checks the current one, then Supabase `updateUser`), sign out; reached from the header avatar, sidebar footer and More — 2026-10-29
- [x] iPhone install tip (`InstallHint`, Safari only, not when installed, dismissible) in both shells and on sign-in — 2026-10-29

## F3b — Entries · `done`

- [x] Quick-add on L3: categories by id, parties from `/v1/transactions/defaults` (+ clinic account), payment-mode enum, recurring prefill by `recurringItemId` — 2026-10-14
- [x] Edit / delete (F-06): tap an entry; read-only when locked (7-day window, settled); `edit_window_closed` / `entry_settled` messages — 2026-10-14
- [x] Receipts (F-04): compressed client-side, uploaded after create (`PUT …/receipt`), view via signed URL, replace, remove — 2026-10-14
- [x] Ledger list: server filters (type, category, mode, person, clinic account), totals for all matches, cursor paging — 2026-10-14
- [x] Offline (F-08): outbox replays with idempotency key + receipt; entry-form data offline-first and prefetched; session cached so the app reopens offline — 2026-10-14
- [x] Categories (add, rename, reorder, archive/restore), recurring items (list, log, add) — 2026-10-14
- [x] Fund picker on expenses (`fundId`), fund shown on entries — 2026-10-14
- [ ] Recurring item edit/archive UI

## F3c — Settlement · `done`

- [x] `/v1/settlement` position: partner transfers (D-028), staff vs clinic account lines, clinic-account summary, stale-shares warning — 2026-10-14
- [x] Mark as settled with fingerprint (`settlement_changed` → reload), history, undo latest; settled entries lock — 2026-10-14
- [x] Profit shares dialog (must total 100%), add partner; CA view-only — 2026-10-14

## F3d — Dashboard · `done`

- [x] Tiles from `/v1/dashboard` with period switch (today / week / month vs the span before) for clinic and own scope — 2026-10-14
- [x] Expense by category (L5), partner balance from `/v1/settlement`, recurring and attention from L3 — 2026-10-14
- [x] Budget alerts from L6 (`expenseByCategory[].budgetPaise`) — 2026-10-14

## F3e — Budgets & funds · `done`

- [x] `/v1/budgets`: per-category status (none / ok / warning / over), 80% marker, totals; Edit budgets (PUT, from this month on) — 2026-10-14
- [x] `/v1/funds`: rule in words, month figures, balance; New fund (percent / fixed / manual, opening balance), Top up, Archive — 2026-10-14
- [x] CA can view budgets (`finance.report.view`); edits need `finance.budget.manage` — 2026-10-14
- [ ] Fund rule edit (`PATCH` rule + effective month), month picker for past months

## F3f — Reports · `done`

- [x] Preview from `/v1/reports/monthly` (totals, category totals, first rows, settlement); month picker up to month-to-date — 2026-10-14
- [x] PDF (receipts as links / appendix / none), CSV, XLSX downloads (F-20…F-22) — 2026-10-14
- [x] Share PDF via the device share sheet with `navigator.share({ files })`, download fallback (F-23) — 2026-10-14
- [ ] Auto-email to the CA on the 1st (F-24): deferred by Animesh; UI option removed
- [ ] Use the server filename once `Content-Disposition` is CORS-exposed (fallback pattern in use)

## F10 — Staff phone features · `done`

Release A (frontend only):

- [x] My account, member edit, iPhone install tip (see F4 above) — 2026-10-29

Release B (needs backend L15 dues + plan, L16 push):

- [x] Visit fee at completion (paid now / pay later), pending and advance on profile and list, Pending filter — 2026-10-29
- [x] Per Animesh: Pay now always takes the full fee (no separate amount, no part payments); Collect is fixed to the pending amount. Request panel: Mark contacted / Close are bordered buttons like Call / WhatsApp — 2026-10-29
- [x] Session plan (planned sessions, done / left), session numbers on visits, package history — 2026-10-29
- [x] New-request phone notifications for `patients.manage = all` (web push, service worker `push-sw.js`), app badge, sign-out drops the device — 2026-10-29

### How to swap a level from mock to API

1. Backend publishes the level → `pnpm api:types` (root; writes `packages/core/src/api/schema.d.ts`).
2. In the app's `src/api/index.ts`, override that level's functions with `http.GET/POST` calls (patients: replace the `mockPatients` functions area by area; keep mock shapes identical so tests stay in mock mode).
3. Replace provisional types (patients: `apps/patients/src/domain/types.ts`) with aliases of `components['schemas'][...]`.
4. Done for L2 (F3a): `src/api/real.ts` is the pattern; keep mock shapes identical so tests stay in mock mode.

---

## Session log

| Date       | Session summary                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Next step                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-14 | Created tracker. Design import blocked: DesignSync needs `/design-login`.                                                                                                                                                                                                                                                                                                                                                                                                    | Run `/design-login`, then F0.                                                                                                                                          |
| 2026-10-14 | F0–F2: imported design, scaffolded PWA, built UI kit and all V1 screens on in-memory mock (D-012). `pnpm check` + `pnpm build` green; screens verified in Chrome at 390 and 1280 px.                                                                                                                                                                                                                                                                                         | F3a when backend L2 contract lands; meanwhile F-08 offline queue design.                                                                                               |
| 2026-10-14 | Ports → 5553 (strict) / API 4553. Pushed to `animeshdesh/ATP-UI`. F-08 offline outbox (21 tests). Fixed this tracker, which the F0–F2 commit had left unticked.                                                                                                                                                                                                                                                                                                              | F-06 entry edit/delete, then F-23 share sheet.                                                                                                                         |
| 2026-10-14 | F3a: real auth + L2 API (roles, members, invites, audit). Fixed dialog focus-jump bug and invite-before-roles-load bug. Live-verified flows in Chrome.                                                                                                                                                                                                                                                                                                                       | F3b: move ledger, quick-add, categories, recurring to L3 (`docs/LEDGER.md`).                                                                                           |
| 2026-10-14 | F3b ledger, F3c settlement, F3d dashboard on L3–L5. Fixed: offline quick-add with no cached categories, sign-in race that left screens loading, bounce to sign-in when API unreachable. Live-verified on local backend (prod build for offline).                                                                                                                                                                                                                             | L6 budgets & funds (budget bars, fund picker), L7 reports.                                                                                                             |
| 2026-10-14 | F3e budgets & funds on L6 (+ fund picker, dashboard budget alerts). 51 tests; live-verified.                                                                                                                                                                                                                                                                                                                                                                                 | F3f reports on L7 (PDF/CSV/XLSX, share sheet).                                                                                                                         |
| 2026-10-28 | V2 planned (backend `docs/V2.md`, D-043 – D-046): second app `apps/patients` → `patient.atprehab.si` in a pnpm workspace; Claude Design screens first. F5–F9 added.                                                                                                                                                                                                                                                                                                          | F5 monorepo split; user creates patient-app screens in Claude Design.                                                                                                  |
| 2026-10-28 | Patients app wired to the API (`apps/patients/src/api/real.ts`; mock stays for tests): domain types now alias the contract; payments send `kind`; therapists list uses `takesAppointments`, Availability can give hours to another member. Verified end to end on the local stack (public request → convert → book → clash 409 → note → package → complete + payment → money ledger shows patient and branch).                                                               | Release: review, migrations to staging/prod, Pages `atp-patients`, CORS, Supabase redirect.                                                                            |
| 2026-10-28 | F5: pnpm workspace (`apps/money`, `packages/core`, `packages/ui`; Pages Function at repo root). Imported Claude Design `ATP Patients.dc.html` (branches adopted, D-047). F6–F9: `apps/patients` with every prototype screen on an in-memory V2a mock (permission-scoped): `/book`, calendar (agenda/day/week), appointment + detail sheets, inquiries + convert, patients + profile/notes/visits/payments, availability, branches. Session gains `memberId`. 70 tests green. | Backend L9–L12, then wire each area; Pages `atp-ui` build → `pnpm --filter money build` / `apps/money/dist` before the next release; new Pages project `atp-patients`. |
| 2026-10-27 | Production live on `money.atprehab.si` (Pages `atp-ui`, branch `production`, previews off; D-042). Cache headers, stale-chunk 404, SPA routes and API URL verified; Owner sign-in → `/v1/me` OK.                                                                                                                                                                                                                                                                             | F4 leftovers; staging UI if a staging API returns.                                                                                                                     |
| 2026-10-27 | Launch prep: phone sign-in and magic link behind feature flags, off in deployed builds (email + password only). 59 tests.                                                                                                                                                                                                                                                                                                                                                    | Deploy staging + production per DEPLOY.md.                                                                                                                             |
| 2026-10-14 | F3f reports on L7: preview, PDF/CSV/XLSX, share sheet. All screens now on the real API; mocks only for tests/offline dev. 54 tests; live-verified.                                                                                                                                                                                                                                                                                                                           | F4 leftovers: member role editing, profile edit, recurring edit, fund rule edit.                                                                                       |
| 2026-10-29 | Users & roles (members, invites, permission matrix) moved from money to `apps/patients` (D-051): API functions and hooks moved, nav/More entries, NoPermission copy; money shows "Manage users in ATP Patients" and redirects `/settings/users`, `/settings/roles`. Mocks follow D-050 (therapists see only entries they recorded). 73 tests; both builds green; live-checked on the local API (therapist 0 hits / 404 on an owner entry naming them; invite link on :5554). | Released 2026-10-29 (`main → production`, Pages `atp-ui` + `atp-patients`). Railway `APP_URL=https://patient.atprehab.si` set.                                         |
| 2026-10-29 | Phone pass: patients app icon inverted (blue tile, white mark) and money renamed ATP Money on the home screen; mobile audit with Playwright at 360/390 px across both apps and all roles: before 94 small targets and 15 iOS-zoom fields, after 0 except one inline sentence link (Categories, exempt). Permission matrix becomes a role-by-role list below `lg`. 76 tests; both builds green.                                                                               | Released 2026-10-29 (`c10295b`; icon sha and both manifests verified live). Staff reinstall icons on iOS (DEPLOY.md).                                                  |
| 2026-10-29 | F10 release A: `/account` in both apps (name via `PATCH /v1/me`, password via Supabase `updateUser` after re-checking the current one), reached from the header avatar, so money therapists and front desk can sign out on phones; member edit (rename, roles, `last_admin`) in Users & roles; iPhone Safari install tip in both shells and on sign-in. 81 tests; new screens checked at 360/390 px (no overflow, no small targets, no iOS-zoom fields).                     | Release A; then backend L15/L16 and F10 release B.                                                                                                                     |
| 2026-10-29 | F10 release B on backend L15/L16: fee + paid now / pay later on completion, pending / advance and "Collect" on the profile, Pending filter and badges on the list, treatment plan card and session numbers, package history; notifications (setting on My account, nudge on Inquiries, `push-sw.js`, app badge, sign-out drops the device). 89 tests; new screens clean at 360/390 px.                                                                                       | Release B: backend migrations + VAPID keys, then both repos to production.                                                                                             |
