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
Task 8: dispatched (base 76f359f, implementer agent ab15b7c222f8d9c2f, sonnet; carries R4, R6)
Ruling R17: analytics windows — last4w = weekStart(today)-21 .. today (4 ISO weeks incl. current); weekly series aligned to ISO weeks; heatmap 60 days; matrix weeks 1–12 default 4; prayerAvg4w = true prayers ÷ (5 × days since max(window start, joinedOn)); alerts no_log_3d (joined ≥3 days), drop (≥20 pts below prev 4 full weeks, needs prev expected > 0), level_c — plan left window alignment and KPI formulas open; cost if wrong: dashboard numbers defined differently than a naqib expects (formulas live in one service file).
Ruling R18: dashboards list only role=member (naqib excluded) — naqib isn't tracked as a member; cost if wrong: naqib's own amalan not shown on roster.
Task 8: implementer DONE (9be9d52) — 145/145; review dispatched
Task 8: review — spec ✅, quality Approved (opus); 7 minors
Ruling R19: reviewer Minor 3 promoted to Important — it is plan Review Focus #2. (a) periodScore: TODAY's harian items count in expected only if already met (in-progress day, same rule as R6 in-progress periods); dailyScore (live ring) unchanged. (b) a member with expected = 0 over last4w gets status {percentage:0, level:null, label:'Baru'}, no level_c alert, and is excluded from avg4w/avgThisWeek means. Spec §8 updated. — otherwise every new member (and every member each morning) shows Level C; cost if wrong: today's unmet items don't drag scores until the day ends.
Task 8: minor (deferred): no test that a member's other-usrah logs are ignored; R4 test doesn't assert loggedToday/avg4w after removal
Task 8: minor (deferred): prayerPct can exceed 100 with multiple prayers amalan; dead lastLogDate computation in memberMetrics; .default(def as any) typing; /members/:id loads whole roster
Task 8: fix round 1/5 dispatched (fix base 5053fa8; resumed implementer ab15b7c222f8d9c2f with R19)
Task 8: fix round 1/5 (1 addressed, 0 open — R19 in-progress today + 'Baru' status; drop alert also needs thisWeek expected > 0; commits 5053fa8..d5b1a02)
Task 8: minor (deferred): prayerAvg4w still includes Baru members as 0
Task 8: complete (commits 76f359f..d5b1a02, 1 fix round)
Task 9: dispatched (base cb1c720, implementer agent aa366921d482ce0a8, sonnet)
Ruling R20: guidance reply notifications — member reply → all active naqibs; naqib reply → recipient (or all active members for usrah-wide); never the reply author; naqib's own items count as read — plan said only 'notifies the other party'; cost if wrong: extra/missing notifications.
Task 9: implementer DONE (18385d3) — 158/158; review dispatched
Task 9: review — spec ✅, quality Approved (opus)
Ruling R21: replies on a usrah-wide guidance item are visible to every member of the usrah (group thread); personal items stay private to member + naqib — matches "replies belong to the visible item"; cost if wrong: members see each other's replies on group notes (UI can label it "Perbincangan usrah").
Task 9: minor (deferred): no test for in-usrah member /read on another's personal item; naqib reply to a removed recipient still notifies them; GET /guidance unbounded; visibleItem `as any`; 50-notification limit untested; co-naqibs not notified of usrah-wide items/replies
Task 9: complete (commits cb1c720..18385d3, review clean)
Task 10: dispatched (base 50f201a, implementer agent a14f241717949eca6, opus; carries R3, R22; demo view files copied unchanged, placeholders routed)
Ruling R22: web views render via innerHTML template strings — every API-sourced string (names, notes, guidance, amalan names, usrah names, notifications) MUST pass through a shared escapeHtml() from web/js/util.js; attribute values too. Applies to Tasks 10–13. — stored XSS between members otherwise; cost: none.
Task 10: implementer DONE (d91aaae verbatim demo copy — verified byte-identical by controller; 4dbc7f0 /auth/me usrah.naqibName; 96287bf web foundation; 480b7d3 API_URL proxy override) — 220/220, build OK
Ruling R23: default API PORT changes 3001 → 3101 (and Vite proxy default target to match; API_URL override stays) — port 3001 is taken on the user's machine by Uptime Kuma, so `npm run dev` would fail there; spec §3/global constraint updated in Task 14; cost: none functional.
Ruling R24: Task 14's E2E smoke also runs once against the production build served by Fastify (npm run build + start) so the CSP/static serving is exercised — CSP untested in prod so far; cost: a slower e2e run.
Task 10: review dispatched (diff d91aaae..HEAD — copy commit excluded as verified verbatim)
Task 10: review — spec ✅, quality Approved (opus); R22 escaping verified in all files
Ruling R25: admin reset-password UI (spec §5.5) is owned by Task 13 — admin list gains `naqibId` (server) and the admin view gets "Set semula kata laluan naqib" per usrah (+ api.js `adminResetPassword(id)`); cost: none.
Ruling R26: Task 11 also hardens the router (Task 10 minors 1, 3, 5): own-property route lookup (#constructor etc.), clearSession() on 403 PASSWORD_CHANGE_REQUIRED, render/init exceptions shown in the "Cuba lagi" error card — Task 11 is the first real view on the router; cost: slightly larger Task 11.
Task 10: minor (deferred): shownHash can drift during back-nav while /auth/me pending; bell dropdown closes on header re-render; test gaps (logout clears session, login setSession, escaping of notification text / naqib name, removed naqib in /auth/me)
Task 10: complete (commits 50f201a..480b7d3, review clean)
Task 11: dispatched (base cbb189e, implementer agent a76b006cb9c4204b8, opus; carries R22, R26)
Task 11: implementer DONE (80951be) — 255/255, build clean; deviations: load range to = min(today, max(week Sunday, month end)); router contract gains init-returned leave hook (awaited before next navigation); save queue split to web/js/views/hariIni/saveQueue.js
Task 11: review dispatched (diff 2550dd3..80951be)
Task 11: review — spec ✅ (deviations accepted: load range, saveQueue split, leave-hook contract), quality Needs fixes — Important: (1) logout bypasses leave hook → pending edits lost + spurious toast; (2) hung save blocks navigation forever (no timeout)
Task 11: minor (deferred): edits made during leave flush dropped; LOG_LOCKED leaves optimistic values on screen; permanent 4xx (VALIDATION_ERROR) re-queued forever (queue poisoned); pill "Disimpan" while newer edits pending; test gaps (in-flight edit, date-strip leave flush via real router)
Task 11: fix round 1/5 dispatched (fix base 3da4cf7; resumed implementer a76b006cb9c4204b8)
Task 11: fix round 1/5 (2 addressed, 0 open — logout flushes leave hook first; LEAVE_HOOK_TIMEOUT_MS 5000 race; commits 3da4cf7..b93789d)
Task 11: complete (commits cbb189e..b93789d, 1 fix round)
Task 12: dispatched (base 2e570a7, implementer agent af011ee04bb4142ac, sonnet; carries R21, R22)
Ruling R27: Task 12 — naqib's Bimbingan view hosts the 'Hantar bimbingan' form (to whole usrah or one member from the summary roster) in addition to Profil Ahli's — plan only put sending in Profil Ahli, but usrah-wide guidance (toUserId null) otherwise has no UI; cost: one extra form.
Task 12: implementer DONE (5a16603) — 281/281, build clean; added naqib Bimbingan nav entry; removed demo inline editing/static avatar/fake card; review dispatched
Task 12: review — spec ✅, quality Approved (opus); R22 verified both views
Task 12: minor (deferred): module-level openIds/filter survive logout/login (no data leak; open-unread item not marked read until re-opened; failed mark-read leaves id open); Tetapan filter/toggle refetches; bimbingan tests order-dependent + dead no-op line; prayers targetVal unconstrained client-side; fragile icon selector
Task 12: complete (commits 294af81..5a16603, review clean)
Task 13: dispatched (base c60cc4a, implementer agent ab17c54eb8c118cf5, opus; carries R19, R22, R25)
Task 13: implementer DONE (f2741dc, 3280f26) — 329/329, build clean, grep clean; concerns: Ringkasan group 8-week trend + per-amalan ranking dropped (no API), Profil Ahli extra getMatrix call, weekly series 0% before join, remove-member uses window.prompt
Ruling R28: dropping the demo's Ringkasan group-trend chart and per-amalan ranking is accepted for v1 — no endpoint provides them and the plan didn't ask for one; listed as a follow-up in the final report; cost: Ringkasan is less rich than the demo.
Task 13: review dispatched (diff f5563a2..HEAD)
Task 13: review — spec ❌ (R19 Baru missing in Matriks: red 0% + included in Level C filter, test locks it in), quality Needs fixes (opus); no XSS, temp-password handling and confirmations verified
Ruling R29: reviewer Minor 2 (Baru members shown as "0%" in Profil Ahli KPI/donut/switcher and Analitik header) is folded into the R19 fix — R19 names the profile explicitly; show "—" instead. Minor 1 (pre-join weeks as 0%) stays deferred. — cost: none.
Task 13: minor (deferred): pre-join weeks render as 0% in Profil Ahli/Analitik charts; admin hostile-string test vacuous; temp-password modal lacks initial focus; Matriks state module-level
Task 13: fix round 1/5 dispatched (fix base b4826db; resumed implementer ab17c54eb8c118cf5)
Task 13: fix round 1/5 (2 addressed, 0 open — Baru neutral in Matriks/Profil Ahli/Analitik; commits b4826db..f664a3b)
Task 13: minor (deferred): Profil Ahli "Skor Minggu Ini" shows 0% for new member; Baru signalled by empty cells (matrix) vs level null (status) — separate signals
Task 13: complete (commits c60cc4a..f664a3b, 1 fix round)
Task 14: dispatched (base af28171, implementer agent ad1f9af53fb95dc7a, sonnet; carries R9, R23, R24; Playwright chromium user-level install allowed, no sudo)
Task 14: implementer DONE (fbe176c, 8166549) — unit 332/332, e2e dev ✅, e2e prod ✅ (0 CSP violations, Secure cookie OK on localhost); no app bugs found
Task 14: env note — Chromium on this machine needs libasound.so.2; implementer used `apt-get download libasound2t64` extracted into the session scratchpad + LD_LIBRARY_PATH (no sudo, nothing in repo depends on it). User should run `npx playwright install-deps` (needs sudo) or `sudo apt install libasound2t64` to run e2e normally.
Task 14: review dispatched (diff d4dc7fd..HEAD)
Task 14: review — spec ✅, quality Approved
Task 14: minor (deferred): backup.ts untested (klStamp, retention); CSP check matches only "Content Security Policy" console text; spec §3 env list stale (SESSION_SECRET listed; TRUST_PROXY/HOST/NODE_ENV missing); e2e stepper target regex fallback
Task 14: complete (commits d4dc7fd..8166549, review clean)
ALL TASKS COMPLETE — final whole-branch review next
Final review: dispatched (opus, agent a086abede7c733cbb; range cee0f3b..HEAD, trimmed diff review-final.diff; triaging 37 deferred minors)
Final review: With fixes (opus). 332/332 in clean worktree, build OK, migrations match schema, demo untouched. Important: I-1 TRUST_PROXY=true → XFF spoofing bypasses login rate limit (verified); I-2 re-activating amalan rewrites past scores (plan defect vs spec §8); I-3 Hari Ini drops unsaved edits on failed/timed-out leave flush + edits during flush; I-4 resumed tab next day writes to yesterday; I-5 prod path needs devDependencies (tsx, vite) + silent 403 if APP_ORIGIN unset. Minors M-1..M-6. Disagrees with R9.
Ruling R30 (replaces R9): TRUST_PROXY accepts a hop count ("1","2") or comma-separated IPs/CIDRs; "true" is treated as 1 hop with a startup warning; plus an IP-independent per-email login limit (20 per hour). — R9 as built allowed unlimited password guessing behind a proxy.
Ruling R31: re-activating a deactivated amalan creates a NEW amalan row (same fields incl. the same code, createdOn = today) and leaves the old row deactivated, so past scores never change (spec §8). Tetapan's inactive list hides an old row when an active row with the same code exists. — plan Task 7 line contradicted spec; cost: two rows per re-activated item.
Ruling R32: Hari Ini never silently discards edits — inputs disabled during the leave flush; on failed/timed-out flush the pending edits are persisted to localStorage (key per user+date) and replayed on the next load of that date (with toast "Perubahan belum disimpan dipulihkan"); unload flush uses fetch keepalive; a non-retryable 4xx (400/403) drops the offending keys with a toast instead of re-queuing forever. — core logging must not lose data on flaky phones; localStorage is device-local and only a buffer.
Ruling R33: Hari Ini on visibilitychange(visible)/pageshow: if todayKL() ≠ loaded today and no explicit ?tarikh, flush then re-route to today. — prevents misdated logs on resumed tabs.
Ruling R34: tsx moves to dependencies; README states the build needs devDependencies; server logs a startup warning when NODE_ENV=production and APP_ORIGIN is unset or not https. — prevents broken prod install and silent 403s.
Ruling R35: fold cheap minors into the fix wave — M-1 logout network failure → toast "Gagal log keluar — cuba lagi" and stay; M-2 prayers targetVal capped 1–5 (server + client); M-3 `freq` locked once logs exist (409 like inputType); M-4 loggedToday counts only rows with ≥1 truthy value; M-5 e2e .js import extensions; spec §3 env list synced (TRUST_PROXY, HOST, NODE_ENV; drop SESSION_SECRET). All other deferred minors → documented follow-ups.
Final fix wave: dispatched (fix base a4e3ab4, implementer agent a6cfc43f74a71bde2, opus; brief final-fix-brief.md)
Final fix wave: implementer DONE_WITH_CONCERNS (d3a1dbb, 0f671f1, 99c0f0d, 077f9a6, a6648e3, b30997a) — 380/380 unit, tsc clean, build OK, e2e 2/2; hop count implemented as trust fn (i < n) because Fastify ignores XFF for numeric trustProxy; per-email 20/h counts any attempt (lockout DoS risk); scoped re-review dispatched
Final fix wave: scoped re-review — all findings ADDRESSED (I-1..I-5, M-1..M-5, spec §3), no new Critical/Important (opus; I-1 XFF semantics verified by probe)
Final: parked — per-email login limit (20/h, any attempt) allows targeted account lockout by someone who knows the email — Ruling: accepted trade-off of R30; follow-up: skip counting successful logins / add CAPTCHA or progressive delay.
Final: parked — per-email limiter silently disables if the rate-limit decorator isn't visible in scope — Ruling: works today (tested); follow-up: throw at startup when rateLimit on and decorator missing.
Final: parked — re-activated amalan: matrix/per-category cells show only the new row's history; mid-period re-activation restarts weekly/monthly progress; code-less rows can be double re-activated; POST /amalan with explicit code lacks uniqueness check among active rows — Ruling: consequences of R31, group/period scores correct; follow-ups.
Final: parked — I-3 stale-replay edge (timeout → late failure → newer edits) and pending keys for never-revisited dates linger in localStorage; offline tab-close still loses edits — Ruling: rare, visible via toast; follow-ups (sequence check, cleanup sweep).
Final: parked — I-4 gap when device clock runs behind KL — Ruling: wrong-device-clock only; follow-up.
Final verification by controller: vitest 26 files 380/380, tsc clean, build OK, demo diff empty.
BUILD COMPLETE (commits cee0f3b..HEAD on branch live-version). All other `minor (deferred)` lines above are documented follow-ups (triaged FOLLOW-UP by final review).
