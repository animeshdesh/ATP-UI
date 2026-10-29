# ATP Patients: design import

The source is the Claude Design project `b36a94e7-c670-4def-8152-d2aecc961820`. The file is `ATP Patients.dc.html`, a clickable prototype with a device/role/screen switcher and its logic in `patients.js`. It was imported on 2026-10-28 into `apps/patients/design/`, which is reference only and excluded from lint and format. Tokens and components come from the same Modernist/ATP system as money (`packages/ui/src/styles.css`), so nothing new was added to the palette:

- warning and error colours use the existing `warn-*` / `danger-*` tokens;
- the hatched time-off pattern is the new `hatch` utility.

## Screens → code

| Prototype screen                                                                              | Route                                          | Code                                                        |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Public · Book a session (form, sent, rate-limited)                                            | `/book` (`?branch=<code>` preselects a branch) | `features/book/BookPage.tsx`                                |
| Sign in                                                                                       | `/login`, `/invite/:token`                     | `@atp/core` `LoginPage` / `InvitePage` with `app/brand.ts`  |
| Today / Calendar: mobile agenda, desktop day (therapist columns) and week                     | `/`                                            | `features/calendar/CalendarPage.tsx`                        |
| New appointment / Reschedule sheet (patient search or new, slot picker, clash, outside hours) | any screen's add button                        | `features/calendar/AppointmentSheet.tsx` + `SlotPicker.tsx` |
| Appointment sheet (details, complete / no-show / cancel, package, payment, undo)              | from calendar, profile                         | `features/calendar/DetailSheet.tsx`                         |
| Inquiries: mobile cards, desktop table + detail panel, empty state with booking link          | `/inquiries`                                   | `features/inquiries/InquiriesPage.tsx`                      |
| Book from request (existing patient by phone, slot picker, WhatsApp confirmation)             | from Inquiries                                 | `features/inquiries/ConvertSheet.tsx`                       |
| Patients list / table, new patient (duplicate phone)                                          | `/patients`                                    | `features/patients/PatientsPage.tsx`, `NewPatientSheet.tsx` |
| Patient profile: Overview, Notes (locked without `patients.clinical`), Visits, Payments       | `/patients/:id?tab=`                           | `features/patients/PatientProfile.tsx`                      |
| Sell package, Record payment                                                                  | from profile                                   | `features/patients/MoneySheets.tsx`                         |
| Availability: working hours per branch, time off                                              | `/availability`                                | `features/availability/AvailabilityPage.tsx`                |
| Branches (Owner)                                                                              | `/settings/branches`                           | `features/branches/BranchesPage.tsx`                        |
| Users & roles (money design 2i/2j; moved here, D-051): members, invites, permission matrix    | `/settings/users`, `/settings/roles`           | `features/settings/RolesPage.tsx`                           |
| More (mobile), No permission, offline banner                                                  | `/more`, guards, shell                         | `features/more/*`, `layout/Shell.tsx`                       |

**Shell:** `layout/Shell.tsx` provides the sidebar with its branch picker and the "Manage users in ATP Money" link, the desktop top bar, the mobile header with the branch picker, and the tab bar with the add button. Screens set the title and main action through `usePageHeader` (`app/header.tsx`). The branch picker state, remembered per user on the device, lives in `app/branch.tsx`.

## Prototype role switch → permissions

| Prototype                                          | Code                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Therapist: "My day", own column only, no Inquiries | `appointments.manage` = `own`; Inquiries need `patients.manage` at `all` |
| Front desk: Notes locked                           | no `patients.clinical`                                                   |
| Owner: Branches                                    | `settings.branches.manage`                                               |

## Deliberate differences

- **"Payment pending" tag:** dropped. It is the V2b token payment (D-045).
- **Mobile calendar branch chips:** dropped. The header branch picker does the same job.
- **Desktop patients:** clicking a row opens the profile instead of a preview panel.
- **Convert sheet:** no "Create a new one" option for a known phone. Phone is unique per clinic (PRD §6.3), so a known number always books that patient.
- **Working hours:** the prototype's per-day "+" becomes an Edit mode per therapist (time, branch, clinic or home, remove).
- **Sample week:** dated from the current week. In 2026, 28 Oct is a Wednesday; the prototype labelled it Tuesday.
- **Session fee default:** ₹800 at the clinic, ₹1,200 for a home visit (`defaultFeePaise`). It is editable until fees are configured (PRD §9).
