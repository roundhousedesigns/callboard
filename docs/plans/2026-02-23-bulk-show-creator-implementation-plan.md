# Bulk Show Creator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable bulk show creator that generates shows from an inclusive date range and per-weekday times, available in both admin Shows and Settings pages.

**Architecture:** Add one backend route (`POST /shows/bulk-generate`) that owns schedule generation, validation, duplicate handling, and 1-year range limits. Build one shared React component for the form and result rendering, then mount it in both `ShowsPage` and `SettingsPage`. Keep duplicate behavior defaulted to skip for safe idempotent usage.

**Tech Stack:** Express + Zod + Prisma (server), React + TypeScript (client), Yarn workspaces.

---

### Task 1: Add backend validation and generation route

**Files:**
- Modify: `server/src/routes/shows.ts`

**Step 1: Write the failing test scenario (manual, current behavior missing)**

- Define the first manual red case: submit `POST /api/shows/bulk-generate` with valid payload.
- Expected right now: `404` (route does not exist yet).

**Step 2: Run manual red check**

Run:

- `corepack yarn dev`
- Use browser devtools or API client to call `POST /api/shows/bulk-generate` with:
	- `startDate: "2026-03-01"`
	- `endDate: "2026-03-07"`
	- `weekdayTimes: { "2": ["19:00"], "3": ["14:00", "20:00"] }`

Expected: not found / missing route (RED).

**Step 3: Add `zod` schema for bulk request**

In `server/src/routes/shows.ts`, add:

- date fields (`YYYY-MM-DD`)
- `weekdayTimes` record keyed by `0..6`
- time arrays validated with existing `showTimeSchema`
- optional `skipDuplicates` defaulting to `true`

**Step 4: Add date helpers for inclusive iteration**

Add minimal helpers:

- parse local date string to midnight `Date`
- iterate from start to end inclusive by day
- compute day-span and reject spans > 366 days

**Step 5: Add `POST /bulk-generate` route**

Implement route flow:

- Parse + validate body.
- Enforce `startDate <= endDate`.
- Enforce max inclusive span `<= 366` days.
- Normalize weekday times with existing `toHHmm`.
- Deduplicate times per weekday.
- Iterate dates and create/skip shows by org uniqueness.

**Step 6: Return structured response**

Return:

- `createdCount`, `skippedCount`
- `createdShows`, `skippedShows` as `{ date, showTime }[]`

**Step 7: Run manual green check**

Run:

- `corepack yarn dev`
- Repeat payload from Step 2.

Expected:

- `200` response with nonzero `createdCount`.
- Repeating same payload increases `skippedCount` and does not duplicate rows.

---

### Task 2: Build shared bulk creator component in client

**Files:**
- Create: `client/src/components/BulkShowCreator.tsx`
- Modify: `client/src/components/ui/index.ts`
- Modify: `client/src/lib/api.ts` (only if helper typing convenience is needed)

**Step 1: Write failing UI behavior target**

- Define red case: there is no reusable bulk creator component to render date range + weekday time rows.

**Step 2: Create component state model**

Implement local state for:

- `startDate`, `endDate`
- weekday rows (`0..6`) each with a string-array of times
- submit loading/error/result states

**Step 3: Render date range controls**

Render required `TextFieldInput` controls:

- Start date (`type="date"`)
- End date (`type="date"`)

**Step 4: Render weekday schedule editor**

Render 7 weekday rows:

- label (Sunday-Saturday)
- list of time inputs (`type="time"`)
- “Add time” and “Remove” actions per row

**Step 5: Implement submit handler**

On submit:

- build payload `{ startDate, endDate, weekdayTimes, skipDuplicates: true }`
- call `api.post('/shows/bulk-generate', payload)`
- show result summary and details

**Step 6: Add callback for parent refresh**

Expose optional `onCreated` callback prop:

- called after successful generation so `ShowsPage` can refresh list

**Step 7: Export component from UI barrel if needed**

- Update exports only if project convention requires barrel access.

---

### Task 3: Mount bulk creator in Shows page

**Files:**
- Modify: `client/src/pages/admin/ShowsPage.tsx`

**Step 1: Write failing behavior target**

- Red case: Shows page has no bulk creator section.

**Step 2: Import and render component**

Place component below existing single “Add show” form with clear heading/subtext.

**Step 3: Wire refresh callback**

Implement `onCreated` to refresh `/shows` data and keep sorting behavior consistent.

**Step 4: Manual green check**

Expected:

- Bulk creator visible.
- Successful submit updates table with newly created shows.

---

### Task 4: Mount bulk creator in Settings page

**Files:**
- Modify: `client/src/pages/admin/SettingsPage.tsx`

**Step 1: Write failing behavior target**

- Red case: Settings has import card only, no bulk creator.

**Step 2: Import and render component**

Add a new “Bulk Show Creator” section near existing import calendar card.

**Step 3: Ensure independent UX states**

- Bulk creator status/errors should not interfere with settings save or file import states.

**Step 4: Manual green check**

Expected:

- Bulk creator visible and functional in Settings.
- Existing settings save + import still work.

---

### Task 5: Validate compile/build and end-to-end sanity

**Files:**
- None

**Step 1: Build server**

Run: `corepack yarn --cwd server build`  
Expected: succeeds with exit code 0.

**Step 2: Build client**

Run: `corepack yarn --cwd client build`  
Expected: succeeds with exit code 0.

**Step 3: Run manual acceptance checks**

In UI, verify all:

- Inclusive range behavior (end date included).
- Weekday mappings generate expected shows.
- Duplicate default skip behavior.
- >1 year range rejects with clear error.
- Both entry points (`Shows`, `Settings`) work consistently.

---

### Task 6: Document changes in release notes/changelog (if project uses one)

**Files:**
- Modify: project changelog file if present (skip if none exists)

**Step 1: Check for changelog**

- If no changelog file exists, mark task N/A.

**Step 2: Add concise entry**

- Mention new bulk creator, duplicate-skip default, and 1-year range cap.
