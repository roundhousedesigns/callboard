# Sign-in Gating: Sequential Activation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After a show’s sign-in is closed, allow opening sign-in for the next sequential show regardless of date/time.

**Architecture:** Make “next show eligible to open sign-in” time-independent and purely sequential, enforced in the backend `POST /shows/:id/activate` and mirrored in the admin Shows UI gating.

**Tech Stack:** Express (TypeScript, ESM), Prisma (Postgres), React (Vite, TypeScript).

---

### Task 1: Align backend activation rule with sequential eligibility

**Files:**
- Modify: `server/src/routes/shows.ts` (route: `POST /:id/activate`)

**Step 1: Identify existing rule to replace**

- In `POST /:id/activate`, locate the current “next upcoming show” logic that:
	- queries `upcoming` shows, then
	- finds `nextUpcoming` using `dt > now`, and
	- errors with `"Only the next upcoming show can be opened for sign-in"`

**Step 2: Implement sequential eligibility**

Replace the `nextUpcoming` selection with:

- Query `eligibleCandidates`:
	- `where: { organizationId: orgId, lockedAt: null }`
	- `orderBy: [{ date: "asc" }, { showTime: "asc" }]`
- Determine `nextEligible` as the first show where `activeAt == null`
- If `!nextEligible || nextEligible.id !== req.params.id`, respond 400 with a clear message, e.g.:
	- `"Only the next eligible show can be opened for sign-in"`

Keep existing behavior:

- If target show has `lockedAt`, reject (closed shows cannot reopen sign-in)
- On activation, clear `activeAt` on all other org shows, set this show `activeAt=now`, ensure `lockedAt=null`, rotate `signInToken`

**Step 3: Manual verification (no automated tests exist yet)**

Run (from repo root):

- `corepack yarn dev` (or your existing dev command)

Then in the UI:

- Create two shows (A then B) on the admin Shows page.
- Open sign-in for A (ensure it works).
- Close sign-in for A.
- Attempt to activate B:
	- Expected: success even if B’s date/time is not in the future.
- Attempt to activate a non-eligible show (if you have 3+):
	- Expected: 400 with the “next eligible” message.

---

### Task 2: Align admin Shows UI “Open sign-in” button gating with backend

**Files:**
- Modify: `client/src/pages/admin/ShowsPage.tsx`

**Step 1: Identify current UI gating**

Find:

- `upcomingShows` filtering that excludes past shows via `dt.getTime() > now`
- `nextUpcomingShowId = upcomingShows[0]?.id`
- Render condition:
	- `!currentShow && show.id === nextUpcomingShowId`

**Step 2: Change gating to sequential eligibility**

Update the “eligible next show id” calculation to:

- Consider shows sorted by (date asc, showTime asc)
- Eligible list: `lockedAt == null` and `activeAt == null`
- `nextEligibleShowId = eligible[0]?.id ?? null`

Then render **Open sign-in** when:

- `!currentShow && show.id === nextEligibleShowId`

Note: keep existing behavior of excluding `lockedAt` shows from the main list if desired, but do not use current time to decide eligibility.

**Step 3: Manual verification**

- With no active show:
	- The **Open sign-in** button should appear on the first sequential eligible show (even if its time is earlier than now).
- After closing sign-in on the active show:
	- The **Open sign-in** button should move to the next sequential eligible show immediately.

---

### Task 3: Quick sanity checks (no new deps)

**Files:**
- None (run commands only)

**Step 1: Typecheck/build**

- Client: `corepack yarn --cwd client build`
- Server: `corepack yarn --cwd server build`

Expected: both succeed with exit code 0.

---

### Optional follow-up (separate scope): Add route-level tests for gating

There is currently no test harness in this repo. If desired, add `vitest` or `jest` + `supertest` for the server and cover:

- only next sequential eligible show can be activated
- closed show cannot be activated
- closing sign-in makes the next show eligible

