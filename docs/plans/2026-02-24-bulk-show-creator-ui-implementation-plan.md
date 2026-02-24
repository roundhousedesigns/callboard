# Bulk Show Creator UI Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the `BulkShowCreator` schedule editor UI to a grid-style weekday editor with two default time inputs per day to reduce repetitive clicks and enable fast keyboard entry.

**Architecture:** Keep the existing backend endpoint and payload shape. Update only `client/src/components/BulkShowCreator.tsx` to render a compact schedule editor and preserve current submit/result/error behavior.

**Tech Stack:** React 18 + TypeScript + react-aria-components (client), existing API wrapper.

---

### Task 1: Add schedule editor helpers (pure functions)

**Files:**
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Add helpers to read/write time slots by index**

- Implement small helpers to:
	- get a time string at index (default `''`)
	- set a time string at index (auto-expands array)
	- remove a time slot at index

**Step 2: Manual check (sanity)**

- In the browser, type into Time 1/Time 2 across a few days and confirm values persist and submit payload still works.

---

### Task 2: Replace weekday UI with two-default-slot grid

**Files:**
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Replace “Add showtime” row UI with weekday rows that always render Time 1 and Time 2**

- For each weekday:
	- render weekday label
	- render Time 1 input bound to index 0
	- render Time 2 input bound to index 1
	- render any extra indices (2+) below with a remove button
	- render “+ Add time” button for that weekday

**Step 2: Add Enter-to-add interaction**

- On keydown Enter in the last visible input for that weekday:
	- prevent default form submit
	- append a new extra slot (index = current length)
	- focus the newly added input (best-effort)

**Step 3: Manual check**

- Create a schedule with:
	- Mon: one time
	- Tue: two times
	- Wed: three times (use + Add time or Enter)
- Submit and confirm created shows match expected weekdays.

---

### Task 3: Keep current submit/result UX intact

**Files:**
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Ensure submit handler still trims + filters empty strings**

- Verify blank Time 1/Time 2 do not create shows.

**Step 2: Manual check duplicate skip**

- Submit the same range/times twice and confirm the second run reports skipped duplicates.

---

### Task 4: Run build checks

**Files:**
- None

**Step 1: Build client**

Run: `corepack yarn workspace client build`  
Expected: exit code 0.

**Step 2: Run dev and spot-check**

Run: `corepack yarn dev`  
Expected: Bulk creator works from both `Shows` and `Settings`.

