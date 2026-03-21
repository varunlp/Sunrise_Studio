# Sunrise Studio App Baseline

## Overview

`sunrise-studio` is a small Node.js hotel booking application built with Express and SQLite.

It currently runs as a single process and serves:

- public website pages from `public/`
- JSON APIs under `/api/...`
- admin actions using session-based authentication

## Runtime Summary

- Runtime: Node.js `v20.20.1`
- Package manager: npm `10.8.2`
- Entrypoint: `server.js`
- Start command: `npm start`
- Default port: `3000`
- Static files: `public/`
- Database: `hotel.db`

## How The App Starts

Startup flow in `server.js`:

1. load Express and middleware
2. enable CORS, JSON parsing, URL-encoded parsing, and sessions
3. serve static files from `public/`
4. open SQLite database at `hotel.db`
5. enable SQLite WAL mode and foreign keys
6. create tables if they do not exist
7. seed rooms if the `rooms` table is empty
8. seed admin user if the `admins` table is empty
9. start listening on port `3000`

## Stateful Components

These files must be treated as persistent state:

- `hotel.db`
- `hotel.db-wal`
- `hotel.db-shm`

These are not code artifacts. They are SQLite runtime data files.

The `public/` directory is currently static application content. If image uploads are added later, that path becomes stateful too.

## Current Routes

Public routes:

- `GET /api/rooms`
- `GET /api/rooms/:id`
- `POST /api/bookings`
- `GET /api/bookings/:ref`

Admin auth:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

Admin protected routes:

- `GET /api/admin/bookings`
- `PUT /api/admin/bookings/:id/confirm`
- `PUT /api/admin/bookings/:id/cancel`
- `GET /api/admin/stats`
- `PUT /api/admin/rooms/:id/toggle`
- `GET /api/admin/rooms`

Frontend handling:

- Express serves files from `public/`
- non-API routes fall back to `public/index.html`
- `public/admin.html` is the admin UI entrypoint

## Important Runtime Behaviors

### Sessions

The session secret is generated at process start with `crypto.randomBytes(...)`.

Effect:

- all sessions become invalid after each restart
- multiple app instances would not share session validity

This is acceptable for local development, but not for stable production behavior.

### Seeded Admin

If the `admins` table is empty, the app seeds:

- username: `admin`
- password: `sunrise2026`

This is useful for local bootstrapping, but it is not a production-safe pattern.

### Database Behavior

The app uses `better-sqlite3` and enables WAL mode.

Effect:

- database writes create companion `-wal` and `-shm` files
- deployments and backups must account for all SQLite runtime files
- concurrent scale-out is limited compared to a network database

## File Ownership And Permissions Observed

At inspection time:

- app directory owner: `varun`
- database files owner: `varun`
- `public/` owner: `varun`
- parent `/home/varun/projects` directory owner: `root`

The app directory itself is usable, but the parent ownership is worth keeping in mind for future automation.

## Dependencies

Direct dependencies from `package.json`:

- `express`
- `better-sqlite3`
- `bcryptjs`
- `express-session`
- `cors`

## Known Risks In Current State

1. Port is hardcoded to `3000`
2. session secret is random on each restart
3. admin credentials are seeded in application code
4. runtime config is not externalized
5. no health endpoint exists yet
6. process management depends on how the app is launched
7. database is local file storage, which affects backup and deployment design

## Week 1 Outcome

By the end of Week 1, you should understand:

- what starts the app
- what data must persist
- what breaks after restart
- which parts are safe for local use but weak for production
- how to run it under `systemd`
