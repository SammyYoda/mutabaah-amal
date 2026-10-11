# Mutaba'ah Amal (live)

A multi-usrah, server-backed worship tracker (*mutaba'ah amal*) for IKRAM usrah groups. Members log their daily, weekly and monthly amalan; each usrah's naqib sees roster, matrix, analytics and guidance (*bimbingan*) for their own group only; an admin creates usrah and invites naqibs.

Stack: Fastify + SQLite (Drizzle) API, vanilla-JS single-page app built with Vite.

## Requirements

- Node.js >= 20

## Setup (development)

```bash
npm install
npm run create-admin   # prompts for Nama, Emel, Kata laluan; creates data/mutabaah.db
npm run dev            # web: http://localhost:3000   API: http://localhost:3101
```

Vite proxies `/api` to the API on port 3101 (override with `API_URL`).

## Production

```bash
npm ci                     # all dependencies: the build needs dev dependencies (Vite)
npm run build              # builds the SPA into dist/web
npm prune --omit=dev       # optional: drop dev dependencies once dist/web exists
APP_ORIGIN=https://mutabaah.example.org npm start   # NODE_ENV=production; Fastify serves the API and dist/web
```

`npm start` runs the TypeScript server with `tsx`, which is a runtime dependency, so it works after
`npm ci --omit=dev` / `npm prune --omit=dev` as long as `dist/web` was built first (on this machine or
copied in). `npm run build` itself needs the dev dependencies, so build before pruning.

In production the server logs a warning at startup if `APP_ORIGIN` is unset or not `https:`: every
login (and every other POST/PUT/PATCH/DELETE) is rejected with 403 unless the browser's origin matches
`APP_ORIGIN` exactly.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `file:./data/mutabaah.db` | SQLite file (migrations run on start) |
| `PORT` | `3101` | API/HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `APP_ORIGIN` | `http://localhost:3000` | Exact public origin of the app, e.g. `https://mutabaah.example.org`. Mutating requests must send this `Origin`, and invite links use it. Set it in production. |
| `NODE_ENV` | - | `production` serves `dist/web` and marks the session cookie `Secure` |
| `TRUST_PROXY` | off | Set only when behind a reverse proxy, so rate limits key on the real client IP from `X-Forwarded-For`. Either a **hop count** (`1` = one proxy, e.g. nginx, appends the client IP; the rightmost `n` addresses are trusted) or a **comma-separated list of proxy IPs/CIDRs** (`127.0.0.1,10.0.0.0/8`; safest). `true` is read as 1 hop and logs a warning ("TRUST_PROXY=true ditafsir sebagai 1 hop proxy"). `0`/`false`/unset = off. Any other value stops startup. With a hop count, make sure the app is reachable only through the proxy (e.g. `HOST=127.0.0.1`), otherwise a direct client can forge the header. Login is also capped at 20 attempts per hour per email, whatever the IP. |

Operating notes:

- Run behind HTTPS (the session cookie is `Secure` in production).
- Keep `data/` on a persistent disk.
- Back up daily with cron: `0 3 * * * cd /path/to/mutabaah-live && npm run backup`. Backups go to `data/backups/mutabaah-YYYYMMDD-HHmm.db` (Kuala Lumpur time); the newest 14 are kept.
- Moving to MySQL is a future step (see spec section 11).

### Running as a service (systemd + Cloudflare Tunnel)

`deploy/` holds the files used on the production host (Cloudflare Tunnel → `http://localhost:3101`):

- `deploy/mutabaah-live.service`: systemd unit (binds `127.0.0.1:3101`, `TRUST_PROXY=127.0.0.1`,
  restarts on failure). Edit `User`, `WorkingDirectory`, the node path and `APP_ORIGIN` for another host,
  run `npm run build`, then
  `sudo cp deploy/mutabaah-live.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now mutabaah-live`.
  Logs: `journalctl -u mutabaah-live -f`.
- `deploy/backup.sh`: cron wrapper for the backup (absolute node path, so it works without nvm), e.g.
  `15 3 * * * /path/to/mutabaah-live/deploy/backup.sh >> /path/to/mutabaah-live/data/backups/backup.log 2>&1`.

## Account flow

1. The admin runs `npm run create-admin`, logs in and creates a usrah (it gets a member invite code such as `ABC-2345`).
2. The admin generates a one-time naqib invite link for that usrah and sends it to the naqib.
3. The naqib signs up through the link, then shares the usrah's invite code (shown on Ringkasan).
4. Members sign up at `#daftar?kod=<code>` and start logging on Hari Ini.
5. A forgotten password is reset by the naqib (for members) or the admin (for naqibs); the temporary password must be changed at next login.

## Tests

```bash
npm test               # unit + integration (vitest)
npm run test:e2e       # Playwright smoke: dev servers, then the production build
```

First E2E run needs a browser: `npx playwright install chromium` (on Linux it also needs system libraries such as `libasound2`; `npx playwright install-deps` installs them with sudo). The E2E uses ports 3000, 3101 and 3199 and throw-away databases `data/e2e.db` and `data/e2e-prod.db`.

## More

- Design and expansion plans: `docs/specs/2026-10-09-live-version-design.md` (section 11).
- Build history: `docs/BUILD_PROGRESS.md`.
