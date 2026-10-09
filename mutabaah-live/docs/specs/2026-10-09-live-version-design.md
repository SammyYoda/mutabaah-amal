# Mutaba'ah Amal — Live Version Design

**Date:** 2026-10-09
**Status:** Draft — awaiting review
**Location:** `mutabaah-live/` (the demo in `mutabaah/stitch_mutaba_ah_amal_worship_tracker/` is left untouched)

## 1. Goal

Turn the localStorage demo into a real multi-user web app that many usrah groups can use at once. Each naqib manages and sees only their own usrah; members log their own amalan; data persists in a server-side database.

**Success criteria**

- Real accounts: a member or naqib can sign up, log in, log out, and change their password.
- Multiple usrah groups run side by side with strict data isolation (proven by tests).
- Each usrah's amalan list (Tetapan) drives what members track and how they are scored.
- Every dashboard number (Ringkasan, Matriks, Profil Ahli, Analitik) is computed from real logs — no hard-coded figures remain.
- The UI, Malay copy and design system match the demo.

**Non-goals (v1)** — see §11 Expansion plans.

## 2. Decisions

| Topic | Decision |
|---|---|
| Tenancy | Many usrah groups; one usrah per user |
| Backend | Own Node 20 API (Fastify, TypeScript) |
| Database | SQLite (WAL mode) via Drizzle ORM; MySQL kept as a config-level switch |
| Hosting | Undecided; target any host with a persistent disk (VPS, Fly.io/Railway volume) |
| Frontend | Keep the vanilla JS SPA; replace `store.js` with an API client |
| Signup | Invite-code based; no public signup without a code |
| Auth | Email + password only; **no email verification** in v1 |
| Amalan | Fully dynamic per usrah (input type + target) |
| New members | Active immediately on joining (holding the code = approval) |

## 3. Architecture

```
mutabaah-live/
├── package.json            workspace root; `npm run dev`, `npm start`, `npm test`
├── shared/
│   └── score.js            pure scoring functions, imported by server and browser
├── server/
│   ├── src/
│   │   ├── app.ts          Fastify instance, plugins, static file serving
│   │   ├── db/schema.ts    Drizzle schema
│   │   ├── db/seed.ts      default 17 amalan template
│   │   ├── auth/           hashing, sessions, guards (requireUser/requireNaqib/requireAdmin)
│   │   ├── routes/         auth, logs, amalan, naqib, guidance, notifications, admin
│   │   └── cli/create-admin.ts
│   ├── drizzle/            generated migrations
│   └── test/
├── web/                    copy of the demo SPA
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js          replaces store.js — same method names, async, calls /api/*
│       ├── app.js          router (role from session, no role switcher)
│       └── views/          existing 8 views + daftar, tukarKataLaluan, admin
└── docs/specs/
```

- **Dev:** Vite serves `web/` and proxies `/api` to Fastify (port 3001).
- **Production:** a single Node process serves the API and the static `web/` files.
- **Config** via environment variables: `DATABASE_URL` (default `file:./data/mutabaah.db`), `PORT`, `SESSION_SECRET`, `APP_ORIGIN`.

## 4. Roles & permissions

Roles come from the session only; the client never chooses its role.

| Role | Can |
|---|---|
| **Admin** (`users.is_admin`) | Create/list/rename usrah; issue naqib invites; reset any user's password |
| **Naqib** (membership role) | Read all logs/scores in own usrah; manage own usrah's amalan; send guidance; regenerate invite code; reset a member's password; remove a member |
| **Member** | Read/write own logs; read own usrah's amalan; read/reply to guidance addressed to them or to the whole usrah |

Every query that touches usrah data is filtered by the caller's `usrah_id` taken from their membership — never from request input.

## 5. Accounts & signup

### 5.1 First admin
`npm run create-admin` (CLI on the server) prompts for name, email, password and creates an admin user. It is the only account created outside the web app.

### 5.2 Usrah and naqib creation
1. Admin creates a usrah. It is seeded with the 17 default amalan and gets a member invite code.
2. Admin clicks **Jemput Naqib** → a **single-use naqib invite link** valid for 7 days (`/#daftar?jemputan=<token>`).
3. The naqib opens the link, fills in the Daftar form, and joins that usrah with role `naqib`.

### 5.3 Member signup
1. Naqib shares the usrah's **invite code** (format `ABC-1234`, shown on Ringkasan and Tetapan) or the link `/#daftar?kod=<code>`.
2. Member submits: name, email, phone (optional), password, confirm password, invite code.
3. Server validates the code, creates the user and a `member` membership, starts a session, and redirects to Hari Ini.
4. Naqib receives a notification: *"Ahli baru: <nama> telah menyertai usrah"*.

The member code is reusable. **Jana kod baru** invalidates the old code; existing members are unaffected.

### 5.4 Rules
- One email = one account (case-insensitive, trimmed). Duplicate → *"Emel sudah didaftarkan"*.
- Password: minimum 8 characters.
- Invalid/expired code or invite → *"Kod jemputan tidak sah"*.
- Because there is no email verification, the signup form asks for the email twice to reduce typos.

### 5.5 Forgotten passwords
No self-service reset in v1. Naqib (for members) or admin (for anyone) clicks **Set semula kata laluan** → a random temporary password is shown once → the user must change it on next login (`must_change_password`). All of the user's existing sessions are revoked.

### 5.6 Removing a member
Naqib clicks **Keluarkan ahli** → membership is marked `removed_at`; the user loses access and is logged out. Logs are retained but excluded from dashboards. The user may later rejoin with a code as a new membership.

## 6. Authentication & security

- Passwords hashed with **argon2id**.
- Sessions: 32-byte random token in an `httpOnly`, `Secure` (in production), `SameSite=Lax` cookie; only the SHA-256 hash is stored in `sessions`. 30-day sliding expiry. Logout deletes the row.
- Rate limiting: login 10 attempts / 15 min per IP+email; signup 10 / hour per IP.
- CSRF: state-changing requests require `Content-Type: application/json` and an `Origin` matching `APP_ORIGIN`.
- `@fastify/helmet` security headers. Login failures return a generic *"Emel atau kata laluan salah"*.
- Input validated with **zod** on every route.

## 7. Data model

```
users           id, email UNIQUE, name, phone, password_hash, is_admin, must_change_password, created_at
sessions        id, user_id, token_hash UNIQUE, expires_at, created_at
usrah           id, name, invite_code UNIQUE, created_at
naqib_invites   id, usrah_id, token_hash UNIQUE, expires_at, used_at, created_by
memberships     id, user_id, usrah_id, role ('naqib'|'member'), joined_at, removed_at
                -- at most one active (removed_at IS NULL) membership per user
amalan          id, usrah_id, code, name, description, freq ('harian'|'mingguan'|'bulanan'),
                input_type ('count'|'check'|'prayers'), target_val, unit, icon, active, sort
daily_logs      id, user_id, usrah_id, date (YYYY-MM-DD), values JSON, notes, updated_at
                UNIQUE(user_id, date)
guidance        id, usrah_id, from_user_id, to_user_id NULL (= whole usrah), category,
                title, body, reference, created_at
guidance_reads  guidance_id, user_id, read_at
guidance_replies id, guidance_id, user_id, body, created_at
notifications   id, user_id, type, text, link, created_at, read_at
```

**`daily_logs.values`** is keyed by amalan id:
- `count` → number (e.g. `{"12": 5}` pages of tilawah)
- `check` → boolean
- `prayers` → `{"subuh":true,"zohor":true,"asar":false,"maghrib":true,"isya":true}`

Deactivated amalan keep their id, so historical values remain meaningful. Amalan are never hard-deleted once any log references them.

## 8. Scoring (`shared/score.js`)

Pure functions used by both server and browser so numbers always agree.

- **Item met?** `count`: value ≥ target. `check`: true. `prayers`: count of true ≥ target (default 5).
- **Daily score** (Hari Ini ring): met active *harian* items ÷ active *harian* items.
- **Weekly items** (*mingguan*): aggregated across the ISO week (Mon–Sun). `check` items count the number of days ticked; `count` items sum the values; met when the total ≥ target.
- **Monthly items** (*bulanan*): the same, aggregated over the calendar month.
- **Period score** (dashboards, Analitik weekly bars) = items met ÷ items expected, where
  items expected = (harian items × days elapsed in period) + (mingguan items × ISO weeks overlapping the period) + (bulanan items × calendar months overlapping the period),
  and items met counts each harian item per day, each mingguan item per week, and each bulanan item per month that met its target. Days in the future are excluded.
- **Status band** (replaces the hard-coded `status`): ≥ 80% *Teguh (Level A)*, 60–79% *Sederhana (Level B)*, < 60% *Perlu Perhatian (Level C)*, over the last 4 weeks.
- Dates are in the usrah's timezone, fixed to `Asia/Kuala_Lumpur` in v1.

## 9. API

All under `/api`, JSON. Errors: `{ "error": { "code": "...", "message": "<Malay text>" } }` with matching HTTP status.

**Auth**
- `POST /auth/signup` `{name, email, phone?, password, inviteCode? | naqibInvite?}`
- `POST /auth/login` `{email, password}` · `POST /auth/logout`
- `POST /auth/change-password` `{currentPassword, newPassword}`
- `GET /auth/me` → user, usrah, role, `mustChangePassword`

**Member**
- `GET /amalan` — active amalan of own usrah
- `GET /logs?from=&to=` — own logs (max range 400 days)
- `PUT /logs/:date` `{values, notes}` — own log; `date` must be ≤ today and ≥ today − 7 days
- `GET /me/analytics?weeks=8` — weekly scores, 60-day heatmap, per-category breakdown

**Naqib** (all limited to own usrah)
- `POST /amalan` · `PATCH /amalan/:id` · `DELETE /amalan/:id` (soft deactivate)
- `GET /usrah/summary` — KPIs, roster with scores and status, attention alerts
- `GET /usrah/matrix?weeks=4` — member × amalan completion grid
- `GET /members/:id` — profile, trend, recent logs
- `POST /members/:id/reset-password` → `{temporaryPassword}`
- `DELETE /members/:id` — remove from usrah
- `GET /usrah/invite-code` · `POST /usrah/invite-code/regenerate`

**Guidance & notifications**
- `GET /guidance` · `POST /guidance` (naqib) · `POST /guidance/:id/replies` · `POST /guidance/:id/read`
- `GET /notifications` · `POST /notifications/read-all`

**Admin**
- `GET /admin/usrah` · `POST /admin/usrah` · `PATCH /admin/usrah/:id`
- `POST /admin/usrah/:id/naqib-invite` → invite link
- `POST /admin/users/:id/reset-password`

## 10. Frontend changes

- Copy the demo SPA into `web/`; delete `store.js` and `data.js`; add `api.js` that exposes the store's method names as async functions over `fetch` (credentials included). A 401 response routes to `#login`.
- **Router:** role comes from `GET /auth/me`; remove the role switcher and the prefilled demo credentials; `mustChangePassword` forces `#tukar-kata-laluan`.
- **New views:** `daftar` (signup, reads `?kod=` / `?jemputan=`), `tukarKataLaluan`, `admin` (usrah list, create, naqib invite).
- **Hari Ini:** renders inputs from the usrah's amalan list by `input_type` (stepper / toggle / five-prayer row); keeps the score ring using `shared/score.js`; optimistic updates with a debounced `PUT` (800 ms) and the save pill showing *Menyimpan… / Disimpan / Gagal disimpan — cuba lagi*.
- **Tetapan:** add/edit amalan including `input_type`; shows the invite code with copy and regenerate buttons.
- **Ringkasan, Matriks, Profil Ahli, Analitik:** replace all hard-coded numbers and SVG paths with API data; add reset-password and remove-member actions to Profil Ahli.
- Each view shows a loading skeleton while fetching and an empty state when there is no data.

## 11. Expansion plans (not in v1)

Ordered roughly by expected value:

1. **Email verification** — verify a new account via an emailed link before first login (SMTP via nodemailer; console fallback in dev). Needs an `email_tokens` table and an `email_verified_at` column.
2. **Forgot password by email** — self-service reset link; reuses the email infrastructure from (1).
3. **Naqib approval for new members** — optional "pending" state before a new member gets access.
4. **Google sign-in** (OAuth).
5. **Multiple usrah per user** — e.g. a naqib who is also a member elsewhere.
6. **Per-usrah timezone.**
7. **PWA / offline logging** with sync.
8. **Dark mode, PDF export, guidance search** (carried over from the demo's to-do list).
9. **MySQL deployment** — switch the Drizzle dialect and `DATABASE_URL` once hosting is chosen.

## 12. Error handling

- All handlers validate input with zod → 400 `VALIDATION_ERROR` with a field-level Malay message.
- 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND` (also used for resources in another usrah, so they cannot be detected), 409 `CONFLICT` (duplicate email), 429 `RATE_LIMITED`.
- Unexpected errors → 500 with a generic message; details logged server-side only.
- Frontend: a toast for action errors; inline messages for form errors; the save pill for log saves.

## 13. Testing

- **Unit (Vitest):** `shared/score.js` — each input type, weekly/monthly aggregation, deactivated items, empty logs, status bands.
- **API integration (Vitest + Fastify `inject`, in-memory SQLite):**
  - signup with a valid/invalid/regenerated code; naqib invite single use and expiry; duplicate email
  - login, logout, rate limit, session expiry, forced password change after reset
  - **cross-usrah isolation:** naqib A gets 404 for usrah B's members, logs, amalan and guidance; a member cannot read another member's logs
  - log date window (future and > 7 days back are rejected)
  - removed member loses access immediately
- **E2E smoke (Playwright):** admin creates usrah → naqib accepts invite → member signs up with the code → logs today → naqib sees the member's score on Ringkasan.
