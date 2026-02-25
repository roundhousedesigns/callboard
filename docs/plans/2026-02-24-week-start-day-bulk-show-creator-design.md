# Bulk Show Creator Week Start Alignment Design

Date: 2026-02-24
Status: Approved

## Context

`SettingsPage` stores organization settings including `weekStartsOn`, but `BulkShowCreator` currently renders weekday rows in a fixed Sunday-first order. This creates a mismatch with the configured week start behavior elsewhere in the admin experience.

## Goals

- Render `BulkShowCreator` weekday rows starting from the organization `weekStartsOn` value.
- Keep existing weekday keys (`0` Sunday through `6` Saturday) unchanged for state and API payloads.
- Keep quick-action button labels unchanged (`Apply Mon-Fri`, `Apply weekend`, `Apply all days`).

## Non-goals

- No backend or API contract changes.
- No copy or relabeling changes for quick-action buttons.
- No broader org settings context refactor.

## Proposed Approach

1. Pass `weekStartsOn` from `SettingsPage` into `BulkShowCreator` as an optional prop.
2. In `BulkShowCreator`, derive a display-ordered weekday array from canonical weekdays using `weekStartsOn`.
3. Use display order only for UI rendering and "Copy previous day" behavior.
4. Preserve canonical weekday keys in `weekdayTimes` state and in request payload generation.

## Detailed Behavior

- **Weekday row order** starts at `weekStartsOn` and wraps through all seven days.
- **Copy previous day** uses display order:
  - first displayed day has no previous day and keeps the copy action disabled,
  - each other day copies from the displayed day immediately above it.
- **Quick-fill target sets** remain semantic and unchanged:
  - weekdays: keys `1..5`,
  - weekend: keys `0` and `6`,
  - all days: keys `0..6`.
- **Submission payload** continues sending keys `0..6` mapped to trimmed time arrays.

## Edge Cases and Fallbacks

- If `weekStartsOn` is missing, non-integer, or outside `0..6`, default to `0` (Sunday-first).
- Focus behavior for newly added time fields remains unchanged because input IDs continue using canonical weekday keys.

## Testing Strategy

### Manual verification

1. Set week start to Monday in settings, open bulk creator, verify first row is Monday and row sequence wraps through Sunday.
2. On Monday-first layout, verify "Copy previous day" is disabled for Monday and enabled for all other rows; verify copy source is the row immediately above.
3. Set week start to Sunday and verify behavior matches current baseline.
4. Use each quick-fill action and confirm the intended weekday groups receive values regardless of displayed order.
5. Submit generated schedule and verify server creates expected shows.

### Optional follow-up tests

- Extract weekday reorder helper and add unit tests for:
  - valid week starts (`0..6`),
  - invalid input fallback,
  - copy-previous display index mapping.

## Risks

- Main risk is accidental coupling between display order and canonical key mapping. This is mitigated by preserving canonical keys for all state and payload operations.

## Rollout

- UI-only change, safe to release with normal frontend deployment process.
