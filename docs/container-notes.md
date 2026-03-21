# Container Notes

## What This Setup Does

The container setup for `sunrise-studio` separates:

- application code inside the image
- SQLite runtime data inside a mounted volume

That avoids the common mistake of storing live data inside the container filesystem.

## Files Added

- `Dockerfile`
- `.dockerignore`
- `compose.yaml`
- `infra/nginx/nginx.conf`

## Runtime Variables

The app now supports:

- `PORT`
- `DB_PATH`

Defaults still work for local non-container runs, but the container uses:

- `PORT=3000`
- `DB_PATH=/app/data/hotel.db`

## Why `DB_PATH` Matters

Before this change, the app always wrote SQLite state to:

- `./hotel.db`

That would keep runtime state mixed with application code inside the container.

Now the database can live in:

- `/app/data/hotel.db`

and Docker Compose mounts that path using a named volume:

- `sunrise_data`

## How The Container Starts

Build-time:

1. copy `package.json` and `package-lock.json`
2. run `npm ci --omit=dev`
3. copy application files

Run-time:

1. start the container
2. run `node server.js`
3. app listens on port `3000`
4. SQLite data is created or reused from `/app/data`

## Why The Image Runs As `node`

The container switches to the non-root `node` user before starting the app.

That is better than running the application as root inside the container.

## How To Use It

From the project root:

```bash
docker compose up --build
```

Then open:

- `http://localhost:8080/`
- `http://localhost:8080/admin.html`

The request flow is now:

- browser -> NGINX on host port `8080`
- NGINX -> app service on container port `3000`

## How To Verify Persistence

1. start the stack
2. create a booking
3. stop the stack
4. start it again
5. confirm the booking still exists

Because the DB lives in a named volume, data should survive container recreation.

## Useful Commands

Start:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f app nginx
```

Remove containers but keep DB volume:

```bash
docker compose down
```

Remove containers and DB volume:

```bash
docker compose down -v
```

Be careful with `-v`. That deletes the SQLite data volume too.
