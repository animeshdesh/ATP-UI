# atp-frontend — ATP Clinic OS PWA

Mobile-first installable PWA for ATP Rehab staff. React + TypeScript + Vite + Tailwind (PRD §8.1). Not scaffolded yet; see `docs/PROGRESS.md`.

## Session protocol
1. Read `docs/PROGRESS.md` first. Work on the first `in-progress` / `todo` level.
2. Requirements: `../atp-backend/docs/PRD.md`. API contract: `../atp-backend/contracts/openapi.json`.
3. Before ending a session: tick tasks, add a Session log entry, commit.

## Design source
claude.ai/design project `b36a94e7-c670-4def-8152-d2aecc961820`
- Main file: `ATP Clinic OS Screens.dc.html`
- Imports: `assets/atp-logo.svg`, `support.js`
- Access needs `/design-login` (DesignSync authorization) in the Claude Code session.

## Rules (apply once scaffolded)
- The frontend never queries the database or Storage directly. Data goes through the API client generated from `openapi.json`. Supabase JS is used only for auth (sign-in, magic link, refresh).
- Build screens against MSW mocks generated from the contract, then switch to the real API.
- Money is integer paise in API payloads; format to INR only at display.
- Mobile-first: one-handed use on a 4-inch screen, large tap targets, global add button reachable from every screen (F-07).
- Quick-add expense must take under 15 seconds (PRD goal 6).
