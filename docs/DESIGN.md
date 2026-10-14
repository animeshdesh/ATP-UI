# Design import

Source: claude.ai/design project `b36a94e7-c670-4def-8152-d2aecc961820`, imported 2026-10-14 via DesignSync.
Local copies (reference only, not bundled): `design/`.

| File                                         | Role                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `design/ATP Clinic OS Screens.dc.html`       | Canvas: 26 frames that embed the prototype with fixed props                                                  |
| `design/ATP Clinic OS.dc.html`               | The prototype template (all screens, sheet, dialog, toast)                                                   |
| `design/clinic-os.js`                        | Prototype logic + seed data (ported to `src/api/mock/fixtures.ts`)                                           |
| `design/assets/modernist.css`                | Base design system ("Modernist") tokens and classes                                                          |
| `design/assets/atp-logo.svg`, `atp-mark.svg` | Brand. C2PA metadata stripped; `atp-mark.svg` had nested `<path>` elements (only the first rendered) — fixed |
| `design/support.js`                          | Claude Design runtime (`x-dc`). Not used by the app                                                          |

## Screen inventory → routes → PRD

| Frame      | Screen                               | Route                  | Component                                | PRD             |
| ---------- | ------------------------------------ | ---------------------- | ---------------------------------------- | --------------- |
| 1a, 1c     | Sign in (mobile / desktop)           | `/login`               | `features/auth/LoginPage`                | §3, L2          |
| 1b         | Accept invite                        | `/invite?token=`       | `features/auth/InvitePage`               | §3, L2          |
| 2a, 3a     | Owner dashboard                      | `/`                    | `features/dashboard/DashboardPage`       | 5.5             |
| 2b, 3b, 4b | Quick-add entry (sheet / side panel) | global                 | `features/entry/QuickAddSheet`           | F-01…F-05, F-07 |
| 2c, 4c, 4e | Transactions + filters               | `/transactions`        | `features/transactions/TransactionsPage` | F-06, 5.1       |
| 2d, 3c     | Partner settlement                   | `/settlement`          | `features/settlement/SettlementPage`     | 5.3             |
| 2e, 3f     | Budgets & funds                      | `/budgets`             | `features/budgets/BudgetsPage`           | 5.4             |
| 2f         | Recurring items                      | `/recurring`           | `features/recurring/RecurringPage`       | 5.2             |
| 2g, 3d     | CA report / export                   | `/reports`             | `features/reports/ReportsPage`           | F-20…F-24       |
| 2h         | Categories                           | `/settings/categories` | `features/settings/CategoriesPage`       | 5.2             |
| 2i, 3e     | Roles & permissions                  | `/settings/roles`      | `features/settings/RolesPage`            | §3              |
| 2j         | Users + invite dialog                | `/settings/users`      | `features/settings/RolesPage`            | §3              |
| 2k         | Audit log                            | `/audit`               | `features/audit/AuditPage`               | §8 NFR          |
| 2l         | More (mobile)                        | `/more`                | `features/more/MorePage`                 | F-07            |
| 4a         | Therapist · My summary               | `/`                    | `DashboardPage` (own scope)              | §3, 5.7         |
| 4d         | Front desk · Today                   | `/`                    | `DashboardPage` (own scope)              | §3              |

Role-specific labels (`app/nav.ts`): Therapist sees "My summary" / "My entries"; Front desk sees "Today" / "Entries". Navigation and route guards derive from permissions, not role names.

## Layout

- Breakpoint `lg` (1024px) switches mobile → desktop. Design frames: mobile 390×844, desktop 1280×800.
- Mobile: header (mark + kicker subtitle, 28px title, avatar), scrolling content (16px padding), bottom tab bar with centre add button (Owner: Home · Entries · + · Settle · More; others: Home · + · Entries).
- Desktop: 236px sidebar (logo, main nav, Settings group, user + sign out), top bar (26px title, period switch on owner dashboard, Add entry), content 24/32px padding.
- Quick-add: bottom sheet from 64px below top on mobile, 460px right panel on desktop.

## Tokens (`src/styles.css`, Tailwind v4 `@theme`, closed palette)

| Token                    | Value                             | Use                                                                               |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------- |
| `ink`                    | `#201e1d`                         | text, 2px borders, stat-grid rules                                                |
| `canvas`                 | `#F1F1FE`                         | app background                                                                    |
| `white` / `surface`      | `#FFFFFF`                         | panels, inputs                                                                    |
| `accent` (+ `-100…-900`) | `#06AEEF`                         | primary buttons, selected segments, active nav; `accent-700` income figures/links |
| `neutral-100…900`        | Modernist ramp                    | secondary text (`neutral-700`), placeholders                                      |
| `danger` / `-bg` / `-fg` | `#E5391B` / `#FFE4DE` / `#9A1A00` | over budget, overdue, deleted, "owes"                                             |
| `warn` / `-bg` / `-fg`   | `#E8A317` / `#FFF1D1` / `#7A4F00` | near limit (≥80%), edited, invited                                                |
| `rule`                   | ink 14%                           | row separators                                                                    |
| `divider`                | ink 40%                           | section header underline, chrome borders                                          |
| `scrim`                  | ink 45%                           | modal backdrop                                                                    |

- Type: Archivo 400/500/600/700/800 (self-hosted via `@fontsource/archivo`). Headings 800, −0.01em. `kicker` utility = 11px uppercase 0.08em 600 neutral-700. `tabular` utility for money.
- Radii: 0 everywhere. Shadows: `shadow-md` (report preview), `shadow-lg` (sheet, dialog, toast).
- Tap targets ≥ 44px (`min-h-11`); primary CTAs 52–56px.
- Icons: `lucide-react` (design used the lucide-static font).

## Components (`src/components/ui`)

`Button` (primary / outline / link / ghost; `trailingIcon` for full-width CTAs), `IconButton`, `Segmented`, `Input`, `Select`, `Field`, `Panel`, `SectionHeader`, `StatGrid` + `Stat`, `Tag` (accent / neutral / danger / warn / solid), `Avatar`, `Note`, `EmptyState`, `Loading`, `Sheet`, `Dialog`, `ToastProvider` / `useToast`. Feature-level: `EntryRow`, `PeriodSwitch`.

## Deviations from the prototype

- Sign-in fields start empty (prototype pre-filled demo values). A dashed "Dev only · sign in as" role picker appears only in dev builds.
- Date in the entry form is a real date picker (max today) instead of a static "Today".
- Receipt is a real camera/gallery file input with a 5 MB check (F-04), not a toggle.
- Settle-up "Share on WhatsApp" opens `wa.me` with the transfer list.
- Report month selector moves between months; preview data is still the September mock.
- Buttons for features not yet backed by an API (Add partner, Edit profit shares, New fund, New role, rename category) show a toast naming the backend level.
