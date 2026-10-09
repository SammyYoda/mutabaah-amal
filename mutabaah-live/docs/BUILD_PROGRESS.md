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
(none)

## Task log
