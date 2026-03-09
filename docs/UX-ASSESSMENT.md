# BakeryOS UX & Product Assessment

**Date:** March 9, 2026
**Reviewer:** UX/Product Design Assessment
**Application:** BakeryOS — Brown Sugar Bakery Operations Platform

---

## Executive Summary

BakeryOS is a task management and operations platform for Brown Sugar Bakery with bilingual support, PIN-based auth, role-based task assignment, and SOP management. The foundation is solid — the tech stack is modern, the brand design is warm and distinctive, and the core domain model (zones, roles, SOPs, tasks) is well-structured.

However, the application has significant UX friction, information architecture issues, and missing features that would prevent it from competing with established order/task management platforms like **7shifts**, **Jolt**, **Zenput/Crunchtime**, **HotSchedules**, or **MarketMan**.

---

## Screen-by-Screen Assessment

### 1. Splash Screen (`/`)

**What works:** Brand presence, animated medallion and particles create a premium feel.

**Issues:**

- **3.2-second forced wait** with no skip — unacceptable for staff who clock in multiple times daily. Competitors show splash for 1s max or skip entirely on return visits.
- No information delivered during the wait (no loading indicator, no day summary).
- Returns users who are already authenticated to the login screen (logout on mount).

**Severity:** HIGH — this is the first impression and it's wasted time.

---

### 2. Login Page (`/login`)

**What works:** Clean layout, language toggle, staff grid with initials, dual entry paths (name/role).

**Issues:**

- **Two mental models on one screen** — "Select Your Role" AND "Select Your Name" creates decision paralysis. Staff must understand the difference between role-first and name-first flows. Competitors (Jolt, 7shifts) use a single entry point: either a name list OR a PIN-only entry.
- Role buttons show deduplicated types (one "Staff", one "Manager") — but the actual roles are Cashier 1, Cashier 2, etc. This intermediate step adds no value.
- `logout()` called on mount clears auth state — if someone accidentally navigates here, they're logged out.
- No search/filter for the staff grid — won't scale beyond ~12 people.

**Severity:** HIGH — login friction directly impacts adoption.

---

### 3. PIN Page (`/login/pin`)

**What works:** Haptic feedback, shake animation on error, clean keypad layout, auto-submit on 4th digit.

**Issues:**

- PIN error message ("Incorrect PIN. Try again.") persists even as the user retries — it only clears on navigation.
- No lockout after N failed attempts — security gap.
- No "forgot PIN" or manager override flow.
- Hardcoded `zoneColor="#570522"` regardless of which zone the user is heading to.
- Back button goes to `/login` which triggers `logout()` again.

**Severity:** MEDIUM

---

### 4. Role Selection (`/login/role`)

**What works:** Two-step animated flow (zone then role) feels intentional, zone cards show role count, back button navigates between steps.

**Issues:**

- **This is step 4 of the login flow** (splash → login → PIN → zone/role). Competitors typically achieve clock-in within 2 steps (name/PIN or PIN-only).
- Zones with 0 roles are shown but disabled (`opacity-40`) — they should be hidden entirely.
- No indication of which zone/role the user had previously — no "last used" shortcut.
- The zone → role drill-down doesn't show any preview of what tasks they'll get.
- If there's only one role in a zone, the user still has to tap it — should auto-select.

**Severity:** HIGH — every extra step in clock-in is adoption friction.

---

### 5. Staff Dashboard (`/zone/[slug]/staff`)

**What works:** Zone-colored header with live clock, breadcrumb trail, streak counter, bottom nav.

**Issues:**

- **Zone header consumes ~200px** of screen height (logo + title + date + time + breadcrumb). On a phone, this leaves barely half the screen for content. The live clock with seconds updates every second — unnecessary re-renders.
- **All tasks expanded by default** — with 6-7 tasks each having SOP steps, the page is extremely long and overwhelming. Better pattern: show collapsed cards with a "complete" swipe/tap, expand only on demand.
- **No task grouping or time awareness** — morning tasks, midday tasks, and closing tasks are all shown in a flat list. Competitors group by time block or category.
- **SOPs tab shows ALL zone SOPs** — not filtered to the user's role. A Cashier 1 sees every SOP in FOH, including Cashier 2-4 tasks.
- **Profile tab is barebones** — just initials, name, and a logout button. No shift history, no stats, no preferences.
- **Bottom nav labels** — the SOPs tab label is "Procedures" which may confuse staff who think in terms of "tasks."
- **Print button** on the task list is valuable but the flow (dialog → render → window.print with 300ms timeout) is fragile.

**Severity:** HIGH — this is where staff spend 95% of their time.

---

### 6. Manager Dashboard (`/zone/[slug]/manager`)

**What works:** Tab-based layout, zone health card with color-coded progress, real-time updates, drag-and-drop reorder, AI SOP generation, print system.

**Issues:**

- **Four tabs with overlapping concerns:**
  - Overview = Zone Health + Current Tasks + Alerts
  - Tasks = Current Tasks (again, different view) + Zone filter + Search
  - Library = SOPs with status/zone/category filters
  - These three tabs all show SOPs/tasks in different ways — confusing mental model.
- **Overview tab is overloaded** — it tries to be a dashboard AND a task management screen. Tasks here are grouped by `assigned_staff` (a different grouping than the Tasks tab which groups by role).
- **Drag handles (GripVertical)** are 16x16px — below the 44x44px minimum touch target for mobile.
- **Delete confirmation has 3 options** (Cancel, Delete Permanently, Save to Library) — 3-option dialogs have poor UX. Users hesitate and misclick.
- **"Add Task" creates a full SOP** — the SOP editor is a heavy form for what might be "clean the bathroom." There's no lightweight quick-add.
- **Team tab** shows staff but the link between staff and their actual role-based task assignments is invisible. You can't see "what tasks does Cashier 1 have today?"
- **Settings/Roles link** is buried at the bottom as a ghost button — easy to miss.
- **No manager-specific views:** No daily summary, no shift handoff notes, no variance reporting, no labor cost tracking.

**Severity:** HIGH — manager experience determines whether the system gets enforced.

---

### 7. Admin Roles Page (`/admin/roles`)

**What works:** Clean grouped-by-zone layout, staff/manager toggle, auto-slug generation.

**Issues:**

- **No way to manage role_sop_assignments** from this UI — the core feature (which SOPs belong to which role) can only be set via direct DB manipulation.
- **No zone CRUD** — can only manage roles, not create/edit zones.
- **Hard delete** with no soft-delete option — dangerous for a role with existing shifts/completions.
- **Accessible only from manager dashboard** — no global admin route or menu.
- **Not internationalized** — all labels are hardcoded English.

**Severity:** HIGH — this is critical admin infrastructure that's incomplete.

---

## Cross-Cutting Issues

### Navigation & Information Architecture

- Staff uses bottom nav; manager uses top tabs — inconsistent paradigm.
- Legacy routes still exist (`/pin`, `/role`, `/zone`, `/login/zone`) creating potential dead ends.
- No global navigation or app shell — each page is a standalone view.

### Accessibility

- No keyboard navigation support visible.
- Color contrast may be insufficient with light brown/cream palette.
- Text sizes go very small (10px, 8px) which hurts readability.
- Touch targets on drag handles and action buttons are below 44x44px minimum.

### Localization

- Core UI is bilingual (EN/ES) but admin pages are English-only.
- Some translation keys appear to be missing or mismatched.
- No RTL support consideration.

### Performance

- Live clock with seconds causes per-second re-renders on dashboard.
- All tasks expanded = large DOM on staff dashboard.
- No virtualization for long lists.

---

## Competitive Benchmark

| Feature | BakeryOS | Jolt | 7shifts | Zenput |
|---------|----------|------|---------|--------|
| Clock in/out | 4 steps | 1-2 steps | 1 step | 2 steps |
| Task checklists | Yes (basic) | Yes (rich) | No | Yes (rich) |
| Task dependencies | No | Yes | No | Yes |
| Photo verification | Stub only | Yes | No | Yes |
| Temp logging/food safety | No | Yes | No | Yes |
| Shift scheduling | No | No | Yes | No |
| Notifications/alerts | Passive only | Push + SMS | Push | Push + email |
| Analytics/reporting | No | Yes | Yes | Yes |
| Offline mode | No (PWA stub) | Yes | Yes | Yes |
| Shift handoff notes | No | Yes | No | Yes |
| Multi-location | No | Yes | Yes | Yes |
| Inventory integration | No | No | No | Yes |
| Communication tools | No | Yes | Yes | No |
| Time tracking | No | No | Yes | No |

---

## Implementation Plan

### Phase 1: Foundation Fixes (Critical UX Debt)

*Goal: Remove friction, fix broken flows, make the core loop work smoothly.*

#### 1.1 — Streamline Login to 2 Steps

- Remove splash screen auto-delay; show only on first launch, skip on return visits
- Combine login into: **PIN Entry → Auto-identify → Confirm Zone/Role → Go**
- Implement "remember last zone/role" so returning users get a 1-tap shortcut
- Auto-select zone/role if there's only one option
- Add PIN lockout after 5 failed attempts

#### 1.2 — Fix Staff Dashboard Layout

- Reduce header height: collapse logo, remove seconds from clock, make breadcrumb smaller
- Default tasks to **collapsed** with a prominent single-tap "Complete" button on each card
- Expand on tap to show SOP steps (current behavior but inverted default)
- Group tasks by category/time block (opening, service, closing)
- Add swipe-to-complete gesture for quick task completion
- Add "undo" toast for accidental completions

#### 1.3 — Clean Up Manager Information Architecture

- Merge Overview + Tasks into a single "Dashboard" tab
- Rename tabs: Dashboard, Team, Library, Settings
- Move Alerts to a notification bell icon in the header
- Add a quick-add task flow (name + assign → done, not full SOP editor)

#### 1.4 — Build Role-SOP Assignment UI

- Add a "Tasks" section to the Admin Roles page showing which SOPs are assigned to each role
- Allow drag-and-drop SOPs onto roles
- Show a preview of what tasks staff in each role will see

#### 1.5 — Remove Dead Routes

- Delete `/pin`, `/role`, `/zone`, `/login/zone` pages
- Remove the old zone-first login flow code

---

### Phase 2: Core Feature Completion

*Goal: Bring parity with basic competitors.*

#### 2.1 — Shift Handoff & Notes

- Add a "Shift Notes" text field that gets passed to the next shift
- Show previous shift's notes when clocking in
- Flag incomplete critical tasks that carry over

#### 2.2 — Photo Verification

- Implement actual camera capture on task completion
- Store photos in Supabase Storage
- Show photo thumbnails on manager's task review

#### 2.3 — Notifications

- Implement push notifications via service worker
- Alert managers when critical tasks are overdue (>30 min)
- Notify staff of new task assignments mid-shift

#### 2.4 — Basic Analytics Dashboard

- Completion rates by day/week/month
- Staff performance metrics (speed, consistency)
- Zone comparison charts
- Export to CSV

#### 2.5 — Offline Support

- Cache current shift tasks in IndexedDB
- Queue task completions when offline
- Sync when connection returns
- Show offline indicator in header

---

### Phase 3: Competitive Differentiation

*Goal: Features that make BakeryOS stand out.*

#### 3.1 — Smart Task Scheduling

- Time-aware task presentation (show morning tasks first, fade afternoon tasks)
- Estimated completion time tracking vs actual
- Auto-suggest task ordering based on historical patterns
- Task dependencies (can't do "close register" until "count drawer")

#### 3.2 — Team Communication

- In-app messaging between manager and staff
- Shift announcements (visible to all on-shift staff)
- Task-level comments/questions

#### 3.3 — Food Safety & Compliance

- Temperature logging integration
- Cleaning verification with timestamps
- Compliance report generation for health inspections
- Expiration date tracking

#### 3.4 — Multi-Location Support

- Location selector on login
- Cross-location reporting for owners
- Template sharing between locations

#### 3.5 — Scheduling Integration

- Weekly schedule builder
- Shift swap requests
- Availability management
- Labor cost forecasting

---

## Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| 1.1 Streamline Login | Very High | Medium | **P0** |
| 1.2 Fix Staff Dashboard | Very High | Medium | **P0** |
| 1.3 Manager IA Cleanup | High | Low | **P0** |
| 1.4 Role-SOP Assignment UI | High | Medium | **P0** |
| 1.5 Remove Dead Routes | Low | Low | **P1** |
| 2.1 Shift Handoff | High | Low | **P1** |
| 2.2 Photo Verification | Medium | Medium | **P1** |
| 2.3 Notifications | High | High | **P1** |
| 2.4 Analytics | High | High | **P2** |
| 2.5 Offline Support | Medium | High | **P2** |
| 3.1 Smart Scheduling | Medium | High | **P3** |
| 3.2 Communication | Medium | Medium | **P3** |
| 3.3 Food Safety | High | High | **P3** |
| 3.4 Multi-Location | Low | Very High | **P4** |
| 3.5 Scheduling | Medium | Very High | **P4** |

---

## Summary

The biggest wins are in **reducing login friction** (4 steps → 2) and **fixing the staff task experience** (overwhelming expanded list → clean, actionable checklist). These two changes alone would dramatically improve daily usability. The manager dashboard needs its information architecture simplified — three tabs showing SOPs in different groupings creates confusion rather than clarity.

The Role-SOP assignment UI is a critical gap — the entire role-based task system is currently admin'd via raw SQL. Until managers can self-serve this, the system depends on developer intervention.

Phase 1 should be the immediate focus. It addresses the core daily workflow that every staff member and manager touches multiple times per shift.
