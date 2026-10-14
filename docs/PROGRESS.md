# Frontend progress

Status legend: `todo` · `in-progress` · `done` · `blocked`.
Frontend levels unlock as backend contracts land (see `../atp-backend/docs/PROGRESS.md`).
Screens are built ahead of the contract on the in-memory mock (D-012); an F3 level is done when its screens run against the real API.

| Level | Scope                                                                    | Depends on          | Status                              |
| ----- | ------------------------------------------------------------------------ | ------------------- | ----------------------------------- |
| F0    | Design import & inventory                                                | `/design-login`     | done                                |
| F1    | Scaffold (Vite, React, TS, Tailwind, PWA, routing, API client, MSW)      | F0 tokens           | done                                |
| F2    | UI kit + all V1 screens on mock data                                     | F0, F1              | done                                |
| F3a   | Auth + app shell + role-aware nav                                        | backend L2 contract | in-progress (UI done, mock auth)    |
| F3b   | Quick-add entry, ledger list, edit/delete, receipt upload, offline queue | backend L3 contract | in-progress (UI + offline queue)    |
| F3c   | Settlement view + mark settled                                           | backend L4          | in-progress (UI done, mock data)    |
| F3d   | Dashboard                                                                | backend L5          | in-progress (UI done, mock data)    |
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

## F3b — Entries · `in-progress`

- [x] Quick-add (F-01…F-05) on mock; default mode = last used (F-03) — 2026-10-14
- [x] Offline queue (F-08): IndexedDB outbox (`src/offline`), idempotency key per opened form, replay oldest-first on `online` + every 30 s, rejected entries kept with Discard, offline banner + "Waiting to sync" rows; verified in Chrome with network emulation — 2026-10-14
- [ ] F-08 follow-ups: persist the query cache so lists render after an offline reload; upload the stored receipt blob once L3 exposes signed upload URLs; map `fetch` TypeError → `NetworkError` in the real HTTP adapter
- [ ] Entry edit/delete flow (F-06): row actions are display-only
- [ ] Switch to L3 contract

## F3f — Reports · `in-progress`

- [ ] Device share sheet for PDF (F-23) — needs backend L7 PDF endpoint

### How to swap a level from mock to API

1. Backend publishes the level → `pnpm api:types`.
2. In `src/api/index.ts`, override that level's functions with `http.GET/POST` calls; delete them from `mock/server.ts`.
3. Replace provisional types in `src/domain/types.ts` with aliases of `components['schemas'][...]`.
4. Auth (F3a): Supabase JS for sign-in/magic link/refresh; drop the dev role picker.

---

## Session log

| Date       | Session summary                                                                                                                                                                      | Next step                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 2026-10-14 | Created tracker. Design import blocked: DesignSync needs `/design-login`.                                                                                                            | Run `/design-login`, then F0.                                            |
| 2026-10-14 | F0–F2: imported design, scaffolded PWA, built UI kit and all V1 screens on in-memory mock (D-012). `pnpm check` + `pnpm build` green; screens verified in Chrome at 390 and 1280 px. | F3a when backend L2 contract lands; meanwhile F-08 offline queue design. |
| 2026-10-14 | Ports → 5553 (strict) / API 4553. Pushed to `animeshdesh/ATP-UI`. F-08 offline outbox (21 tests). Fixed this tracker, which the F0–F2 commit had left unticked.                      | F-06 entry edit/delete, then F-23 share sheet.                           |
