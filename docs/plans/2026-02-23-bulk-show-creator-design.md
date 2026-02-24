# Bulk Show Creator (Design)

## Goal

Enable admins to generate a large, consistent show schedule in one action using:

- an inclusive date range (`startDate` + `endDate`)
- weekday-specific show times (zero or more per day)
- duplicate-safe behavior (skip existing date+time shows by default)

The feature must be available from both the `Shows` page and the `Settings` page.

## Approved behavior

- Admin configures:
	- `startDate` and `endDate` (inclusive)
	- schedule for each weekday (Sunday-Saturday), each with `0..N` times
- Server generates all candidate shows within date range based on weekday mapping.
- Duplicate handling defaults to `skipDuplicates = true`.
- Date span is capped at **1 year maximum** to prevent accidental oversized writes.
- Same tool appears in:
	- `client/src/pages/admin/ShowsPage.tsx`
	- `client/src/pages/admin/SettingsPage.tsx`

## API design

Add a new admin-only endpoint in `server/src/routes/shows.ts`:

- `POST /api/shows/bulk-generate`

Request body:

- `startDate: string` (`YYYY-MM-DD`)
- `endDate: string` (`YYYY-MM-DD`)
- `weekdayTimes: Record<string, string[]>`
	- keys must be weekday indices `"0"` to `"6"` (Sun-Sat)
	- values are time arrays in `HH:mm` (or accepted `HH:mm:ss`, normalized)
- `skipDuplicates?: boolean` (default `true`)

Response body:

- `createdCount: number`
- `skippedCount: number`
- `createdShows: Array<{ date: string; showTime: string }>`
- `skippedShows: Array<{ date: string; showTime: string }>`

## Validation and normalization

Server-side validation with `zod`:

- `startDate` and `endDate` must match `YYYY-MM-DD`
- `startDate <= endDate`
- date span must be <= 366 days (inclusive) to enforce 1-year max
- `weekdayTimes` keys restricted to `0..6`
- every time string must pass existing time regex and normalize to `HH:mm`

Additional safeguards:

- Deduplicate duplicate times within each weekday before generation
	- example: `["19:00", "19:00"]` treated as one time
- For each generated date+time candidate:
	- if show already exists and `skipDuplicates`, add to skipped list
	- otherwise create show

## Backend processing flow

For each date in `[startDate, endDate]` inclusive:

1. Compute weekday index.
2. Lookup configured times for weekday.
3. For each configured time:
	- Normalize time to `HH:mm`.
	- Check existing show uniqueness (`organizationId + date + showTime`).
	- Create or skip based on `skipDuplicates`.

The route remains organization-scoped using existing auth middleware.

## Frontend design

Create a shared component, e.g. `client/src/components/BulkShowCreator.tsx`, used by both pages.

Fields:

- `Start date` (required)
- `End date` (required)
- Weekday schedule editor with 7 rows:
	- each row supports add/remove time inputs (`type="time"`)
	- empty row means zero shows for that weekday

Submission:

- POST to `/shows/bulk-generate` via existing API wrapper
- Show loading state on submit button
- Render result summary:
	- Created count
	- Skipped count
	- Optional expandable lists for created/skipped entries

Placement:

- `ShowsPage`: place below existing single-show form
	- on success, refresh show list (or merge if response contains full enough payload)
- `SettingsPage`: place near import section as a separate card

## Error handling

- Validation errors return `400` with clear message (date range, bad weekday key, invalid time).
- Unexpected failures return `500` with generic error.
- Client displays inline error alert and preserves user input for correction.

## Non-goals

- Replacing calendar file import flow.
- Advanced recurrence presets or template libraries.
- Cross-org schedule operations.

## Acceptance criteria

- Admin can generate schedules for mixed weekday patterns in one submission.
- End date is included in generation.
- Duplicate shows are skipped by default and reported.
- Date ranges beyond 1 year are rejected with a clear validation error.
- Bulk creator is accessible and behaves consistently on both `Shows` and `Settings`.
