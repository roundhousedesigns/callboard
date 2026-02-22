# Actor Read-Only Active Show Callboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Actors see an up-to-date, read-only view of the currently active show callboard when visiting `/actor` (and after QR sign-in), with no controls and no ability to change attendance statuses.

**Architecture:** Add a dedicated actor-only read endpoint that returns the active show snapshot (show + actors + attendance). Reuse the existing `CallboardTable` in `readOnly` mode to render a single show column and poll periodically for freshness.

**Tech Stack:** Express + Prisma (server), React + Vite + React Router (client)

---

### Task 1: Add actor-only “active callboard” API endpoint

**Files:**
- Modify: `/home/gaswirth/projects/callboard/server/src/routes/actor.ts` (create)
- Modify: `/home/gaswirth/projects/callboard/server/src/index.ts` (or the router registration file, wherever routes are mounted)
- Reference: `/home/gaswirth/projects/callboard/server/src/middleware/auth.js`, `/home/gaswirth/projects/callboard/server/src/routes/shows.ts`, `/home/gaswirth/projects/callboard/server/src/routes/attendance.ts`

**Step 1: Create route file**
- Create `server/src/routes/actor.ts` with:
	- `router.get("/callboard/active", authMiddleware, actorOnly, ...)`
	- Prisma queries:
		- Find active show for the actor’s org
		- Fetch org actors (role=actor)
		- Fetch attendance for that show + org
	- Return `{ show, actors, attendance }`

**Step 2: Mount the route**
- Register `/api/actor` routes in the server app.

**Step 3: Manual verification**
- Run server locally and hit:
	- As actor: `GET /api/actor/callboard/active` returns 200 or 404
	- As admin: should be 403 (actorOnly)
	- Unauthed: 401

---

### Task 2: Update `CallboardTable` to hide admin-only QR controls in read-only mode

**Files:**
- Modify: `/home/gaswirth/projects/callboard/client/src/components/CallboardTable.tsx`

**Step 1: Adjust header rendering**
- Only render the `/admin/qr` link when **not** `readOnly`.

**Step 2: Manual verification**
- Admin callboard still shows QR button on active show.
- Actor view does not show QR button.

---

### Task 3: Create actor page that renders active show callboard (read-only)

**Files:**
- Create: `/home/gaswirth/projects/callboard/client/src/pages/actor/ActorCallboardPage.tsx`
- Modify: `/home/gaswirth/projects/callboard/client/src/App.tsx`

**Step 1: Build the page**
- Fetch `GET /actor/callboard/active`
- Render:
	- “No active show” empty state on 404
	- `CallboardTable` with `shows={[show]}` and `readOnly`
- Add polling (e.g. 30s) + refresh when tab becomes visible
- No UI controls for switching range / show

**Step 2: Route it**
- Change `/actor` route to use `ActorCallboardPage` instead of `ActorHomePage`

**Step 3: Manual verification**
- Log in as actor → `/actor` shows active show read-only view
- No clickable status controls

---

### Task 4: Enhance QR sign-in landing to include read-only active show view

**Files:**
- Modify: `/home/gaswirth/projects/callboard/client/src/pages/actor/SignInLandingPage.tsx`

**Step 1: Keep sign-in behavior as-is**
- Leave `GET /sign-in/:token` flow unchanged.

**Step 2: Render read-only callboard under success**
- Reuse the same “active show callboard” component logic (either inline or a shared component).
- Ensure it remains read-only and polls for updates.

**Step 3: Manual verification**
- Scan QR → after sign-in, page shows confirmation + callboard snapshot

---

### Task 5: Smoke test end-to-end

**Step 1: Dev run**
- Run: `yarn dev` (or `corepack yarn dev` if needed)

**Step 2: Verify scenarios**
- Actor visits `/actor` with an active show → sees table, refreshes automatically
- Actor visits `/actor` with no active show → sees friendly empty state
- Actor scans QR (`/s/:token`) → signs in, then sees the same read-only table
- Actor has no ability to change anyone’s status

