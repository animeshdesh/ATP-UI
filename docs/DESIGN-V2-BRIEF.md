# Claude Design brief: ATP Patients (V2)

Paste or upload this file into Claude Design. Work in the existing project `b36a94e7-c670-4def-8152-d2aecc961820` (ATP Clinic OS), so the "Modernist" design system, the ATP tokens and the components are reused. Create a new canvas file named **`ATP Patients Screens.dc.html`** next to `ATP Clinic OS Screens.dc.html`.

---

## 1. What we are designing

**ATP Patients** is the second app of ATP Clinic OS, for ATP Rehab, a physiotherapy clinic in Karvenagar, Pune. It runs at `patient.atprehab.si` and has two faces:

1. **Public booking request** (`/book`): a patient on their phone asks for an appointment. There is no login. They choose a **preferred day and part of the day**, not an exact slot. Staff call back to confirm.
2. **Staff app** (everything else, after sign-in):
   - an inquiry queue
   - a shared calendar
   - patient records
   - therapist availability

The finance app (`money.atprehab.si`, already designed and live) stays separate. Both apps share the brand, design system, login and roles.

**Users:**

| Role                    | Uses the staff app for                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Front desk              | Works the inquiry queue, books and reschedules for everyone, manages patient profiles. **Cannot see clinical notes.** |
| Therapist               | Sees **own** schedule and **own** patients, writes clinical/session notes, marks sessions completed or no-show.       |
| Owner (clinic partners) | Sees everything.                                                                                                      |

Constraints that shape the UI:

- **Mobile-first.** Most use is one-handed on a phone, between sessions. Tap targets are at least 44 px. The 390 px layout matters most.
- **Low technical familiarity.** Plain words, few steps, no jargon.
- **Fast.** Front desk should book a patient in under 30 seconds once they're on the phone.
- **English** labels; numbers and money in INR (₹1,200).

## 2. Design system: reuse, don't reinvent

Use the existing Modernist/ATP system exactly as in `ATP Clinic OS.dc.html`:

- **Palette (closed; no new colours):**
  - `ink` #201E1D: text and 2 px borders
  - `canvas` #F1F1FE: app background
  - `white` / `surface`: panels and inputs
  - `accent` #06AEEF with ramp 100–900: primary actions, selected states; `accent-700` for links
  - `neutral-100…900`
  - `danger` #E5391B / bg #FFE4DE / fg #9A1A00
  - `warn` #E8A317 / bg #FFF1D1 / fg #7A4F00
  - `rule` (ink 14%), `divider` (ink 40%), `scrim` (ink 45%)
- **Shape:** boxes with a **2 px `ink` border**, **radius 0**, `shadow-md` / `shadow-lg` only on overlays.
- **Type:** Archivo 400–800. Headings are 800 at −0.01em. Use the **`kicker`** style for small labels (11 px uppercase, 0.08em tracking, 600, neutral-700) and **`tabular`** figures for times, counts and money.
- **Components to reuse:**
  - Button and IconButton
  - Segmented
  - Field / Input / Select
  - Panel
  - SectionHeader
  - StatGrid / Stat
  - Tag
  - Avatar
  - EmptyState
  - Note
  - Sheet (bottom sheet on mobile, 460 px right panel on desktop)
  - Dialog
  - Toast
- **Shell:** same as money.
  - **Mobile:** a header (ATP mark, kicker subtitle, 28 px title, avatar) and a bottom tab bar with a centre **+** button.
  - **Desktop** (≥1024 px): a 236 px sidebar (logo, nav, user and sign-out), a top bar (26 px title and primary action), and 24/32 px content padding.
- **Brand:** `assets/atp-logo.svg`, `assets/atp-mark.svg`. Footer line: "Built by Avyanta Labs for ATP Rehab".

New patterns needed, built from the same primitives (2 px ink, radius 0, accent for selection):

- **Calendar grid:** a time axis with therapist columns.
- **Appointment block:** status by fill or left bar.
- **Time-slot chips.**
- **Status tags.**

Do not introduce gradients, rounded cards or new colours.

**Status colours** (use Tag tones):

| Status                | Tone                    |
| --------------------- | ----------------------- |
| New inquiry           | accent                  |
| Contacted             | warn                    |
| Booked                | ink outline             |
| Closed                | neutral                 |
| Confirmed appointment | accent fill             |
| Completed             | neutral fill + check    |
| No-show               | danger                  |
| Cancelled             | neutral, struck through |

## 3. Frames

Make **mobile 390×844** and **desktop 1280×800**, as in the finance canvas. Name the frames `P<n><letter>` so they map to code. Use the sample data in §5.

### Public (no login, mobile-first; desktop is a centred 480 px card on canvas)

| Frame   | Screen             | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1a** | Book: request form | ATP logo + clinic name and address. Title "Book a session". Fields: **Full name** · **Phone** (+91 prefix, numeric keypad) · Email (optional) · **Preferred day** (chips: Today, Tomorrow, then a date picker) · **Preferred time** (Segmented: Morning · Afternoon · Evening · Any) · Reason (optional, short text, e.g. "Knee pain after running"). Primary button "Request a call back". Small print: "We'll call you to confirm a time. No payment now." |
| **P1b** | Book: sent         | Big check. Title "Request sent". Text: "We'll call you on +91 98xxx xxx21 soon to confirm your session." Clinic phone as a tap-to-call link, address and a map link.                                                                                                                                                                                                                                                                                         |
| **P1c** | Book: errors       | Inline field errors (missing name, invalid phone). Too-many-requests state: "Please try again in a few minutes or call us."                                                                                                                                                                                                                                                                                                                                  |

### Staff: navigation

- **Mobile tabs:**
  - Front desk: **Today · Inquiries · + · Patients · More**
  - Therapist: **Today · + · Patients · More**
  - **+** opens "New appointment".
- **Desktop sidebar:** Calendar · Inquiries (count badge) · Patients · Availability · (Settings → "Manage users in ATP Money" link).
- **Sign in / invite:** reuse frames 1a–1c from money. Change the subtitle to "ATP Patients · staff only".

### Inquiries (Front desk, Owner)

| Frame   | Screen                     | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P2a** | Inquiry queue (mobile)     | Segmented filter: New (4) · Contacted (2) · All. Each row shows name, phone (tap to call), preferred day and part of day, reason, received time ("12 min ago") and a status tag. Row actions: **Call**, **Book**, **⋯** (Mark contacted, Close with a reason: Not interested / Duplicate / Wrong number / Other).                                                                                                                                                                                                              |
| **P2b** | Inquiry queue (desktop)    | A table: Received · Name · Phone · Preferred · Reason · Status · Actions. The detail panel opens on the right.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **P2c** | Convert to booking (sheet) | Step 1 is patient match. "Existing patient found: Priya Kulkarni (+91 98220 41721) · last visit 12 Oct" with options to Use this patient or Create a new one. Step 2 is the slot: therapist, date, free-slot chips for that therapist (e.g. 10:00 · 10:45 · 11:30 · 16:00), duration (30 / 45 / 60 min), location (Clinic / Home visit; Home shows an address field). Primary "Confirm booking". Secondary "Save patient only". After saving, a **WhatsApp** button opens a prefilled message for the patient (staff send it). |
| **P2d** | Empty queue                | "No new requests". Share the booking link `patient.atprehab.si/book` (Copy, WhatsApp).                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Calendar (everyone; Therapist sees only own column)

| Frame   | Screen                         | Contents                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P3a** | Today (mobile, Front desk)     | Date switcher (‹ Tue 28 Oct ›, Today). Therapist filter chips (All · Dr. Sameer · Dr. Neha · Rahul). Agenda list grouped by time: time range, patient, therapist, location tag (Clinic / Home), status. Current-time line. Gaps show "Free 11:30–12:15".                                                                                                                                          |
| **P3b** | My day (mobile, Therapist)     | Own appointments only. Next session highlighted at the top with patient name, chief complaint and "Open notes". Quick actions per session: **Completed**, **No-show**, **Notes**.                                                                                                                                                                                                                 |
| **P3c** | Week (desktop)                 | A grid: 8:00–20:00 on the vertical axis, Mon–Sat on the horizontal, optional therapist filter. Blocks show patient name and time, with status as fill. Time off is hatched grey ("Leave", "Lunch"). Drag or click to create is optional; at minimum click an empty cell to start a new appointment.                                                                                               |
| **P3d** | Day by therapist (desktop)     | One column per therapist, 15-minute rows. This is the front desk's main booking view.                                                                                                                                                                                                                                                                                                             |
| **P3e** | Appointment sheet: new or edit | Patient (search by name or phone, or "+ New patient" inline), therapist, date, start time (free-slot chips plus manual time), duration, location (Clinic / Home + address), notes. Conflict state: inline danger Note "Dr. Neha already has Amit Joshi at 10:00–10:45" with the "Save" button disabled. Outside-hours warning: a warn Note "Outside Dr. Neha's working hours" with "Book anyway". |
| **P3f** | Appointment detail + status    | Summary (patient, time, therapist, location, source "Web request"). Actions: Completed · No-show · Cancel · Reschedule. Cancel/No-show asks for a reason (Patient request · Therapist unavailable · No response · Rescheduled · Other) and an optional note. Completing offers "Use package session (3 of 10 left)" and "Record payment" (amount ₹, mode Cash/UPI/Card).                          |

### Patients

| Frame   | Screen                                          | Contents                                                                                                                                                                                                                                                                                                                                          |
| ------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P4a** | Patient list (mobile)                           | Search (name or phone). Rows show avatar initials, name, phone, last visit, next appointment, and a package tag "4 left". The **+** creates a patient.                                                                                                                                                                                            |
| **P4b** | Patient list (desktop)                          | A table plus a right detail panel.                                                                                                                                                                                                                                                                                                                |
| **P4c** | Patient profile: overview                       | Header: name, age/gender, phone (call, WhatsApp), referral source. Tabs (Segmented): **Overview · Notes · Visits · Payments**. Overview shows chief complaint, address, the next appointment card with Book again, an active package card (sessions used/total as a bar; "Sold 12 Oct · ₹6,000"), and quick stats (visits, no-shows, total paid). |
| **P4d** | Patient profile: notes (Therapist / Owner only) | Timeline of notes by kind tag: Diagnosis · Treatment plan · Session · General. Each note shows author, date and a linked session. Composer: kind, text, "Save note". Front desk instead sees a lock panel: "Clinical notes are visible to therapists and owners."                                                                                 |
| **P4e** | Patient profile: visits                         | Past and upcoming appointments with status tags; no-show count.                                                                                                                                                                                                                                                                                   |
| **P4f** | Patient profile: payments + packages            | Payments list (date, amount, mode, linked session; "Recorded in ATP Money"). "Sell package" sheet: name (e.g. "10 sessions"), sessions, price ₹, mode. "Record payment" sheet.                                                                                                                                                                    |
| **P4g** | New / edit patient (sheet)                      | Full name, Phone (required; duplicate warning: "+91 98220 41721 already belongs to Priya Kulkarni. Open profile"), Email, Date of birth or Age, Gender, Address, Referral source (Doctor / Friend / Google / Walk-in / Other), Chief complaint.                                                                                                   |

### Availability (Therapist: own; Front desk and Owner: all)

| Frame   | Screen        | Contents                                                                                                                                                                                            |
| ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P5a** | Working hours | One card per therapist with Mon–Sun rows of time ranges and location (e.g. Mon 09:00–13:00 Clinic, 16:00–20:00 Clinic; Sat 09:00–13:00 Home visits), plus "Add range". Copy Monday to all weekdays. |
| **P5b** | Time off      | List and add sheet: therapist, from–to (date + time), reason (Leave / Training / Personal). Shows on the calendar as hatched blocks.                                                                |

### Common states (one frame each is enough)

| Frame   | State                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| **P6a** | Loading skeleton for list and calendar                                                                               |
| **P6b** | Offline banner: "You're offline. Changes can't be saved right now."                                                  |
| **P6c** | No permission: "Ask an owner for access to Patients."                                                                |
| **P6d** | Toasts: "Booked Priya Kulkarni · Tue 28 Oct, 10:00 with Dr. Neha"; "Slot just got taken: pick another time" (danger) |

## 4. Interaction notes

- **Booking from an inquiry should take three taps** after the call: Book → slot chip → Confirm.
- **Free-slot chips** come from working hours minus time off minus confirmed appointments. Show 4–8 chips and "More times".
- **A double booking is impossible.** If someone else takes the slot meanwhile, show the danger toast and refresh the chips.
- **Phone is the unique key per patient.** Always surface an existing match before creating a new patient.
- **Clinical notes are hidden from Front desk.** Design the locked state, not just its absence.
- **WhatsApp is manual in this version.** Buttons open `wa.me` with prefilled text. Example confirmation: "Hi Priya, your physiotherapy session at ATP Rehab is confirmed for Tue 28 Oct, 10:00 with Dr. Neha. Address: Lane No. 2, Bhagyoday Colony, Karvenagar, Pune."
- **No payments online** in this version. The ₹100 token comes later, so leave room for a "Payment pending" tag but don't design the payment flow.
- **Times:** 12-hour or 24-hour, but consistent; we suggest 24-hour "10:00–10:45" in tabular figures. Dates look like "Tue 28 Oct".

## 5. Sample data

- **Clinic:** ATP Rehab, Lane No. 2, Bhagyoday Colony, Karvenagar, Pune. Phone +91 98220 41736.
- **Therapists:**
  - Dr. Sameer Ushkewar (Owner)
  - Dr. Neha Patil
  - Rahul Deshpande (home visits on Saturdays)
- **Front desk:** Snehal More.
- **Patients:**

  | Patient        | Age | Complaint                                | Visits | Package                    |
  | -------------- | --- | ---------------------------------------- | ------ | -------------------------- |
  | Priya Kulkarni | 34  | right knee pain after running            | 6      | 10-session package, 4 left |
  | Amit Joshi     | 52  | lower back pain, desk job                | 2      | —                          |
  | Sunita Pawar   | 67  | post knee replacement rehab, home visits | 9      | —                          |
  | Rohan Gokhale  | 19  | ankle sprain, football                   | 1      | —                          |
  | Meera Shah     | 41  | frozen shoulder                          | 0      | — (new from web request)   |

- **Inquiries:**
  - Meera Shah: Tomorrow, Morning, "Shoulder stiff for 3 months" (New, 12 min ago)
  - Kunal Jadhav: Any day, Evening, "Neck pain" (New, 1 h ago)
  - Asha Kale: Sat, Morning, "Father needs home visit after stroke" (Contacted)
- **Today (Tue 28 Oct):**

  | Time        | Patient | Therapist | Location         | Status    |
  | ----------- | ------- | --------- | ---------------- | --------- |
  | 09:00–09:45 | Priya   | Neha      | Clinic           | Completed |
  | 10:00–10:45 | Amit    | Neha      | Clinic           | Confirmed |
  | 10:00–11:00 | Sunita  | Rahul     | Home             | Confirmed |
  | 11:30–12:15 | Rohan   | Sameer    | Clinic           | No-show   |
  | 13:00–14:00 | Sameer  | —         | Lunch (time off) | —         |
  | 16:00–16:45 | Meera   | Neha      | Clinic           | Confirmed |

## 6. Handoff

- Keep all frames in `ATP Patients Screens.dc.html`, embedding a prototype `ATP Patients.dc.html`, like the finance file. Put seed data in a JS file such as `patients.js`.
- When it's done, tell Claude Code. It imports the files with `/design-login` (DesignSync) into `atp-frontend/apps/patients/design/` and maps the frames P1a–P6d to routes in `docs/DESIGN.md`.
