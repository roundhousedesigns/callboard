# Callboard

A webapp for professional theatre companies to manage actor attendance. Replaces physical sign-in sheets with QR code sign-in, admin controls, and offline support.

## Features

- **QR Code Sign-In**: Actors scan a unique QR code per show to sign in (must be logged in)
- **Admin Controls**: Manually sign in actors, or mark as absent, vacation, or personal day
- **Show Time**: Date + time (e.g. 14:00, 19:30); multiple shows per day
- **Calendar Import**: Import performance calendar from CSV or Excel
- **Attendance Reports**: View and print reports
- **Offline Mode**: Print attendance sheet when offline; enter manual sign-ins when back online

## Quick Start

### Development

1. Start PostgreSQL (or use Docker):
   ```bash
   docker run -d --name callboard-db -e POSTGRES_USER=callboard -e POSTGRES_PASSWORD=callboard -e POSTGRES_DB=callboard -p 5432:5432 postgres:16-alpine
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`.

3. Set up the database:
   ```bash
   yarn db:push
   yarn db:seed
   ```

4. Run the app:
   ```bash
   yarn dev
   ```

5. Open http://localhost:5173 and log in:
   - Admin: `admin@demo.theatre` / `password123`
   - Actor: `alice.anderson@demo.theatre` / `password123`

### Docker (Production)

```bash
docker compose up -d
```

The app runs on port 3000. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_URL` in the environment.

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Express API
- `prisma/` - Database schema and migrations
