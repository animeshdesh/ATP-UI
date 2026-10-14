# atp-frontend — ATP Clinic OS PWA

Mobile-first installable PWA for ATP Rehab staff. React 19 + TypeScript 6.0 + Vite 8 + Tailwind 4 + React Router 8 + TanStack Query (PRD §8.1).

## Commands

- `pnpm dev` on http://localhost:5553 (`strictPort`: fails instead of moving, because Supabase auth redirects target 5553) · `pnpm build` · `pnpm check` (lint + typecheck + test)
- `pnpm api:types` regenerates `src/api/schema.d.ts` from `../atp-backend/contracts/openapi.json`
- Dev sign-in: any phone/email + password; the dashed "Dev only" picker chooses Owner / Therapist / Front desk.

## Layout

- `src/api` — the only data surface: `api` (index.ts), query hooks (queries.ts), `client.ts` (openapi-fetch), `mock/` (in-memory endpoints not yet in the contract, D-012)
- `src/app` — router + guards, session/permissions (`useSession().can`), nav config, providers
- `src/components/ui` — design-system components; `src/layout/AppShell.tsx` — sidebar/top bar/tab bar
- `src/features/<area>` — screens; `src/domain/types.ts` — provisional domain types
- `design/` — imported Claude Design source (reference only); inventory and tokens in `docs/DESIGN.md`

## Session protocol

1. Read `docs/PROGRESS.md` first. Work on the first `in-progress` / `todo` level.
2. Requirements: `../atp-backend/docs/PRD.md`. API contract: `../atp-backend/contracts/openapi.json`.
3. Before ending a session: tick tasks, add a Session log entry, commit.

## Design source

claude.ai/design project `b36a94e7-c670-4def-8152-d2aecc961820`

- Main file: `ATP Clinic OS Screens.dc.html`
- Imports: `assets/atp-logo.svg`, `support.js`
- Access needs `/design-login` (DesignSync authorization) in the Claude Code session.

## Rules

- The frontend never queries the database or Storage directly. Data goes through the API client generated from `openapi.json`. Supabase JS is used only for auth (sign-in, magic link, refresh).
- Endpoints in the contract: openapi-fetch + MSW handlers typed from the schema. Endpoints not yet in the contract: `src/api/mock/server.ts`, swapped out level by level (D-012).
- Styling: Tailwind with the closed token palette in `src/styles.css` (no raw hex in components). 2px `border-ink` boxes, radius 0, `kicker` and `tabular` utilities. Reuse `src/components/ui` before writing new markup.
- UI visibility follows permissions (`can('finance.settlement.manage')`), never role names.
- Money is integer paise in API payloads; format to INR only at display.
- Mobile-first: one-handed use on a 4-inch screen, large tap targets, global add button reachable from every screen (F-07).
- Quick-add expense must take under 15 seconds (PRD goal 6).
