# Mutaba'ah Amal Live Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `mutabaah-live/`, a multi-usrah version of the Mutaba'ah Amal demo with real accounts, a SQLite database and server-enforced data isolation.

**Architecture:** A Fastify (TypeScript, run with `tsx`) API on Drizzle ORM + better-sqlite3 serves `/api/*`. The existing vanilla SPA is copied to `web/`; `store.js`/`data.js` are replaced by an async `api.js`, and each route gains a `load()` step so views keep rendering synchronously from loaded data. Pure date and scoring logic lives in `shared/` and is imported by both the server and the browser.

**Tech Stack:** Node ≥ 20 (dev machine has 24), Fastify 5, `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/static`, Drizzle ORM + drizzle-kit, better-sqlite3, `@node-rs/argon2`, zod, tsx, Vitest (+ jsdom for web tests), Vite 6, Playwright, concurrently.

**Spec:** `mutabaah-live/docs/specs/2026-10-09-live-version-design.md`. Read it before starting any task; section numbers below (§) refer to it.

## Global Constraints

- All work lives under `mutabaah-live/`. Never modify `mutabaah/stitch_mutaba_ah_amal_worship_tracker/` (copy from it only).
- Timezone: `Asia/Kuala_Lumpur` (UTC+8, no DST) for every "today", week and month calculation. Never use the server's local time.
- Weeks are ISO weeks, Monday–Sunday.
- All user-facing text is Malay. Error copy fixed by the spec: *"Emel sudah didaftarkan"*, *"Kod jemputan tidak sah"*, *"Emel atau kata laluan salah"*, *"Gagal disimpan — cuba lagi"*.
- Error body shape: `{ "error": { "code": "<CODE>", "message": "<Malay>" } }`. Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500.
- Resources belonging to another usrah return **404**, never 403.
- The usrah id used in any query comes from the caller's active membership, never from request input.
- Passwords: argon2id, minimum 8 characters. Emails are trimmed and lower-cased before storage and lookup.
- Session cookie: name `sid`, `httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, 30-day sliding expiry. Only the SHA-256 hash of the token is stored.
- Mutating requests (POST/PUT/PATCH/DELETE) must have `Content-Type: application/json` and an `Origin` equal to `APP_ORIGIN`, otherwise 403.
- Rate limits: login 10 per 15 min per IP+email; signup 10 per hour per IP.
- Naqib invite: single use, valid 7 days. Member invite code: format `AAA-9999` (3 uppercase letters, dash, 4 digits — no `O`/`0`/`I`/`1` ambiguity: letters from `ABCDEFGHJKLMNPQRSTUVWXYZ`, digits `2–9`), reusable until regenerated.
- Log edit window: `date ≤ today` and (same month as today, or previous month while today's day-of-month ≤ 7).
- Status bands over the last 4 weeks: ≥ 80 → A *Teguh*, 60–79 → B *Sederhana*, < 60 → C *Perlu Perhatian*.
- Env vars: `DATABASE_URL` (default `file:./data/mutabaah.db`), `PORT` (default `3001`), `APP_ORIGIN` (default `http://localhost:3000`), `NODE_ENV`.

## Review Focus

1. **A member logging just after midnight Malaysian time** (16:00–23:59 UTC) must be saving *today's* KL date, and the server must accept it. Pinned in Task 1 (`todayKL`) and Task 6 (`PUT /logs` at a fixed `now` of `2026-10-08T16:30:00Z`).
2. **A member who joined this week** must not show a low 4-week score or Level C. Pinned in Task 2 (`periodScore` with `joinedOn`) and Task 8 (summary for a new member).
3. **Malformed log values** (a negative count, a string, an amalan id from another usrah, a `prayers` object with extra keys) must be rejected with 400, not stored. Pinned in Task 6.
4. **Email typed with different case or spaces at login** (`" Ahmad@Usrah.MY "`) must log in to the account registered as `ahmad@usrah.my`, and must count as a duplicate at signup. Pinned in Task 4 and Task 5.
5. **A naqib removing or resetting the password of themselves or another naqib** through the member endpoints must be refused (403), so a usrah can't be left without a naqib. Pinned in Task 7.

---

## File Structure

```
mutabaah-live/
├── package.json                 workspaces-free single package; scripts below
├── tsconfig.json                allowJs, strict, module NodeNext
├── vitest.config.ts             projects: server (node), shared (node), web (jsdom)
├── drizzle.config.ts
├── shared/
│   ├── dates.js                 KL date helpers (Task 1)
│   └── score.js                 scoring (Task 2)
├── server/
│   ├── src/
│   │   ├── index.ts             entry: reads env, migrates, listens
│   │   ├── app.ts               buildApp({ db, now, appOrigin }) → FastifyInstance
│   │   ├── errors.ts            AppError + error handler
│   │   ├── db/
│   │   │   ├── schema.ts        Drizzle tables (§7)
│   │   │   ├── client.ts        openDb(url) → Db; migrateDb(db)
│   │   │   └── defaultAmalan.ts DEFAULT_AMALAN (17 items)
│   │   ├── auth/
│   │   │   ├── password.ts      hashPassword, verifyPassword, randomTempPassword
│   │   │   ├── sessions.ts      createSession, resolveSession, revokeUserSessions
│   │   │   └── guards.ts        requireUser, requireNaqib, requireAdmin
│   │   ├── services/
│   │   │   ├── usrah.ts         createUsrah, generateInviteCode
│   │   │   ├── notify.ts        notify(db, userId, type, text, link)
│   │   │   └── loadScoring.ts   loads amalan + logs + joinedOn for score.js
│   │   ├── routes/
│   │   │   ├── auth.ts  admin.ts  logs.ts  amalan.ts
│   │   │   ├── naqib.ts  analytics.ts  guidance.ts  notifications.ts
│   │   └── cli/
│   │       ├── create-admin.ts
│   │       └── backup.ts
│   ├── drizzle/                 generated migrations (committed)
│   └── test/
│       ├── helpers.ts           makeTestApp(), seedUsrah(), loginAs()
│       └── *.test.ts
├── web/
│   ├── index.html  vite.config.js  css/style.css
│   └── js/
│       ├── api.js               fetch wrapper + endpoint functions (Task 10)
│       ├── session.js           cached /auth/me (Task 10)
│       ├── app.js               router with load() (Task 10)
│       └── views/               demo views + daftar.js, tukarKataLaluan.js, admin.js
├── e2e/smoke.spec.ts
└── docs/
```

**Root `package.json` scripts:**
- `dev`: `concurrently "tsx watch server/src/index.ts" "vite web"`
- `build`: `vite build web --outDir ../dist/web`
- `start`: `NODE_ENV=production tsx server/src/index.ts` (serves `dist/web` statically + `/api`)
- `test`: `vitest run` · `test:e2e`: `playwright test`
- `db:generate`: `drizzle-kit generate` · `create-admin`: `tsx server/src/cli/create-admin.ts` · `backup`: `tsx server/src/cli/backup.ts`

---

### Task 1: Project scaffold + KL date helpers

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` (`node_modules`, `data/`, `dist/`, `test-results/`), `shared/dates.js`
- Test: `shared/dates.test.js`

**Interfaces:**
- Produces (`shared/dates.js`, ES module, JSDoc-typed; date strings are always `'YYYY-MM-DD'`):
  - `TZ = 'Asia/Kuala_Lumpur'`
  - `todayKL(now?: Date): string`
  - `addDays(date: string, n: number): string`
  - `dateRange(from: string, to: string): string[]` (inclusive; `[]` when from > to)
  - `isoWeekKey(date: string): string` → `'2026-W41'`
  - `weekStart(date: string): string` (Monday)
  - `monthKey(date: string): string` → `'2026-10'`
  - `isEditableDate(date: string, today: string): boolean`

- [ ] **Step 1: Scaffold.** `npm init`, install the Tech Stack dependencies, write the scripts above and a `vitest.config.ts` with three projects (`shared/**/*.test.js` node, `server/test/**/*.test.ts` node, `web/**/*.test.js` jsdom). Run `npx vitest run` → "No test files found" (exit code accepted).

- [ ] **Step 2: Write the failing tests**

```js
import { todayKL, addDays, dateRange, isoWeekKey, weekStart, monthKey, isEditableDate } from './dates.js';
test('todayKL uses UTC+8', () => {
  expect(todayKL(new Date('2026-10-08T16:30:00Z'))).toBe('2026-10-09');
  expect(todayKL(new Date('2026-10-08T15:59:59Z'))).toBe('2026-10-08');
});
test('addDays crosses month and year', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});
test('dateRange inclusive', () => {
  expect(dateRange('2026-10-30', '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  expect(dateRange('2026-10-02', '2026-10-01')).toEqual([]);
});
test('ISO weeks', () => {
  expect(isoWeekKey('2026-10-09')).toBe('2026-W41');
  expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
  expect(weekStart('2026-10-11')).toBe('2026-10-05');
});
test('monthKey', () => expect(monthKey('2026-10-09')).toBe('2026-10'));
test.each([
  ['2026-10-09', '2026-10-09', true],
  ['2026-10-10', '2026-10-09', false],  // future
  ['2026-10-01', '2026-10-09', true],   // same month
  ['2026-09-30', '2026-10-07', true],   // grace: day 7
  ['2026-09-01', '2026-10-07', true],
  ['2026-09-30', '2026-10-08', false],  // grace over
  ['2026-08-31', '2026-10-03', false],  // two months back
  ['2025-12-31', '2026-01-05', true],   // grace across year
])('isEditableDate(%s, today=%s) = %s', (d, t, ok) => expect(isEditableDate(d, t)).toBe(ok));
```

- [ ] **Step 3: Run** `npx vitest run shared/dates.test.js` → FAIL (module not found).
- [ ] **Step 4: Implement `shared/dates.js`.** `todayKL` via `Intl.DateTimeFormat('en-CA', { timeZone: TZ })`; all other arithmetic on `Date.UTC` values so the host timezone never matters.
- [ ] **Step 5: Run** the tests → PASS.
- [ ] **Step 6: Commit** `feat(live): scaffold project and KL date helpers`.

---

### Task 2: Shared scoring

**Files:**
- Create: `shared/score.js`
- Test: `shared/score.test.js`

**Interfaces:**
- Consumes: Task 1 date helpers.
- Produces (`shared/score.js`):
  - Types: `Amalan = { id: number, freq: 'harian'|'mingguan'|'bulanan', inputType: 'count'|'check'|'prayers', targetVal: number, createdOn: string, deactivatedOn: string|null }`; `Log = { date: string, values: Record<string, number|boolean|Record<'subuh'|'zohor'|'asar'|'maghrib'|'isya', boolean>> }`.
  - `PRAYERS = ['subuh','zohor','asar','maghrib','isya']`
  - `isActiveOn(a: Amalan, date: string): boolean`
  - `dayValue(a: Amalan, raw): number`: count → number (0 if missing); check → 1/0; prayers → number of true prayers.
  - `isDayMet(a: Amalan, raw): boolean`: check → `raw === true`; otherwise `dayValue ≥ targetVal`.
  - `periodValue(a: Amalan, logs: Log[]): number`: check → days ticked; count → sum; prayers → days with ≥ targetVal prayers.
  - `dailyScore(amalan: Amalan[], log: Log|null, date: string) → { met, total, percentage }` (harian items active on `date` only; `percentage` 0 when `total` 0)
  - `periodScore(amalan: Amalan[], logs: Log[], opts: { from, to, today, joinedOn }) → { met, expected, percentage }`
  - `statusBand(percentage: number) → { level: 'A'|'B'|'C', label: string }`
  - `percentage` is always `Math.round(met / total * 100)`.

**`periodScore` algorithm** (the signature doesn't determine this):
```
start = max(from, joinedOn); end = min(to, today); if start > end → {0,0,0}
harian: for each day d in [start,end], each harian a active on d: expected++, met += isDayMet(a, log[d][a.id])
mingguan: for each ISO week W overlapping [start,end]:
  days = W's days ∩ [start,end]; for each mingguan a active on the last of `days`:
    ok = periodValue(a, logs in days) ≥ a.targetVal
    inProgress = (W contains today)
    if ok: met++, expected++  elif !inProgress: expected++
bulanan: same as mingguan with calendar months
```

- [ ] **Step 1: Write the failing tests** (build a fixture with one item per input type × frequency):

```js
test('isDayMet by input type', () => {
  expect(isDayMet(tilawah /*count, target 5*/, 5)).toBe(true);
  expect(isDayMet(tilawah, 4)).toBe(false);
  expect(isDayMet(dhuha /*check*/, true)).toBe(true);
  expect(isDayMet(solat /*prayers, 5*/, { subuh:true, zohor:true, asar:true, maghrib:true, isya:false })).toBe(false);
  expect(isDayMet(tilawah, undefined)).toBe(false);
});
test('dailyScore counts only harian items active that day', () => {
  // tilawah, dhuha, solat harian; qiam mingguan; dhuha deactivated on 2026-10-05
  expect(dailyScore(list, log('2026-10-04', { [tilawah.id]: 5, [dhuha.id]: true }), '2026-10-04')).toEqual({ met: 2, total: 3, percentage: 67 });
  expect(dailyScore(list, log('2026-10-05', { [tilawah.id]: 5 }), '2026-10-05')).toEqual({ met: 1, total: 2, percentage: 50 });
  expect(dailyScore(list, null, '2026-10-05').met).toBe(0);
});
test('amalan created mid-period not expected before created_on', ...);  // expected count excludes days before createdOn
test('weekly item aggregates across the week', () => {
  // riadah: mingguan count target 3; logs Mon=1, Wed=2 in completed week W40
  expect(periodScore([riadah], logs, { from:'2026-09-28', to:'2026-10-04', today:'2026-10-09', joinedOn:'2026-01-01' })).toEqual({ met:1, expected:1, percentage:100 });
});
test('in-progress week counts only if already met', () => {
  // today 2026-10-07 (Wed), qiam mingguan check target 1, no qiam yet this week
  expect(periodScore([qiam], [], { from:'2026-10-05', to:'2026-10-11', today:'2026-10-07', joinedOn:'2026-01-01' })).toEqual({ met:0, expected:0, percentage:0 });
});
test('joinedOn trims the period', () => {
  // tilawah harian; joined 2026-10-08, today 2026-10-09, 4-week window, both days met
  expect(periodScore([tilawah], twoMetDays, { from:'2026-09-12', to:'2026-10-09', today:'2026-10-09', joinedOn:'2026-10-08' })).toEqual({ met:2, expected:2, percentage:100 });
});
test.each([[80,'A'],[79,'B'],[60,'B'],[59,'C'],[0,'C']])('statusBand(%i) = %s', (p, l) => expect(statusBand(p).level).toBe(l));
```
`statusBand` labels: `'Teguh (Level A)'`, `'Sederhana (Level B)'`, `'Perlu Perhatian (Level C)'`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `shared/score.js`.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): shared scoring module`.

---

### Task 3: Database schema, migrations, default amalan

**Files:**
- Create: `drizzle.config.ts`, `server/src/db/schema.ts`, `server/src/db/client.ts`, `server/src/db/defaultAmalan.ts`, `server/drizzle/*` (generated)
- Test: `server/test/db.test.ts`

**Interfaces:**
- Produces:
  - Every §7 table as a Drizzle `sqliteTable`, exported as `users, sessions, usrah, naqibInvites, memberships, amalan, dailyLogs, guidance, guidanceReads, guidanceReplies, notifications`. Integer autoincrement ids; timestamps as integer ms (`mode: 'timestamp_ms'`); dates as text `YYYY-MM-DD`; `dailyLogs.values` as text `mode: 'json'`; booleans `mode: 'boolean'`.
  - Unique indexes: `users.email`, `sessions.tokenHash`, `usrah.inviteCode`, `naqibInvites.tokenHash`, `dailyLogs(userId, date)`. Partial unique index on `memberships(userId) WHERE removed_at IS NULL`.
  - `type Db = BetterSQLite3Database<typeof schema>`
  - `openDb(url: string): Db` (`':memory:'` or `file:` path; creates the parent directory; sets `journal_mode=WAL`, `foreign_keys=ON`)
  - `migrateDb(db: Db): void`
  - `DEFAULT_AMALAN: Array<Omit<NewAmalan, 'id'|'usrahId'|'createdOn'>>`: the 17 demo items from `mutabaah/.../js/data.js` `INITIAL_AMALAN`, with `freq` lower-cased and `inputType` set: `solat_fardhu` → `prayers` (target 5); `tilawah`, `istighfar`, `rawatib`, `buku`, `riadah` → `count`; all others → `check`. `riadah` target 3 per week (mingguan count); `sort` = code order.

- [ ] **Step 1: Write the failing test.** `openDb(':memory:')` + `migrateDb` succeeds; inserting two `dailyLogs` rows with the same `(userId, date)` throws; inserting a second active membership for one user throws, but succeeds once the first has `removedAt` set; `DEFAULT_AMALAN.length === 17` and exactly one item is `prayers`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement schema and client; run `npm run db:generate`** to produce the migration.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): database schema and migrations`.

---

### Task 4: App shell, errors, sessions, login/logout/me/change-password, create-admin

**Files:**
- Create: `server/src/app.ts`, `server/src/index.ts`, `server/src/errors.ts`, `server/src/auth/password.ts`, `server/src/auth/sessions.ts`, `server/src/auth/guards.ts`, `server/src/routes/auth.ts` (login/logout/me/change-password only), `server/src/cli/create-admin.ts`, `server/test/helpers.ts`
- Test: `server/test/auth.test.ts`, `server/test/security.test.ts`

**Interfaces:**
- Consumes: Task 3 `openDb`, `migrateDb`, schema.
- Produces:
  - `buildApp(opts: { db: Db, now?: () => Date, appOrigin: string, rateLimit?: boolean }): FastifyInstance`. `now` defaults to `() => new Date()` and is decorated as `app.now`; `app.db` likewise.
  - `class AppError extends Error { constructor(status: number, code: string, message: string) }`; the error handler maps `AppError`, zod errors (→ 400 `VALIDATION_ERROR`, message `"Maklumat tidak sah"` plus `fields`) and anything else (→ 500 `INTERNAL`, `"Ralat pelayan"`).
  - `hashPassword(pw): Promise<string>`, `verifyPassword(hash, pw): Promise<boolean>`, `randomTempPassword(): string` (12 chars, unambiguous alphabet).
  - `createSession(db, userId, now): string` (returns the raw token), `resolveSession(db, rawToken, now): { user, membership|null } | null` (extends `expiresAt` to now + 30 days when < 15 days remain), `revokeUserSessions(db, userId): void`.
  - Guards as Fastify `preHandler`s that set `req.user` and `req.membership` (`{ usrahId, role }`): `requireUser` (401 if no session; also 401 if non-admin with no active membership), `requireNaqib` (403 unless role naqib), `requireAdmin` (403 unless `isAdmin`). Exception: when `user.mustChangePassword` is true, every route except `/auth/me`, `/auth/change-password` and `/auth/logout` returns 403 `PASSWORD_CHANGE_REQUIRED`.
  - `GET /api/auth/me` → `{ user: { id, name, email, phone, isAdmin, mustChangePassword }, usrah: { id, name } | null, role: 'naqib'|'member'|null }`
  - Test helpers: `makeTestApp(opts?: { now?: string }) → { app, db, setNow(iso) }`; `createUser(db, { email, name, password?, isAdmin? }) → userId`; `loginAs(app, email, password = 'katalaluan123') → cookieHeader: string`; `api(app, cookie) → { get, post, put, patch, del }` that set `Origin` and JSON content-type.
  - CLI `create-admin`: prompts (readline) for name, email, password; inserts the admin user; refuses a duplicate email.

- [ ] **Step 1: Write the failing tests.**
  - `auth.test.ts`: login with the correct password → 200 + `Set-Cookie: sid=…; HttpOnly; SameSite=Lax`; wrong password and unknown email → both 401 with the identical message `"Emel atau kata laluan salah"`; **login with `" Ahmad@Usrah.MY "` succeeds for `ahmad@usrah.my`**; `/auth/me` without a cookie → 401; logout → the old cookie is now 401; a session past `expiresAt` (use `setNow`) → 401; change-password with the wrong current password → 400, with a new password of 7 chars → 400, success clears `mustChangePassword`; a user with `mustChangePassword` gets 403 `PASSWORD_CHANGE_REQUIRED` on any other `/api` route (use a stub route registered in the test).
  - `security.test.ts`: a POST without `Origin` or with a foreign `Origin` → 403; a POST with `text/plain` → 403; the 11th failed login within 15 min → 429 (`rateLimit: true`); the error body always matches `{ error: { code, message } }`; responses carry helmet headers (`x-content-type-options: nosniff`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the files above. `index.ts`: read env, `openDb`, `migrateDb`, `buildApp`, and in production register `@fastify/static` for `dist/web` with an SPA fallback to `index.html` for non-`/api` paths.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Manual check:** `npm run create-admin` creates a user; `curl` to `/api/auth/login` returns a cookie.
- [ ] **Step 6: Commit** `feat(live): app shell, sessions and login`.

---

### Task 5: Usrah creation, admin routes, signup (member code + naqib invite)

**Files:**
- Create: `server/src/services/usrah.ts`, `server/src/services/notify.ts`, `server/src/routes/admin.ts`
- Modify: `server/src/routes/auth.ts` (add signup)
- Test: `server/test/signup.test.ts`, `server/test/admin.test.ts`

**Interfaces:**
- Consumes: Task 4 guards, helpers, `createSession`, `hashPassword`; Task 3 `DEFAULT_AMALAN`; Task 1 `todayKL`.
- Produces:
  - `generateInviteCode(): string` (format per Global Constraints); `regenerateInviteCode(db, usrahId): string` (replaces the stored code; used by Task 7's route); `createUsrah(db, name, today): { id, inviteCode }` (inserts the 17 default amalan with `createdOn = today`, retrying the code on collision).
  - `notify(db, userId, type, text, link?): void`
  - `POST /api/admin/usrah {name}` → `{ id, name, inviteCode }`; `GET /api/admin/usrah` → list with `memberCount` and `naqibName|null`; `PATCH /api/admin/usrah/:id {name}`.
  - `POST /api/admin/usrah/:id/naqib-invite` → `{ link: '<APP_ORIGIN>/#daftar?jemputan=<token>', expiresAt }`
  - `POST /api/admin/users/:id/reset-password` → `{ temporaryPassword }` (sets `mustChangePassword`, revokes sessions)
  - Test helper added to `helpers.ts`: `seedUsrah(app, db, name) → { usrahId, inviteCode, naqib: { id, email, cookie } }` (creates an admin, the usrah, a naqib invite and the naqib signup through the real endpoints).
  - `POST /api/auth/signup {name, email, phone?, password, inviteCode?, naqibInvite?}` (exactly one of the last two) → 201 + session cookie + the same body as `/auth/me`.

- [ ] **Step 1: Write the failing tests.**
  - `signup.test.ts`: a valid member code → 201, role `member`, logged in, and the naqib has a notification whose text starts `"Ahli baru: "`; the code is case-insensitive (`nur-7k4q` works); an unknown code → 400 `"Kod jemputan tidak sah"`; **duplicate email in different case/spacing → 409 `"Emel sudah didaftarkan"`**; password of 7 chars → 400; sending both `inviteCode` and `naqibInvite` → 400; after `regenerateInviteCode(db, usrahId)` the old code → 400 and the new one → 201; naqib invite → role `naqib`; a reused naqib invite → 400; a naqib invite at `expiresAt + 1ms` → 400; a user who already has an active membership can't get a second one (signing up again with a new email is the only path, so assert the partial unique index holds).
  - `admin.test.ts`: a non-admin → 403 on every `/api/admin/*` route; `createUsrah` produces 17 amalan; the list shows `naqibName` after the invite is accepted; admin reset-password → the old password fails, the temporary one works and `me.user.mustChangePassword === true`, and the old sessions are 401.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Signup runs in one transaction (user + membership + invite `usedAt`). The admin is also allowed to have no membership; the admin's `/auth/me` returns `usrah: null, role: null`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): usrah admin and invite-code signup`.

---

### Task 6: Member amalan + logs

**Files:**
- Create: `server/src/routes/amalan.ts` (GET only in this task), `server/src/routes/logs.ts`
- Test: `server/test/logs.test.ts`

**Interfaces:**
- Consumes: guards, `seedUsrah`, `isEditableDate`, `todayKL`, `PRAYERS`.
- Produces:
  - `GET /api/amalan` → `Amalan[]` (shape from Task 2, plus `code, name, description, unit, icon, sort, active`), including deactivated items (the client needs them to show history), sorted by `sort`.
  - `GET /api/logs?from&to` → `{ logs: Log[] (with notes, updatedAt), today, editableFrom }` where `editableFrom` is the earliest editable date per the window rule. Range > 400 days → 400.
  - `PUT /api/logs/:date {values?, notes?}` → the merged `Log`. Validation: `date` is a real calendar date; each key is the id of an amalan **in the caller's usrah**; the value matches that amalan's `inputType` (count: integer 0–100000; check: boolean; prayers: an object with exactly the 5 prayer keys, all boolean); `notes` ≤ 2000 chars. Outside the window → 403 `LOG_LOCKED`, message `"Log bulan ini sudah dikunci"`. The stored `usrahId` is the caller's.

- [ ] **Step 1: Write the failing tests.**
  - PUT then GET roundtrip; two PUTs with different keys **merge** (both keys present); `notes` only does not wipe `values`.
  - **Malformed values → 400:** count `-1`, count `"5"`, count `2.5`, check `"true"`, prayers missing `isya`, prayers with an extra key `tahajjud`, an amalan id from another usrah (create a second usrah with `seedUsrah`), a nonexistent id; `2026-02-30` → 400.
  - **Timezone:** with `now = 2026-10-08T16:30:00Z`, `PUT /logs/2026-10-09` → 200 and `PUT /logs/2026-10-10` → 403.
  - Window: with `now` on KL `2026-10-07`, `PUT /logs/2026-09-30` → 200; with `now` on KL `2026-10-08` → 403 `LOG_LOCKED`; `GET /logs` reports `editableFrom` `'2026-09-01'` and `'2026-10-01'` respectively.
  - Isolation: member B can never see member A's logs (GET only ever returns your own).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Build the per-request zod schema for `values` from the usrah's amalan list.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): member logs with edit window`.

---

### Task 7: Naqib management: amalan CRUD, invite code, members

**Files:**
- Modify: `server/src/routes/amalan.ts`
- Create: `server/src/routes/naqib.ts` (management routes in this task; summaries come in Task 8)
- Test: `server/test/naqib-manage.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/amalan {code?, name, description?, freq, inputType, targetVal, unit, icon?, sort?}` → the created `Amalan` (`createdOn = today`). `PATCH /api/amalan/:id` (any of the same fields + `active`; setting `active:false` sets `deactivatedOn = today`, `active:true` clears it; `inputType` can't change once any log references the item → 409). `DELETE /api/amalan/:id` = deactivate.
  - `GET /api/usrah/invite-code` → `{ inviteCode, link }`; `POST /api/usrah/invite-code/regenerate` → the new `{ inviteCode, link }`. `link = <APP_ORIGIN>/#daftar?kod=<code>`.
  - `POST /api/members/:id/reset-password` → `{ temporaryPassword }`; `DELETE /api/members/:id` → 204 (sets `removedAt`, revokes sessions).
  - `:id` that isn't an active member of the caller's usrah → 404.

- [ ] **Step 1: Write the failing tests.** A member gets 403 on all of these routes; naqib A gets 404 for usrah B's amalan id and member id; deactivating then reading `/api/amalan` shows `active:false, deactivatedOn: today`; changing `inputType` after a log exists → 409; regenerate → the old code fails at signup and the new one works; reset-password → the member's next request is 403 `PASSWORD_CHANGE_REQUIRED`; a removed member's cookie → 401 and the member is absent from `/api/usrah/summary` (assert in Task 8, or here via the DB). **Self/naqib protection:** `DELETE /api/members/<own id>` → 403 and `reset-password` on a naqib's id → 403, message `"Tindakan ini tidak dibenarkan"`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): naqib amalan, invite code and member management`.

---

### Task 8: Analytics endpoints

**Files:**
- Create: `server/src/services/loadScoring.ts`, `server/src/routes/analytics.ts`
- Modify: `server/src/routes/naqib.ts`
- Test: `server/test/analytics.test.ts`

**Interfaces:**
- Consumes: `shared/score.js` (`dailyScore`, `periodScore`, `statusBand`), `shared/dates.js`.
- Produces:
  - `loadScoring(db, usrahId, userIds: number[], from, to) → { amalan: Amalan[], logsByUser: Map<number, Log[]>, joinedOnByUser: Map<number, string> }` (one query per table).
  - `GET /api/me/analytics?weeks=8` → `{ weekly: [{ week: 'YYYY-Www', start, percentage }], heatmap: [{ date, percentage }] (60 days, oldest first), byCategory: [{ amalanId, name, met, expected, percentage }] (last 4 weeks), status: { percentage, level, label } }`
  - `GET /api/usrah/summary` → `{ usrah: { id, name, memberCount }, kpis: { avg4w, avgThisWeek, loggedToday: number, prayerAvg4w }, roster: [{ id, name, initials, percentage4w, level, lastLogDate|null }], alerts: [{ memberId, name, kind: 'no_log_3d'|'drop'|'level_c', text }] }`. Alert rules: `no_log_3d` when there's no log in the last 3 days (members who joined < 3 days ago are exempt); `drop` when this week's % is ≥ 20 points below the previous 4-week average; `level_c` when the 4-week level is C. Alert text is in Malay.
  - `GET /api/usrah/matrix?weeks=4` → `{ amalan: [{ id, code, name }], rows: [{ memberId, name, cells: Record<amalanId, percentage>, average }] }` (active amalan only).
  - `GET /api/members/:id` → `{ member: { id, name, email, phone, initials, joinedOn }, status, weekly (8 weeks, same shape as above), recentLogs: Log[] (14 days), guidance: [] (filled in by Task 9) }`

- [ ] **Step 1: Write the failing tests.** Seed a usrah with 3 members and controlled logs over 5 weeks (fixed `now`). Assert that `roster` percentages equal `periodScore` computed directly in the test; **a member who joined yesterday with 2 fully met days has `percentage4w` 100 and level A, and no `no_log_3d` alert**; a member with no logs for 4 days gets `no_log_3d`; `matrix` cells for a deactivated amalan are absent; `me/analytics` `heatmap.length === 60` and `weekly.length === 8`; a member calling `/api/usrah/summary` → 403; naqib A calling `/api/members/<usrah B member>` → 404.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): analytics and naqib summaries`.

---

### Task 9: Guidance + notifications

**Files:**
- Create: `server/src/routes/guidance.ts`, `server/src/routes/notifications.ts`
- Modify: `server/src/routes/naqib.ts` (fill in `guidance` in `GET /members/:id`)
- Test: `server/test/guidance.test.ts`

**Interfaces:**
- Produces:
  - Guidance categories (from the demo's `bimbingan.js` filters): `'peribadi'|'tilawah'|'qiamullail'|'riadah'` (the demo's `data-filter` values; `semua` is the client-side "all" filter, not a category).
  - `GET /api/guidance` → `[{ id, category, title, body, reference, toUserId|null, toName|null, fromName, createdAt, read: boolean, replies: [{ id, userName, body, createdAt }] }]`, newest first. A member sees items addressed to them or to the whole usrah (`toUserId` null); a naqib sees all items in their usrah.
  - `POST /api/guidance {toUserId|null, category, title, body, reference?}` (naqib only; `toUserId` must be an active member of the usrah) → the item; notifies the recipient(s) (`type: 'guidance'`, `link: '#bimbingan'`).
  - `POST /api/guidance/:id/replies {body}` (a recipient or the naqib) → the reply; notifies the other party.
  - `POST /api/guidance/:id/read` → 204.
  - `GET /api/notifications` → `[{ id, type, text, link, createdAt, read }]` (latest 50); `POST /api/notifications/read-all` → 204.

- [ ] **Step 1: Write the failing tests.** Personal guidance to member A isn't visible to member B (list excludes it; reply → 404); usrah-wide guidance is visible to both and creates a notification for each; a reply by A notifies the naqib; read state is per user; `toUserId` from another usrah → 404; a member POSTing guidance → 403; `GET /api/members/:id` lists that member's personal guidance.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(live): guidance and notifications`.

---

### Task 10: Web foundation: copy SPA, API client, router, auth views, admin view

**Files:**
- Copy: `mutabaah/stitch_mutaba_ah_amal_worship_tracker/{index.html,css,js}` → `web/` (excluding `js/store.js`, `js/data.js`)
- Create: `web/vite.config.js`, `web/js/api.js`, `web/js/session.js`, `web/js/views/daftar.js`, `web/js/views/tukarKataLaluan.js`, `web/js/views/admin.js`
- Modify: `web/js/app.js`, `web/js/views/login.js`
- Test: `web/js/api.test.js`, `web/js/app.test.js`

**Interfaces:**
- Consumes: all `/api` endpoints from Tasks 4–9.
- Produces:
  - `web/vite.config.js`: port 3000; `server.proxy['/api'] = 'http://localhost:3001'`; `server.fs.allow = ['..']` (so `../shared` can be imported); `resolve.alias['@shared'] = '../shared'`.
  - `api.js`: `class ApiError extends Error { status, code }`; `request(method, path, body?) → Promise<any>` (`credentials: 'same-origin'`, JSON headers; throws `ApiError` from the error body; on 401 sets `location.hash = '#login'` unless already on `login`/`daftar`; on 403 `PASSWORD_CHANGE_REQUIRED` sets `#tukar-kata-laluan`). Named exports, one per endpoint, e.g. `login(email, password)`, `signup(payload)`, `logout()`, `changePassword(cur, next)`, `getAmalan()`, `getLogs(from, to)`, `saveLog(date, { values, notes })`, `getMyAnalytics(weeks)`, `getSummary()`, `getMatrix(weeks)`, `getMember(id)`, `resetMemberPassword(id)`, `removeMember(id)`, `createAmalan(a)`, `updateAmalan(id, patch)`, `deactivateAmalan(id)`, `getInviteCode()`, `regenerateInviteCode()`, `getGuidance()`, `sendGuidance(g)`, `replyGuidance(id, body)`, `markGuidanceRead(id)`, `getNotifications()`, `markNotificationsRead()`, `adminListUsrah()`, `adminCreateUsrah(name)`, `adminNaqibInvite(id)`.
  - `session.js`: `loadSession(force?) → Promise<Me|null>` (cached `/auth/me`; `null` on 401), `getSession() → Me|null`, `clearSession()`.
  - Router contract: a route is `{ render(data) → string, init(data) → void, load?: (params) → Promise<data>, title, roles: Array<'member'|'naqib'|'admin'|'public'> }`. `handleRoute()` is async: it ensures the session, redirects by role (public routes `login`, `daftar`; when logged out → `#login`; `mustChangePassword` → `#tukar-kata-laluan`; default route: admin → `admin`, naqib → `ringkasan`, member → `hari-ini`; a route not in the user's `roles` → that default), shows a skeleton (`<div class="skeleton">` blocks styled in `css/style.css` with a shimmer animation) while `load` runs, then `render(data)` + `init(data)`. If `load` throws, it shows an inline error card with a *"Cuba lagi"* button. A route token guards against stale renders when the hash changes mid-load. Hash params (`#daftar?kod=X`) are passed to `load` as `URLSearchParams`.
  - The header renders the user's name, usrah name, role and the unread notification count from the session/notifications. The **role switcher is removed**, and the sub-bar's hard-coded "Ustaz Hazwan / Ahmad Faiz / Sesi Usrah Mingguan ke-24" text is replaced with session data (*"Hanya anda & Naqib (<naqib name>)"*; the week text is dropped). A logout button calls `logout()` + `clearSession()`.
  - `login.js`: email/password form, no prefilled credentials or role picker, a link to `#daftar`, and the API error message shown inline.
  - `daftar.js`: fields name, email, confirm email, phone (optional), password, confirm password, invite code (prefilled from `?kod=`; hidden and replaced by *"Jemputan Naqib"* text when `?jemputan=` is present). Client-side checks: emails match, passwords match, ≥ 8 chars. Success → `loadSession(true)` → default route.
  - `tukarKataLaluan.js`: current, new, confirm → `changePassword` → default route.
  - `admin.js` (roles `['admin']`): usrah table (name, invite code, member count, naqib); create form; *"Jemput Naqib"* button showing the link with a copy button.

- [ ] **Step 1: Copy the SPA** and confirm `npx vite web` serves it (it will error on the missing `store.js`; that's expected until Step 4).
- [ ] **Step 2: Write the failing tests** (jsdom, `fetch` mocked):
  - `api.test.js`: `request` sends `credentials` + JSON headers; a 400 body becomes an `ApiError` with `code` and `message`; a 401 sets `location.hash` to `#login`; 403 `PASSWORD_CHANGE_REQUIRED` sets `#tukar-kata-laluan`.
  - `app.test.js`: logged out + `#hari-ini` → renders login; member + `#ringkasan` → redirected to `#hari-ini`; naqib + `#hari-ini` → `#ringkasan`; admin + empty hash → `#admin`; a `load` rejection renders the *"Cuba lagi"* card; the skeleton is present while `load` is pending.
- [ ] **Step 3: Run** `npx vitest run web` → FAIL.
- [ ] **Step 4: Implement** the files above. Every view not yet migrated (Tasks 11–13) gets a temporary `load` that returns `{}` and renders a *"Sedang dinaik taraf"* placeholder card, so the app runs end-to-end after this task. Remove each placeholder in the task that migrates the view.
- [ ] **Step 5: Run** → PASS.
- [ ] **Step 6: Manual check:** `npm run dev`; create an admin via the CLI; as admin create a usrah and an invite; sign up the naqib in a private window; sign up a member with the code; confirm each lands on their default route and the header shows the right names.
- [ ] **Step 7: Commit** `feat(live): web client foundation and auth screens`.

---

### Task 11: Hari Ini: dynamic amalan

**Files:**
- Modify: `web/js/views/hariIni.js`
- Test: `web/js/views/hariIni.test.js`

**Interfaces:**
- Consumes: `getAmalan`, `getLogs`, `saveLog`; `@shared/score.js` (`dailyScore`, `isActiveOn`, `PRAYERS`), `@shared/dates.js`.
- Produces: `load(params)` → `{ amalan, logs, today, editableFrom, activeDate }` (`activeDate` from `?tarikh=YYYY-MM-DD`, default `today`; fetches the 7-day strip's week plus the period needed for weekly/monthly progress); `render(data)`; `init(data)`.

Behaviour:
- Group the amalan cards by `freq` (*Harian*, *Mingguan*, *Bulanan*), showing those active on `activeDate`. The card type follows `inputType`: `count` → the existing stepper (step 1; `data-max` = `targetVal * 10`), `check` → the existing toggle, `prayers` → the existing five-prayer row. Mingguan/bulanan cards show period progress, e.g. *"2 / 3 minggu ini"*, computed with `periodValue`.
- The score ring uses `dailyScore`.
- The week strip navigates by setting `#hari-ini?tarikh=`. Future days are disabled. Days before `editableFrom` render read-only (inputs `disabled`, a lock badge *"Dikunci"*).
- Saving: every change updates local state and the ring immediately, collects changed keys, and after 800 ms of inactivity calls `saveLog(activeDate, { values: changedKeysOnly })`; notes save on blur. Save pill states: *Menyimpan…*, *Disimpan <HH:MM>*, *Gagal disimpan — cuba lagi* (clicking it retries the pending keys). A navigation while a save is pending flushes it first.

- [ ] **Step 1: Write the failing tests:** given a fixture amalan list with one of each `inputType`, render produces exactly one stepper, one toggle and one five-prayer row; a deactivated item (`deactivatedOn ≤ activeDate`) isn't rendered; with `activeDate < editableFrom` all inputs are `disabled` and *"Dikunci"* is present; clicking a stepper twice within 800 ms results in one `saveLog` call with only the changed key (fake timers); a rejected `saveLog` shows *"Gagal disimpan — cuba lagi"*.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**, reusing the existing markup and classes for each card type. **Step 4: Run** → PASS.
- [ ] **Step 5: Manual check** in the browser: log several items, reload, values persist; change the date via the strip; the score ring matches `/api/me/analytics` today's heatmap value.
- [ ] **Step 6: Commit** `feat(live): dynamic Hari Ini tracker`.

---

### Task 12: Tetapan + Bimbingan

**Files:**
- Modify: `web/js/views/tetapan.js`, `web/js/views/bimbingan.js`

**Interfaces:**
- Consumes: amalan CRUD, invite code, guidance endpoints.
- Tetapan `load` → `{ amalan, invite }`. The add/edit modal gains an *"Jenis input"* select (*Kiraan* = count, *Tanda* = check, *Solat 5 waktu* = prayers) and a frequency select; the edit modal disables *Jenis input* and shows the API's 409 message if a change is refused. Delete becomes *"Nyahaktif"*, with a toggle to show deactivated items and reactivate them. An invite-code card shows the code, the link, a copy button and *"Jana kod baru"* behind a confirm dialog.
- Bimbingan `load` → `{ items }`. It keeps the demo's category filters, opening an item calls `markGuidanceRead`, and replies call `replyGuidance` then re-run `load`.

- [ ] **Step 1: Implement both views** against the API, removing their placeholders.
- [ ] **Step 2: Manual check:** as naqib, add a *count* amalan; as member, it appears on Hari Ini as a stepper. Deactivate it; it disappears from today but yesterday's value is kept. Regenerate the code; the old link fails at Daftar. Send guidance from Profil Ahli (after Task 13) or via `curl`; the member sees it, replies, and the naqib's bell shows the reply.
- [ ] **Step 3: Run** `npm test` → all PASS (no regressions).
- [ ] **Step 4: Commit** `feat(live): Tetapan and Bimbingan on live data`.

---

### Task 13: Ringkasan, Matriks, Profil Ahli, Analitik on real data

**Files:**
- Modify: `web/js/views/ringkasan.js`, `matriks.js`, `profilAhli.js`, `analitik.js`

**Interfaces:**
- Consumes: `getSummary`, `getMatrix`, `getMember`, `getMyAnalytics`, `sendGuidance`, `resetMemberPassword`, `removeMember`.
- Ringkasan: KPI cards from `kpis`; roster grid from `roster` (colour by `level`: A success, B warning, C error tokens); alerts from `alerts`; an invite-code chip linking to `#tetapan`. Empty state when `memberCount` is 0: *"Belum ada ahli. Kongsi kod jemputan anda."* plus the code.
- Matriks: columns from `amalan`, rows from `rows`; keeps the demo's search/filter/sort on the client.
- Profil Ahli: route `#profil-ahli?id=<memberId>`; with no id, show a member picker from the summary roster. The trend chart's SVG path is generated from `weekly`. Actions: *Hantar bimbingan* (existing form → `sendGuidance`); *Set semula kata laluan* → confirm → a modal showing `temporaryPassword` once with a copy button; *Keluarkan ahli* → confirm (type the member's name) → `removeMember` → `#ringkasan`.
- Analitik: the 8-week bars from `weekly`, the 60-day heatmap from `heatmap`, the category breakdown from `byCategory`, the status badge from `status`. Remove every hard-coded number and static SVG path from these four files.

- [ ] **Step 1: Implement the four views**, removing their placeholders and `window.navigateToMember`'s use of the old store (it now sets `#profil-ahli?id=`).
- [ ] **Step 2: Verify that nothing hard-coded remains:** `grep -nE "81\.2|96\.4|Hazwan|Ahmad Faiz|store\." web/js -r` → no matches.
- [ ] **Step 3: Manual check** with two members logging different amounts: the Ringkasan roster, the Matriks row averages and the Profil Ahli trend agree with each other.
- [ ] **Step 4: Run** `npm test` → all PASS.
- [ ] **Step 5: Commit** `feat(live): naqib dashboards and analytics on live data`.

---

### Task 14: E2E smoke, backup script, README

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `server/src/cli/backup.ts`, `README.md`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- `playwright.config.ts`: `webServer` runs the server with `DATABASE_URL=file:./data/e2e.db` (deleted beforehand) plus Vite; `globalSetup` creates the admin through `create-admin` logic imported directly (non-interactive helper `createAdmin(db, {name,email,password})` exported from `create-admin.ts`).
- `backup.ts`: uses better-sqlite3's `db.backup()` to write `data/backups/mutabaah-YYYYMMDD-HHmm.db`, keeping the newest 14 files.

- [ ] **Step 1: Write the smoke test:** admin logs in → creates *"Usrah Ujian"* → gets the naqib invite link → (new browser context) naqib signs up through the link → reads the invite code on Ringkasan → (new context) member signs up with `#daftar?kod=<code>` → on Hari Ini, ticks every daily item → sees the save pill *Disimpan* → (naqib context) reloads Ringkasan → the member's roster card shows 100% and Level A.
- [ ] **Step 2: Run** `npm run test:e2e` → PASS (the code already exists; if it fails, it's a real bug: fix it in the owning task's files).
- [ ] **Step 3: Write `backup.ts`; run** `npm run backup` → a file appears in `data/backups/`.
- [ ] **Step 4: Write `README.md`:** what it is; requirements (Node ≥ 20); `npm install`, `npm run create-admin`, `npm run dev`; production (`npm run build`, `npm start`, the env vars from Global Constraints, run behind HTTPS, persistent disk for `data/`, a daily cron for `npm run backup`); the account flow in five lines; a pointer to spec §11 for expansion plans.
- [ ] **Step 5: Run the full suite** `npm test && npm run test:e2e` → PASS.
- [ ] **Step 6: Commit** `feat(live): e2e smoke test, backups and README`.

---

## Spec coverage check

| Spec § | Task |
|---|---|
| §3 Architecture, env, dev/prod serving | 1, 4, 10, 14 |
| §4 Roles & permissions, isolation | 4, 6, 7, 8, 9 |
| §5.1 create-admin | 4 |
| §5.2–5.4 usrah, naqib invite, member signup, rules | 5, 10 |
| §5.5 password reset + forced change | 4, 5, 7, 10, 13 |
| §5.6 remove member | 7, 13 |
| §6 Security (argon2, sessions, rate limit, CSRF, helmet, zod) | 4 |
| §7 Data model | 3 |
| §8 Scoring incl. activity dates, joined date, in-progress periods | 2, 8 |
| §9 API (all endpoints) | 4–9 |
| §10 Frontend | 10–13 |
| §12 Error handling | 4, 10 |
| §13 Testing (unit, integration, isolation, window, E2E) | 1, 2, 4–9, 14 |
