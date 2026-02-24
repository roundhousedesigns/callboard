# Bulk Show Creator UI Refresh (Design)

## Goal

Make bulk schedule creation significantly faster by removing repetitive “Add showtime” clicks and making weekday time entry keyboard-first, while keeping the existing bulk generation API and behavior intact.

## Current pain

The current weekday editor requires repeated “Add showtime” actions and creates too much UI friction for common schedules where each weekday has 0–2 times.

## Proposed UX

### Layout

- Keep the existing modal entrypoint and top-level date range:
	- Start date (required)
	- End date (required)
- Replace the current per-weekday “Add showtime” list UI with a compact schedule editor:
	- 7 weekday rows (Sunday–Saturday)
	- Two time slots always visible per weekday: **Time 1** and **Time 2**
	- Optional additional slots for that weekday when needed:
		- “+ Add time” reveals Time 3, Time 4, etc.
		- Extra slots have a remove action

### Keyboard-first behavior

- Tab order proceeds through the grid left-to-right:
	- Sunday Time 1 → Sunday Time 2 → Monday Time 1 → …
- Pressing Enter on the last visible time input for a weekday adds a new slot for that weekday (equivalent to clicking “+ Add time”).

### Mobile behavior

- Use responsive layout that stacks each weekday row into a small block containing:
	- weekday label
	- the two default time inputs
	- “+ Add time” and any extra slots below

### Accessibility

- Each time input gets a unique accessible label:
	- e.g. “Monday — Time 1”, “Monday — Time 2”, “Monday — Time 3”
- The modal retains dismiss/close behavior and preserves input values on validation errors.

## Data model and API

- No backend changes.
- Keep the existing request payload shape:
	- `startDate`, `endDate`
	- `weekdayTimes: Record<string, string[]>`
	- `skipDuplicates: true`
- Client submit handler continues to:
	- trim times
	- drop empty strings
	- send to `POST /shows/bulk-generate`
- Server continues to normalize/dedupe/sort times and skip duplicates.

## Error handling

- Display backend errors in the existing inline alert.
- Preserve the user’s inputs so they can correct and retry.

## Non-goals

- Adding recurring templates/presets.
- Adding exception dates / blackout dates.
- Changing bulk generate semantics, duplicate behavior, or validation rules.

