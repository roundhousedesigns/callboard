# Sign-in Gating: Sequential Activation (Design)

## Goal

Allow an admin to open sign-in for the “next” show even if its date/time has not arrived yet, as soon as the prior show’s sign-in has been closed.

Concretely: once a show is **closed for sign-in**, the next show in the list becomes eligible to **Open sign-in**, regardless of current date/time.

## Current behavior

- `POST /api/shows/:id/activate` only allows activating the next chronological show whose show datetime is in the future (date/time \(>\) now).
- Admin UI (`client/src/pages/admin/ShowsPage.tsx`) only renders **Open sign-in** for the next chronological show whose show datetime is in the future.
- Shows do not disappear when they are in the past; instead, sign-in is “closed” via `lockedAt` and they move to Past Shows.

## New behavior (approved)

Eligibility to open sign-in becomes **time-independent** and is instead **sequential**:

- The only show eligible to open sign-in is the earliest chronological show (date asc, showTime asc) that is:
	- not closed (`lockedAt == null`), and
	- not currently active (`activeAt == null`)
- Closing sign-in on the active show (sets `lockedAt`, clears `activeAt`) immediately makes the next sequential show eligible.

## Non-goals

- Allow opening sign-in for arbitrary shows out of order.
- Allow reopening sign-in for closed shows (`lockedAt != null`).
- Change how Past Shows work or when a show becomes “past”.

## Backend design

### Update `POST /api/shows/:id/activate`

Replace the “next upcoming (dt > now)” rule with “next sequential eligible” rule:

- Query shows for the org ordered by `{ date: "asc" }, { showTime: "asc" }` with `lockedAt: null`
- Choose the first show where `activeAt == null` as the **eligible** show
- Only allow activation if `req.params.id === eligible.id`
- Preserve existing guardrails:
	- closed shows cannot be activated
	- activating one show clears `activeAt` on all other shows and rotates `signInToken`

### Keep `POST /api/shows/:id/close-signin` as-is

Closing sign-in already:

- sets `lockedAt = now`
- sets `activeAt = null`
- rotates `signInToken`

This is sufficient for the sequential gating rule.

## Frontend design

### Update admin Shows page gating

In `client/src/pages/admin/ShowsPage.tsx`, compute the “next eligible” show to display the **Open sign-in** button using the same rule as the backend:

- Sort shows by (date asc, showTime asc)
- Consider only shows with `lockedAt == null` and `activeAt == null`
- The first such show is the only row that shows **Open sign-in**, and only when there is no current active show.

## Acceptance criteria

- After clicking **Close sign-in** on the active show, the next sequential show immediately becomes eligible for **Open sign-in** even if it is not in the future.
- Backend rejects activation attempts for any show other than the next sequential eligible show.
- Admin UI displays **Open sign-in** on the same show the backend would accept.

