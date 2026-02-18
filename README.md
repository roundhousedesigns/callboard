# Callboard

A webapp for professional theatre companies to manage actor attendance. Replaces physical sign-in sheets with QR code sign-in, admin controls, and offline support.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express API
- **Database**: PostgreSQL with Prisma ORM
- **Package Manager**: Yarn (workspaces)

## Features

- **QR Code Sign-In** — Actors scan a unique QR code per show (requires login)
- **Admin Controls** — Sign in actors, or mark absent, vacation, or personal day
- **Calendar Import** — CSV or Excel with date and show time
- **Callboard & Print** — View and print attendance sheets
- **Offline Mode** — Print sheet when offline; enter sign-ins when back online (Dexie/IndexedDB)
- **Settings** — Show title, shows per week, dark days (MTWTFSS)

## Development

1. Start the database:
   ```bash
   yarn db:start
   ```

2. Copy `.env.example` to `.env`.

3. Set up the database:
   ```bash
   yarn db:push
   yarn db:seed
   ```

4. Run the app:
   ```bash
   yarn dev
   ```

5. Open http://localhost:5173 — Admin: `admin@demo.theatre` / Actor: `alice.anderson@demo.theatre` (password: `password123`)

### Scripts

| Script          | Description                   |
|-----------------|-------------------------------|
| `yarn dev`      | Run client + server           |
| `yarn db:start` | Start PostgreSQL (Docker)     |
| `yarn db:stop`  | Stop PostgreSQL               |
| `yarn db:push`  | Apply schema                  |
| `yarn db:seed`  | Seed demo data (3 weeks)      |
| `yarn db:studio`| Prisma Studio                 |

## Production

```bash
docker compose up -d
```

App runs on port 3000. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_URL` (or use `.env`).
