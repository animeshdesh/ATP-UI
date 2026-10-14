# Frontend progress

Status legend: `todo` · `in-progress` · `done` · `blocked`.
Frontend levels unlock as backend contracts land (see `../atp-backend/docs/PROGRESS.md`).
Screens are built ahead of the contract on the in-memory mock (D-012); an F3 level is done when its screens run against the real API.

| Level | Scope                                                                    | Depends on          | Status                              |
| ----- | ------------------------------------------------------------------------ | ------------------- | ----------------------------------- |
| F0    | Design import & inventory                                                | `/design-login`     | done                                |
| F1    | Scaffold (Vite, React, TS, Tailwind, PWA, routing, API client, MSW)      | F0 tokens           | done                                |
| F2    | UI kit + all V1 screens on mock data                                     | F0, F1              | done                                |
| F3a   | Auth + app shell + role-aware nav                                        | backend L2 contract | done                                |
| F3b   | Quick-add entry, ledger list, edit/delete, receipt upload, offline queue | backend L3 contract | done                                |
| F3c   | Settlement view + mark settled                                           | backend L4          | done                                |
| F3d   | Dashboard                                                                | backend L5          | done (budget bars wait for L6)      |
| F3e   | Budgets & funds                                                          | backend L6          | in-progress (UI done, mock data)    |
| F3f   | Reports: PDF/CSV/XLSX download, share sheet                              | backend L7          | in-progress (UI done, mock exports) |
| F4    | Settings: categories, partners, roles, members, invites                  | backend L2–L3       | in-progress (UI done, mock data)    |

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
- [ ] Member role editing (`PATCH /v1/members/{id}` roleIds) and rename; profile edit (`PATCH /v1/me`)

## F3b — Entries · `done`

- [x] Quick-add on L3: categories by id, parties from `/v1/transactions/defaults` (+ clinic account), payment-mode enum, recurring prefill by `recurringItemId` — 2026-10-14
- [x] Edit / delete (F-06): tap an entry; read-only when locked (7-day window, settled); `edit_window_closed` / `entry_settled` messages — 2026-10-14
- [x] Receipts (F-04): compressed client-side, uploaded after create (`PUT …/receipt`), view via signed URL, replace, remove — 2026-10-14
- [x] Ledger list: server filters (type, category, mode, person, clinic account), totals for all matches, cursor paging — 2026-10-14
- [x] Offline (F-08): outbox replays with idempotency key + receipt; entry-form data offline-first and prefetched; session cached so the app reopens offline — 2026-10-14
- [x] Categories (add, rename, reorder, archive/restore), recurring items (list, log, add) — 2026-10-14
- [ ] Recurring item edit/archive UI; fund picker on expenses (L6 `fundId`)

## F3c — Settlement · `done`

- [x] `/v1/settlement` position: partner transfers (D-028), staff vs clinic account lines, clinic-account summary, stale-shares warning — 2026-10-14
- [x] Mark as settled with fingerprint (`settlement_changed` → reload), history, undo latest; settled entries lock — 2026-10-14
- [x] Profit shares dialog (must total 100%), add partner; CA view-only — 2026-10-14

## F3d — Dashboard · `done`

- [x] Tiles from `/v1/dashboard` with period switch (today / week / month vs the span before) for clinic and own scope — 2026-10-14
- [x] Expense by category (L5), partner balance from `/v1/settlement`, recurring and attention from L3 — 2026-10-14
- [ ] Budget alerts and bars from L6 (`expenseByCategory[].budgetPaise`); currently the L6 mock

## F3f — Reports · `in-progress`

- [ ] Device share sheet for PDF (F-23) — needs backend L7 PDF endpoint

### How to swap a level from mock to API

1. Backend publishes the level → `pnpm api:types`.
2. In `src/api/index.ts`, override that level's functions with `http.GET/POST` calls; delete them from `mock/server.ts`.
3. Replace provisional types in `src/domain/types.ts` with aliases of `components['schemas'][...]`.
4. Done for L2 (F3a): `src/api/real.ts` is the pattern; keep mock shapes identical so tests stay in mock mode.

---

## Session log

| Date       | Session summary                                                                                                                                                                                                                                  | Next step                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 2026-10-14 | Created tracker. Design import blocked: DesignSync needs `/design-login`.                                                                                                                                                                        | Run `/design-login`, then F0.                                                |
| 2026-10-14 | F0–F2: imported design, scaffolded PWA, built UI kit and all V1 screens on in-memory mock (D-012). `pnpm check` + `pnpm build` green; screens verified in Chrome at 390 and 1280 px.                                                             | F3a when backend L2 contract lands; meanwhile F-08 offline queue design.     |
| 2026-10-14 | Ports → 5553 (strict) / API 4553. Pushed to `animeshdesh/ATP-UI`. F-08 offline outbox (21 tests). Fixed this tracker, which the F0–F2 commit had left unticked.                                                                                  | F-06 entry edit/delete, then F-23 share sheet.                               |
| 2026-10-14 | F3a: real auth + L2 API (roles, members, invites, audit). Fixed dialog focus-jump bug and invite-before-roles-load bug. Live-verified flows in Chrome.                                                                                           | F3b: move ledger, quick-add, categories, recurring to L3 (`docs/LEDGER.md`). |
| 2026-10-14 | F3b ledger, F3c settlement, F3d dashboard on L3–L5. Fixed: offline quick-add with no cached categories, sign-in race that left screens loading, bounce to sign-in when API unreachable. Live-verified on local backend (prod build for offline). | L6 budgets & funds (budget bars, fund picker), L7 reports.                   |
