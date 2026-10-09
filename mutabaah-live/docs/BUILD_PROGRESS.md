# SDD ledger — plan: mutabaah-live/docs/plans/2026-10-09-live-version.md

Spec: mutabaah-live/docs/specs/2026-10-09-live-version-design.md
Branch: live-version (branched from master at cee0f3b)
Workspace (git-ignored): .superpowers/sdd/2026-10-09-live-version/
Tracked mirror (committed after each task): mutabaah-live/docs/BUILD_PROGRESS.md

## How to resume after an interruption
1. Read this ledger (or the tracked mirror) and `git log --oneline`.
2. Tasks with a `Task <N>: complete` line are DONE — never re-dispatch them.
3. A task whose last line is `dispatched`/`fix round` is mid-flight: check `git log` for its commits, then
   either review what exists (if the implementer committed) or re-dispatch the implementer with the brief + report file.
4. Anything under `## Blockers` that is OPEN must be resolved before continuing.

## Pre-flight scan

| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 → T2 | dates.js helpers → score.js | consistent |
| T1 → T10 | vitest web project (jsdom) → web tests | T10 needs `@shared` alias in the vitest web project too (Ruling R3) |
| T2 ↔ T3 | Amalan {createdOn, deactivatedOn, inputType, targetVal, freq} ↔ schema columns | names match (camelCase in Drizzle) |
| T3 → T4–T9 | schema, openDb, migrateDb | consistent |
| T4 → T5–T9 | guards, helpers (makeTestApp, createUser, loginAs, api) | consistent; `rateLimit` default unspecified (Ruling R2) |
| T4 → T14 | create-admin CLI → T14 globalSetup imports `createAdmin(db,…)` | T4 doesn't list the export (Ruling R1) |
| T5 → T7 | regenerateInviteCode service → regenerate route | consistent after plan fix 402b002 |
| T6 → T7 | routes/amalan.ts GET → CRUD added | consistent |
| T7 ↔ T8 | removed member excluded from summary: T7 defers assertion to T8, T8 test list omits it | gap (Ruling R4) |
| T8 → T9 | GET /members/:id `guidance: []` → filled by T9 | consistent |
| T8 → T13, T9 → T12, T6 → T11 | API shapes → views | consistent |
| T10 → T11–T13 | router contract {load, render, init, roles}, api.js names | consistent |
| T1 self | .gitignore; root repo .gitignore ignores `package-lock.json` | lockfile would not be committed (Ruling R5) |
| T2 self | test "amalan created mid-period" body is `...` | implementer writes it from the stated rule; fine |
| T3–T9 self | tests vs interfaces | consistent |
| T10 self | creates views, placeholders for unmigrated views | consistent |
| T11–T13 self | grep check in T13 (`store\.`) won't match `localStorage.` (case) | fine |
| T14 self | consistent given R1 |
| Calendar facts | 2026-10-05 Mon W41; 2026-09-28 W40; 2027-01-01 = 2026-W53 | verified with `date` |

## Rulings
- Ruling R1: Task 4 also exports `createAdmin(db, {name,email,password}): Promise<number>` from `server/src/cli/create-admin.ts` (the CLI wraps it; module must not auto-run prompts when imported) — T14 needs it; costs nothing if wrong.
- Ruling R2: `buildApp` `rateLimit` defaults to `true`; `makeTestApp` passes `false` unless a test asks for it — otherwise unrelated tests trip limits; if wrong, tests flake or limits are off in prod (prod path uses default true).
- Ruling R3: Task 10 adds the `@shared` alias to the vitest web project as well as vite.config.js — web tests import shared modules; if wrong, web tests fail to resolve.
- Ruling R4: Task 7 asserts removal via DB (`removedAt` set, sessions gone, cookie 401); Task 8 must exclude removed members from roster/matrix/summary and test it — spec §5.6; if wrong, removed members pollute dashboards.
- Ruling R5: `mutabaah-live/.gitignore` re-includes `!package-lock.json` so installs are reproducible — root .gitignore ignores lockfiles repo-wide; if wrong, one extra tracked file.

## Blockers
(none open)

## Task log
Task 1: dispatched (base b9b5808, implementer agent af916bd596c338e5f, sonnet)
Task 1: implementer DONE (783a06e); review dispatched
Task 1: ⚠️ items resolved by controller — lockfile tracked; vitest 5.0.3 / typescript 7.0.2 / @types/node 26.6.4 installed and real; 13/13 pass on re-run
Task 1: minor (deferred): dates.test.js lacks leap-day addDays, weekStart Mon/Sun, 2024-12-30→2025-W01 cases
Task 1: minor (deferred): tsconfig lacks `types: ["vitest/globals"]` — test type-check may complain later
Task 1: minor (deferred): dates.js has no input validation (malformed date → NaN); API layer validates
Task 1: complete (commits b9b5808..783a06e, review clean)
Task 2: dispatched (base 855c640, implementer agent a444ff9292267feb9, sonnet)
Task 2: implementer DONE (9963d7b); review dispatched
Task 2: review — spec ✅, quality Approved; 1 Important (plan-mandated): partial edge week/month at window start is aggregated over the stub only yet counted as expected → weekly items nearly always "missed" in rolling 4-week windows
Ruling R6: mingguan/bulanan periods are judged WHOLE — values aggregate over the full ISO week / calendar month clipped only by joinedOn and today (not by from/to); a period counts in expected unconditionally only if it is completed (does not contain today) AND starts on/after joinedOn; otherwise it counts only if already met. Activity = active on the last day of the period clipped to [joinedOn, today]. Spec §8 updated to match. — the rolling-window stub penalty would skew every dashboard; cost if wrong: period scores for weekly/monthly items differ slightly from a strictly-clipped reading of §8.
Task 2: minor (deferred → carried to Task 3): prayers item with null targetVal is always met — schema must default prayers target_val to 5 / NOT NULL
Task 2: minor (deferred): weekly prayers aggregation = days with ≥targetVal prayers compared against same targetVal (plan-mandated ambiguity)
Task 2: minor (deferred): count values not validated in score.js (API validates, Task 6)
Task 2: minor (deferred): test gaps — mingguan deactivated mid-week, completed unmet month, week spanning month boundary; weekStart(d) computed twice at score.js:101
Task 2: fix round 1/5 dispatched (fix base 61bf33f; resumed implementer a444ff9292267feb9 with R6)
Task 2: fix round 1/5 (1 addressed, 0 open — R6 whole-period judging; commits 61bf33f..b2a3c64)
Task 2: complete (commits 855c640..b2a3c64, review clean)
Task 3: dispatched (base ec8910a, implementer agent a081c3947324afd59, sonnet; prayers target NOT NULL carried from T2)
Task 3: implementer DONE (0ea4403); review dispatched
Task 3: review — spec ✅, quality Approved
Task 3: minor (deferred): no lookup indexes on FKs (memberships.usrah_id, amalan.usrah_id, daily_logs.usrah_id, guidance.usrah_id, notifications.user_id, guidance_replies.guidance_id)
Task 3: minor (deferred): openDb handles only `file:` prefix (no file:// or query string); NewAmalan/Amalan types live in client.ts; no tests for parent-dir creation / session cascade / cwd-independent migrations
Task 3: complete (commits ec8910a..0ea4403, review clean)
Task 4: dispatched (base 0871596, implementer agent a3d3b6b0d84479d9b, opus; carries R1, R2)
Ruling R7: Task 4 — mutating requests with JSON content-type and an EMPTY body are accepted as `{}` (custom parser) — otherwise POST /auth/logout etc. would 400 under the CSRF content-type rule; cost if wrong: none (still JSON-typed).
Ruling R8: Task 4 — login on unknown email still runs argon2 verify on a dummy hash — prevents timing-based email enumeration (spec §6 generic message intent); cost: ~1 hash per failed login.
Task 4: implementer DONE_WITH_CONCERNS (af5390c) — 74/74 tests; concerns: req.user typed non-null; removed member can log in but /me 401s; no trustProxy; CSP allows inline + Tailwind CDN; create-admin echoes password
Ruling R9: trustProxy — add `TRUST_PROXY` env (default off) in Task 14 README/index.ts so rate-limit keys use the client IP behind a reverse proxy; cost if wrong: behind a proxy, limits key on proxy IP + email (still per-email).
Ruling R10: CSP allowing inline scripts/styles + cdn.tailwindcss.com + Google Fonts is accepted — the demo SPA uses Tailwind CDN with an inline config; tightening needs a Tailwind build step (out of v1 scope); cost: weaker XSS defence-in-depth.
Task 4: review dispatched
Task 4: review — Needs fixes. Critical: CSRF/Origin check bypassable via percent-encoded prefix (/%61pi/...) — reproduced cross-origin password change. Important (plan-mandated): removed member gets a session at login but /me 401s.
Ruling R11: login for a non-admin with no active membership → 403 FORBIDDEN "Anda bukan lagi ahli mana-mana usrah. Sila hubungi naqib anda.", no session created — spec §5.6 "loses access"; cost if wrong: removed users get a clear message instead of a silent bounce (no downside found).
Task 4: minor (deferred): CSRF 403s lack helmet headers (hook registered before helmet)
Task 4: minor (deferred): 413/415 returned with code VALIDATION_ERROR (non-table status)
Task 4: minor (deferred): APP_ORIGIN compared as exact string — normalise via new URL().origin
Task 4: minor (deferred): req.user typed non-null though null on unguarded routes
Task 4: minor (deferred): create-admin echoes password
Task 4: minor (deferred): no rate limit on change-password
Task 4: minor (deferred): expired sessions only deleted on lookup (no sweep)
Task 4: fix round 1/5 dispatched (fix base 557e786; resumed implementer a3d3b6b0d84479d9b)
Task 4: fix round 1/5 (2 addressed, 0 open — CSRF check now path-independent, R11 login refusal; commits 557e786..d89facd)
Task 4: minor (deferred): any future non-JSON mutating endpoint will need a deliberate CSRF-hook exemption
Task 4: complete (commits 0871596..d89facd, 1 fix round)
Task 5: dispatched (base 838a470, implementer agent a9f132333e43bd6e5, sonnet) — interfaces.md created for later dispatches
Ruling R12: naqib invite for a usrah that already has a naqib is allowed (co-naqib) — spec doesn't forbid it and it supports handover; cost if wrong: admin could add a second naqib unintentionally.
Task 5: implementer DONE (3dd1fa9) — 93/93; review dispatched
Task 5: review — spec ✅, quality Approved (⚠️ rejoin of removed user → resolved by R13)
Ruling R13: rejoin (spec §5.6) — POST /auth/signup with an EXISTING email whose password matches, whose user is non-admin with NO active membership, plus a valid inviteCode/naqibInvite → creates a new membership (name/phone unchanged), logs in, 201. Any other existing-email case stays 409 "Emel sudah didaftarkan". Owned by Task 7 (member removal). — spec §5.6 promises rejoin with a code; cost if wrong: one extra signup branch.
Task 5: minor (deferred): naqib invite usedAt update not conditional (relies on sync transaction; add isNull(usedAt)+changes check for multi-process)
Task 5: minor (deferred): argon2 runs before code validation (bounded by 10/h/IP)
Task 5: minor (deferred): createUsrah uses new Date() for usrah.createdAt (ignores injected clock)
Task 5: minor (deferred): admin.ts correlated subqueries reference bare `usrah.id`; confusing usedAt test predicate; helpers token parsing
Task 5: minor (deferred): test gaps — notification link, 409 leaves invite unused, naqib-invite unknown usrah 404, admin 403 with plain member
Task 5: complete (commits 838a470..3dd1fa9, review clean)
Task 6: dispatched (base af763b5, implementer agent ac94d3684c80bf2f1, sonnet)
Ruling R14: log values validation accepts keys for ALL of the usrah's amalan incl. deactivated ones — members may correct a day when the item was still active; cost if wrong: a member could store a value for a deactivated item on a later day (ignored by scoring via isActiveOn).
Ruling R15: GET/PUT logs filter by userId AND current usrahId — a rejoined member in a different usrah doesn't see old-usrah logs; cost if wrong: history hidden after moving usrah.
Task 6: implementer DONE_WITH_CONCERNS-ish (e81cd62) — 117/117; weak RED (impl drafted first); PUT matches existing log by (userId,date) only → re-tags old-usrah log; review dispatched
Task 6: review — spec ✅, quality Approved
Task 6: minor → carried to Task 7: PUT /logs merges/re-tags a same-date log from a previous usrah (reachable via R13 rejoin into another usrah) — fix: start from {} / null notes when existing.usrahId !== current usrahId
Task 6: minor (deferred): test gaps — __proto__/constructor keys, 401 on /logs, fields map in other-usrah test; redundant DateParam.parse
Task 6: minor (deferred): weak RED evidence (process only)
Task 6: complete (commits af763b5..e81cd62, review clean)
Task 7: dispatched (base 5b27080, implementer agent a16d3ba8936655862, sonnet; carries R4, R13, T6 re-tag fix)
Ruling R16: rejoin with wrong password for an existing email returns 409 (not 401) — reveals nothing beyond the existing 'Emel sudah didaftarkan'; cost if wrong: a returning user with a typo sees the duplicate-email message.
Task 7: implementer DONE (0cdd7af, 99da14a, bd05494) — 132/132; review dispatched
Task 7: review — spec ✅, quality Approved (opus)
Task 7: minor (deferred): amalan UPDATEs filter by id only (add usrahId for defence in depth)
Task 7: minor (deferred): reset-password check→await hash→update gap; re-check membership/role inside txn
Task 7: minor (deferred): naqib reset-password doesn't refuse admin targets (admins can't hold memberships today)
Task 7: minor (deferred): rejoin path hashes password unnecessarily; notes '' vs null inconsistency on re-tag; re-tag overwrites old-usrah row (plan-mandated unique(user,date))
Task 7: complete (commits 5b27080..bd05494, review clean)
