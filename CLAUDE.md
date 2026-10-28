# atp-frontend — ATP Clinic OS PWAs

Mobile-first installable PWAs for ATP Rehab staff (money, patients) in one pnpm workspace. React 19 + TypeScript 6.0 + Vite 8 + Tailwind 4 + React Router 8 + TanStack Query (PRD §8.1).

## Workspace (pnpm, since F5)

| Path                          | What                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/money`                  | Finance PWA → `money.atprehab.si` (Pages `atp-ui`), dev port 5553                                                                                                                                                                                                                                                                               |
| `apps/patients`               | Patients PWA + public `/book` → `patient.atprehab.si` (Pages `atp-patients`), dev port 5554 (F6–F9)                                                                                                                                                                                                                                             |
| `packages/core` (`@atp/core`) | API contract (`src/api/schema.d.ts`, `src/types.ts`), `http`/`unwrap`, `auth` (sign-in, session, invites; real or mock), `SessionProvider`/`useSession().can`, `Providers` (+ per-app `brand`), `AuthGate`, sign-in/invite/clinic-picker screens, `lib/{env,supabase,dates}`. `@atp/core/mock`: in-memory auth & RBAC (`mockL2`, `setMockRole`) |
| `packages/ui` (`@atp/ui`)     | Design-system components, `cn`, `Tone`, `styles.css` (closed token palette; apps `@import '@atp/ui/styles.css'`)                                                                                                                                                                                                                                |

All dependencies are declared in the root `package.json`. Packages are source-only (TypeScript compiled by each app's Vite) and use relative imports inside; apps use `@/` for their own `src`.

## Commands (root)

- `pnpm dev` (money, http://localhost:5553, `strictPort`: Supabase auth redirects target it) · `pnpm dev:patients` (5554)
- `pnpm check` (lint + typecheck + tests in every package) · `pnpm --filter money build`
- `pnpm api:types` regenerates `packages/core/src/api/schema.d.ts` from `../atp-backend/contracts/openapi.json`
- Dev sign-in (`VITE_AUTH=supabase`, default in `apps/money/.env.development`): needs atp-backend running (`pnpm db:start`, `pnpm db:seed:dev`, `pnpm dev`). The dashed "Dev only" picker fills a seeded login (password `atp-dev-1234`).
- Without the backend: `VITE_AUTH=mock pnpm dev` (any phone/email + password; picker chooses the role). Tests always run in mock mode.
- Local test data: `pnpm seed:demo` (needs atp-backend `pnpm db:seed:dev` first; local hosts only).

## Builds

- Cloudflare Pages, one project per app, production branch only (D-042): build `pnpm --filter <app> build`, output `apps/<app>/dist`. Setup and checks: `docs/DEPLOY.md`.
- The API is on its own origin (Railway): `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` come from Pages environment variables; deployed builds fail without them (`apps/<app>/vite.config.ts`), so mock auth can never ship.
- Each app ships `public/_headers` and `public/_routes.json`; the stale-chunk 404 Pages Function is `functions/[[path]].ts` at the repo root (Pages reads `functions/` from the project root directory `/`, so both projects share it). Never add a catch-all `_redirects` or a `404.html`.
- CI (`.github/workflows/ci.yml`): format, lint, typecheck, tests, development-mode build of every app.

## Layout (per app, e.g. `apps/money/src`)

- `api` — the app's data surface: `api` (index.ts) = core `auth` + the app's real or mock functions; query hooks (queries.ts); `real.ts`; `mock/*` (same contract shapes in memory, for tests; D-012)
- `app` — router + guards, nav config, `brand.ts`
- `layout/AppShell.tsx` — sidebar/top bar/tab bar; `features/<area>` — screens
- `design/` — imported Claude Design source (reference only); inventory in `docs/DESIGN.md` (money) and `apps/patients/docs/DESIGN.md`

## Session protocol

1. Read `docs/PROGRESS.md` first. Work on the first `in-progress` / `todo` level.
2. Requirements: `../atp-backend/docs/PRD.md`. API contract: `../atp-backend/contracts/openapi.json`.
3. Before ending a session: tick tasks, add a Session log entry, commit.

## Design source

claude.ai/design project `b36a94e7-c670-4def-8152-d2aecc961820`

- Money: `ATP Clinic OS Screens.dc.html` → `apps/money/design/`
- Patients (V2): `ATP Patients.dc.html` + `patients.js` (clickable prototype with role/device switcher) → `apps/patients/design/`
- Imports: `assets/atp-logo.svg`, `support.js`
- Access needs `/design-login` (DesignSync authorization) in the Claude Code session.

## Rules

- The frontend never queries the database or Storage directly. Data goes through the API client generated from `openapi.json`. Supabase JS is used only for auth (sign-in, magic link, refresh).
- Endpoints in the contract: openapi-fetch with types from `schema.d.ts`; UI uses contract types (`@atp/core` `types.ts` aliases). Mocks return the same shapes. Endpoints not wired yet stay in the app's `src/api/mock/*` (D-012).
- Supabase JS is for auth only (`packages/core/src/lib/supabase.ts`); every API call goes through `http`.
- Styling: Tailwind with the closed token palette in `packages/ui/src/styles.css` (no raw hex in components). 2px `border-ink` boxes, radius 0, `kicker` and `tabular` utilities. Reuse `@atp/ui` before writing new markup; components shared by both apps go there.
- UI visibility follows permissions (`can('finance.settlement.manage')`), never role names.
- Money is integer paise in API payloads; format to INR only at display.
- Mobile-first: one-handed use on a 4-inch screen, large tap targets, global add button reachable from every screen (F-07).
- Quick-add expense must take under 15 seconds (PRD goal 6).
