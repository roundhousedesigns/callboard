# Actor Read-Only Active Show Callboard (Design)

## Goal

When an **actor** visits the app (either by manually visiting the client URL or after scanning a QR code), they should see an **up-to-date, read-only** view of the **currently active show**. They must have **no view controls** and **no ability** to change sign-in statuses.

## Non-goals

- Actors changing any attendance status (their own or others’).
- Actors being auto-signed-in just by visiting `/actor` or logging in. (Sign-in remains QR-driven via `/s/:token`.)
- Real-time sockets; “up-to-date” is satisfied by polling + focus refresh.

## Backend design

Add a new actor-only endpoint that returns a safe snapshot of the active show callboard.

- **Route**: `GET /api/actor/callboard/active`
- **Auth**: required (`authMiddleware`), **actor-only** (`actorOnly`)
- **Response (200)**:
	- `show`: `{ id, date, showTime, activeAt, lockedAt }`
	- `actors`: `[{ id, firstName, lastName }]` (actors in the org)
	- `attendance`: `[{ userId, showId, status }]` (for the active show)
- **Response (404)**: `{ error: "No active show" }`

Notes:
- Do not return `signInToken` (actors don’t need it and it reduces accidental leakage).
- This endpoint is strictly read-only and does not widen access to existing admin routes.

## Frontend design

### Actor route (`/actor`)

Replace the current actor landing content with a read-only callboard view:

- Fetch `GET /actor/callboard/active`
- Render `CallboardTable` with:
	- `shows={[show]}`
	- `actors={actors}`
	- `attendance={attendance}`
	- `readOnly`
	- No toolbar / date range inputs / print controls
- Keep it “up-to-date” by:
	- Polling (e.g. every 30s)
	- Refresh on tab becoming visible

If there’s no active show:
- Display a friendly “No active show” message (and optionally remind them to scan the QR code when sign-in opens).

### QR sign-in landing (`/s/:token`)

Keep sign-in behavior unchanged. After sign-in succeeds (or “already signed in”), display:

- The existing “You’re signed in” confirmation
- The same read-only active-show callboard view below it

### Read-only guarantees in UI

`CallboardTable` already supports `readOnly`, but it currently shows an admin QR link in active show headers. Ensure **read-only mode does not render admin-only QR affordances**.

## Acceptance criteria

- Visiting `/actor` as an actor shows a read-only table for the active show, with data refreshing automatically.
- Actors see no date range controls and no status controls.
- Scanning a QR code still signs the actor in via `/s/:token`, then shows the same read-only active-show view.
- Actors cannot mutate attendance via the UI, and the new backend endpoint is read-only + actor-only.

