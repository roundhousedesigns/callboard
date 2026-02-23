## Goal

When a show is active, show an admin-only header button on the right side that links to an admin-capable view of just the current show. That view should look identical to the read-only actor “current callboard” UI, but be read/write for admins.

## Non-goals

- Changing actor behavior (actors remain read-only).
- Changing backend behavior or adding new endpoints (unless later needed).
- Introducing a new visual design for the callboard table.

## Current behavior (context)

- Actor “current callboard” is rendered via `ActiveShowCallboard`, which calls `GET /api/actor/callboard/active` and renders `CallboardTable` for a single show with `readOnly`.
- Admin attendance is editable in `CallboardPage` via `CallboardTable` with `onSetStatus`, calling:
	- `POST /api/attendance` to upsert
	- `DELETE /api/attendance?userId=...&showId=...` to clear
- Admin header is defined in `AdminLayout`.

## Proposed solution (Approach 2: shared UI component)

### 1) Shared “Current show callboard” UI component

Create a shared component that owns the single-show callboard UI and states, so actor/admin views do not drift:

- **Responsibilities**
	- Loading state
	- “No active show right now.” empty state
	- Error state display
	- Rendering a single-show `CallboardTable` with a consistent heading/layout
- **Inputs**
	- `readOnly: boolean`
	- `load(): Promise<{ show, actors, attendance }>` (data fetcher)
	- `onSetStatus?: (userId, showId, status|null) => Promise<void> | void` (only used when `readOnly === false`)
	- `heading?: React.ReactNode` (optional, consistent with current actor component)

The shared component should be the only place the single-show callboard UI is defined.

### 2) Actor wrapper uses shared UI (read-only)

Refactor the existing actor `ActiveShowCallboard` into a thin wrapper that:

- supplies `load()` using the existing endpoint `GET /api/actor/callboard/active`
- passes `readOnly`

This keeps the actor endpoint and permissions model unchanged while moving UI ownership to the shared component.

### 3) Admin page uses shared UI (read/write)

Add a new admin route and page:

- **Route**: `/admin/current-show`
- **Behavior**:
	- `load()` implementation:
		- `GET /api/shows/active` (find current active show)
		- `GET /api/users` (actors list; filter client-side to role=actor to match current admin callboard behavior)
		- `GET /api/attendance?showId=<activeShowId>`
	- Provide `onSetStatus` identical to `CallboardPage` (POST/DELETE to `/api/attendance`)
	- Render the shared UI with `readOnly={false}`

Empty state: If there is no active show (404 “No active show”), show the same “No active show right now.” UI as the actor view.

### 4) Admin header button (conditional)

In `AdminLayout`, add a right-side button that appears only when a show is active:

- Determine active show via `GET /api/shows/active`
- When active show exists, show a button labeled **“Current show”** linking to `/admin/current-show`
- When no active show (404), hide the button
- Button styling should match existing header controls (small button / ghost style consistent with header UI)

## UX notes

- The admin “Current show” page should look like the actor single-show callboard table (same table UI, same status icons), but be editable via the existing `StatusSelect` interaction when `readOnly={false}`.
- Polling/refresh cadence should remain reasonable (align with existing 30s refresh behavior used by the actor component).

## Error handling

- Network errors should display an error alert in the shared component.
- “No active show” should not be treated as an error; it should show the empty state.

## Testing / verification plan

- With an active show:
	- Admin header shows “Current show” button; clicking navigates to `/admin/current-show`.
	- Admin can change an actor’s status; change is persisted and remains after refresh.
	- UI matches the actor single-show table layout.
- With no active show:
	- Admin header does not show the button.
	- Visiting `/admin/current-show` shows the “No active show right now.” empty state.
