# Current Show Admin View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** When a show is active, show an admin header button linking to an admin r/w “current show” view whose callboard UI is identical to the actor read-only “current callboard” UI.

**Architecture:** Extract the single-show callboard UI into one shared component that accepts a data loader and a `readOnly` flag. Actor and admin wrappers provide their own `load()` implementations and (for admin) an `onSetStatus` handler.

**Tech Stack:** React + Vite, React Router, existing `api` client, existing Express endpoints.

---

### Task 1: Create shared single-show callboard component

**Files:**
- Create: `client/src/components/CurrentShowCallboard.tsx`

**Step 1: Implement shared component**

- Implement a component that renders the same UI/states as current `ActiveShowCallboard`, but parameterized:
	- `heading?: React.ReactNode`
	- `readOnly: boolean`
	- `load: () => Promise<{ show: Show; actors: Actor[]; attendance: AttendanceRecord[] }>`
	- `onSetStatus?: (userId: string, showId: string, status: AttendanceRecord['status'] | null) => void`
- Keep the same refresh behavior (load on mount, refresh every 30s when visible, refresh on visibility change).
- Keep empty/error states consistent with existing UI (card + alert patterns).
- When `readOnly` is `false`, pass `readOnly={false}` to `CallboardTable` and wire `onSetStatus` through.

**Step 2: Verify typecheck/build**

Run (from repo root):
- `corepack yarn workspace client build`

Expected: exits 0.

---

### Task 2: Refactor actor `ActiveShowCallboard` to use shared component

**Files:**
- Modify: `client/src/components/ActiveShowCallboard.tsx`

**Step 1: Refactor**

- Replace the internal UI logic with the new shared component.
- Keep existing actor endpoint: `GET /api/actor/callboard/active`.
- Ensure actor behavior remains read-only.

**Step 2: Verify actor page still renders**

Run:
- `corepack yarn workspace client build`

Expected: exits 0.

---

### Task 3: Add admin “current show” page (r/w) using shared component

**Files:**
- Create: `client/src/pages/admin/CurrentShowPage.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Add page**

- Create an admin-only page at `/admin/current-show` that:
	- matches the actor page’s callboard content layout (title/subtitle + single-show table)
	- uses the shared component with `readOnly={false}`
	- implements `load()`:
		- `GET /api/shows/active` (active show)
		- `GET /api/users` (actors list; filter to role=actor)
		- `GET /api/attendance?showId=<activeShowId>` (attendance)
	- implements `onSetStatus` using existing admin attendance endpoints (`POST /api/attendance`, `DELETE /api/attendance?...`)
	- shows the shared empty/error states when no active show or errors occur

**Step 2: Add route**

- In `client/src/App.tsx`, add:
	- `<Route path="current-show" element={<CurrentShowPage />} />` under the `/admin` route.

**Step 3: Verify build**

Run:
- `corepack yarn workspace client build`

Expected: exits 0.

---

### Task 4: Add admin header button linking to `/admin/current-show` (only when a show is active)

**Files:**
- Modify: `client/src/pages/admin/AdminLayout.tsx`

**Step 1: Implement conditional button**

- On mount (and on visibility / interval), call `GET /api/shows/active`:
	- If success: show a small right-side header button labeled “Current show” linking to `/admin/current-show`
	- If 404 “No active show”: hide the button
	- For other errors: hide the button (don’t block admin navigation)

**Step 2: Verify build**

Run:
- `corepack yarn workspace client build`

Expected: exits 0.

---

### Task 5: Manual verification (dev)

Run:
- `corepack yarn dev`

Verify:
- With an active show:
	- Admin header shows “Current show”
	- `/admin/current-show` renders single-show callboard
	- Changing a status persists and reflects after refresh
- With no active show:
	- Header button is hidden
	- `/admin/current-show` shows “No active show right now.”

