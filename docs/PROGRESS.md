# Frontend progress

Status legend: `todo` · `in-progress` · `done` · `blocked`.
Frontend levels unlock as backend contracts land (see `../atp-backend/docs/PROGRESS.md`).

| Level | Scope | Depends on | Status |
|---|---|---|---|
| F0 | Design import & inventory | `/design-login` | blocked (needs `/design-login`) |
| F1 | Scaffold (Vite, React, TS, Tailwind, PWA, routing, API client, MSW) | F0 tokens | todo |
| F2 | UI kit from design | F0, F1 | todo |
| F3a | Auth + app shell + role-aware nav | backend L2 contract | todo |
| F3b | Quick-add entry, ledger list, edit/delete, receipt upload, offline queue | backend L3 contract | todo |
| F3c | Settlement view + mark settled | backend L4 | todo |
| F3d | Dashboard | backend L5 | todo |
| F3e | Budgets & funds | backend L6 | todo |
| F3f | Reports: PDF/CSV/XLSX download, share sheet | backend L7 | todo |
| F4 | Settings: categories, partners, roles, members, invites | backend L2–L3 | todo |

## F0 — Design import · `blocked`
- [ ] Run `/design-login` in Claude Code
- [ ] Import `ATP Clinic OS Screens.dc.html`, `assets/atp-logo.svg`, `support.js`
- [ ] `docs/DESIGN.md`: screen inventory mapped to PRD IDs, tokens (colors, type, spacing, radii), components list

## F1 — Scaffold · `todo`
- [ ] Vite + React + TS + Tailwind; ESLint/Prettier/Vitest
- [ ] PWA (manifest, service worker, installable)
- [ ] Router, query client (TanStack Query)
- [ ] `openapi-typescript` + `openapi-fetch` client generated from backend contract
- [ ] MSW handlers for development

---

## Session log
| Date | Session summary | Next step |
|---|---|---|
| 2026-10-14 | Created tracker. Design import blocked: DesignSync needs `/design-login`. | Run `/design-login`, then F0. |
