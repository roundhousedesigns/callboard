# Week Start Day Bulk Show Creator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `BulkShowCreator` render weekday rows starting at the organization week start day configured in settings, without changing payload semantics or quick-action labels.

**Architecture:** Keep canonical weekday keys (`0..6`) as the data model and API contract, and apply week-start logic only to display ordering. Pass `weekStartsOn` from `SettingsPage` into `BulkShowCreator`, compute a display-ordered weekday list, and map copy-previous behavior by display index. Verify with typecheck/build and manual UI checks because this repo currently has no frontend unit test harness.

**Tech Stack:** React 18, TypeScript, Vite, React Aria Components

---

### Task 1: Wire `weekStartsOn` into `BulkShowCreator`

**Files:**
- Modify: `client/src/pages/admin/SettingsPage.tsx`
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Add prop to caller**

Update the `BulkShowCreator` usage in `SettingsPage`:

```tsx
<BulkShowCreator triggerLabel="Build schedule" weekStartsOn={weekStartsOn} />
```

**Step 2: Add optional prop contract**

Extend `BulkShowCreatorProps`:

```ts
interface BulkShowCreatorProps {
	onCreated?: () => void | Promise<void>;
	triggerLabel?: string;
	triggerVariant?: ButtonProps['variant'];
	triggerSize?: ButtonProps['size'];
	weekStartsOn?: number;
}
```

**Step 3: Commit**

Run:

```bash
git add client/src/pages/admin/SettingsPage.tsx client/src/components/BulkShowCreator.tsx
git commit -m "feat: pass week start day into bulk show creator"
```

Expected: commit created with only prop wiring changes.

---

### Task 2: Add display-order weekday helper in `BulkShowCreator`

**Files:**
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Add sanitizer/helper**

Add a small helper to normalize and rotate weekday order:

```ts
function normalizeWeekStart(value: number | undefined): number {
	return Number.isInteger(value) && value !== undefined && value >= 0 && value <= 6 ? value : 0;
}

function getDisplayWeekdays(weekStartsOn: number | undefined): Array<{ key: string; label: string }> {
	const start = normalizeWeekStart(weekStartsOn);
	return [...WEEKDAYS.slice(start), ...WEEKDAYS.slice(0, start)];
}
```

**Step 2: Derive display weekdays in component**

Inside `BulkShowCreator`, derive:

```ts
const displayWeekdays = getDisplayWeekdays(weekStartsOn);
```

**Step 3: Replace render loop**

Change weekday UI rendering from `WEEKDAYS.map(...)` to `displayWeekdays.map(...)`.

**Step 4: Commit**

Run:

```bash
git add client/src/components/BulkShowCreator.tsx
git commit -m "feat: render bulk show weekdays by configured week start"
```

Expected: only rendering order logic changes.

---

### Task 3: Make "Copy previous day" follow display order

**Files:**
- Modify: `client/src/components/BulkShowCreator.tsx`

**Step 1: Update copy helper input**

Refactor `copyTimesFromPreviousDay` to accept the target weekday key and display index:

```ts
function copyTimesFromPreviousDay(targetWeekdayKey: string, displayIndex: number) {
	if (displayIndex === 0) return;
	const sourceKey = displayWeekdays[displayIndex - 1].key;
	setWeekdayTimes((prev) => ({
		...prev,
		[targetWeekdayKey]: [...(prev[sourceKey] ?? [])],
	}));
}
```

**Step 2: Update button wiring and disabled state**

In the row render:
- call `copyTimesFromPreviousDay(weekday.key, weekdayIndex)`,
- disable when `weekdayIndex === 0` (display-first row only).

**Step 3: Keep quick-fill semantics unchanged**

Do not alter:
- `applyQuickTimes('weekdays')` target keys `['1','2','3','4','5']`,
- `applyQuickTimes('weekend')` target keys `['0','6']`,
- labels and button text.

**Step 4: Commit**

Run:

```bash
git add client/src/components/BulkShowCreator.tsx
git commit -m "fix: align copy-previous behavior with displayed weekday order"
```

Expected: copy behavior matches visible row order.

---

### Task 4: Verify type safety and build

**Files:**
- Verify: `client/src/components/BulkShowCreator.tsx`
- Verify: `client/src/pages/admin/SettingsPage.tsx`

**Step 1: Run client build**

Run:

```bash
yarn workspace client build
```

Expected: TypeScript and Vite build succeed with no new errors.

**Step 2: If `yarn` fails due to corepack**

Run:

```bash
corepack yarn workspace client build
```

Expected: build succeeds through corepack-managed yarn.

**Step 3: Commit (if follow-up fixes were needed)**

Run:

```bash
git add client/src/components/BulkShowCreator.tsx client/src/pages/admin/SettingsPage.tsx
git commit -m "chore: resolve type/build issues for week-start ordering update"
```

Expected: commit only if additional fixes were introduced.

---

### Task 5: Manual validation in UI

**Files:**
- Verify behavior in admin settings page and bulk show modal.

**Step 1: Start app**

Run:

```bash
yarn dev
```

Expected: client and server start successfully.

**Step 2: Validate Monday-first behavior**

In Settings:
1. Set "Week starts on" to Monday and save.
2. Open "Build schedule".
3. Confirm first row is Monday and row order wraps through Sunday.
4. Confirm "Copy previous day" is disabled on Monday only.

Expected: all checks pass.

**Step 3: Validate Sunday-first fallback and quick-fill semantics**

1. Set "Week starts on" to Sunday and save.
2. Reopen modal; confirm Sunday-first row order.
3. Use "Apply Mon-Fri" and confirm weekdays (Mon-Fri keys) get values.
4. Use "Apply weekend" and confirm Saturday/Sunday keys get values.

Expected: labels unchanged and day groups remain semantically correct.

**Step 4: Final commit**

Run:

```bash
git add client/src/components/BulkShowCreator.tsx client/src/pages/admin/SettingsPage.tsx
git commit -m "feat: respect organization week start day in bulk show creator"
```

Expected: final feature commit includes only intended code changes.
