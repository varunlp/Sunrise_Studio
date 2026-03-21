# Sunrise Studio Runbook

## Purpose

This runbook covers basic local or VM-style operation of the `sunrise-studio` app.

## Application Location

Project root:

`/home/varun/projects/sunrise-studio`

## Runtime Prerequisites

- Node.js `20.x`
- npm `10.x`
- write access to the project directory
- working SQLite files in the project root

## Start The App Manually

```bash
cd /home/varun/projects/sunrise-studio
npm start
```

Expected behavior:

- app listens on port `3000`
- startup logs print the app URL and admin URL
- database tables are created if missing
- seed data may be inserted on first run

## Stop The App Manually

If running in the foreground:

- press `Ctrl+C`

If running by process lookup:

```bash
pkill -f "node server.js"
```

## Verify Basic Health

### Browser Checks

- open `http://localhost:3000/`
- open `http://localhost:3000/admin.html`

### API Checks

```bash
curl http://localhost:3000/api/rooms
curl http://localhost:3000/api/admin/me
```

Expected:

- `/api/rooms` returns JSON room data
- `/api/admin/me` returns login state

## Verify Booking Flow

Manual flow:

1. open the site
2. select a room
3. create a booking
4. capture the booking reference
5. fetch it through the API if needed

API form:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 1,
    "guestName": "Test User",
    "guestEmail": "test@example.com",
    "guestPhone": "9999999999",
    "checkIn": "2026-03-25",
    "checkOut": "2026-03-27",
    "guests": 2,
    "specialRequests": "Late check-in"
  }'
```

## Verify Admin Login

Current seeded admin credentials:

- username: `admin`
- password: `sunrise2026`

Use the admin UI or call the login API.

Example:

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sunrise2026"}'
```

Then verify session:

```bash
curl -b cookies.txt http://localhost:3000/api/admin/me
```

## Logs

If running manually, logs appear in the terminal.

If running under `systemd`, use:

```bash
journalctl -u sunrise-studio -f
```

## Important State

Protect these files during restart, migration, or backup:

- `hotel.db`
- `hotel.db-wal`
- `hotel.db-shm`

If the app later writes uploaded content, that directory must also be backed up.

## Restart Considerations

Current behavior after restart:

- existing SQLite data remains
- session logins are invalidated because the session secret changes at startup

This is expected with the current code.

## Failure Checks

If the app does not start:

1. check Node and npm versions
2. confirm `node_modules/` exists
3. confirm the process can bind to port `3000`
4. inspect startup logs
5. confirm the project directory is writable by the runtime user

If bookings fail:

1. inspect request payload
2. confirm room exists and is available
3. confirm check-in and check-out dates are valid
4. inspect SQLite files and app logs

If admin login fails:

1. confirm `admins` table contains a user
2. confirm session cookies are being stored by the client
3. remember that restarting the app invalidates existing sessions

## Week 1 Notes

Current environment limitation during analysis:

- this sandbox would not allow binding to `0.0.0.0:3000`, so full runtime validation must be repeated on your actual machine shell

Use these commands outside the sandbox to verify:

```bash
cd /home/varun/projects/sunrise-studio
npm start
curl http://127.0.0.1:3000/api/rooms
```
