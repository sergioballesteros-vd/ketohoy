# Handoff — KetoHoy v1 hardening

Read `STATUS.md` first for what's already done and verified. This file is
the continuation plan for Priorities 2–6 of the original v1 ask.

## Working model (Sonnet leads, Codex implements)

Pattern validated on `ai-interviewer`
(`~/ai_native_projects_v3_2_0/ai-interviewer/STATUS.md`, "How work gets done
here — the Codex-offload pattern"):

1. Sonnet writes an exact, self-contained spec: files to touch, contract to
   satisfy, what NOT to touch, the verify command.
2. Run `codex exec -s workspace-write -C /Users/sergioballesteros/ketohoy --skip-git-repo-check "<spec>"`
   via Bash with `run_in_background: true` (can take minutes).
3. Codex's sandbox has no network — install any new npm deps yourself
   *before* running it, and tell it not to run install commands.
4. Review with `git status --short` + `git diff --stat` + targeted `Read` of
   files with real logic. **Re-run lint/typecheck/test/build yourself** —
   never trust Codex's self-report.
5. Fix small issues directly rather than a re-prompt round-trip.
6. Commit noting `(via codex)` + any manual fix.

Phase 1 (this session) was done directly by Sonnet, not delegated — the
bugs required deep root-cause investigation (reading scoring logic, DB
queries, reproducing hydration errors in prod vs dev) that's cheaper to do
inline than to spec out. The remaining work below is mostly mechanical/
well-scoped and is a good fit for the Codex-offload pattern.

## Priority 2 — API robustness (not started)

24 endpoints under `src/app/api/`, ~2 have any test coverage. Plan:
- Add a small shared error-response helper (e.g. `src/lib/apiError.ts`) —
  one place that maps thrown errors to `{error, status}` JSON, used by all
  routes instead of ad-hoc try/catch. Don't build a full middleware/
  framework layer for this — a single `withErrorHandling(handler)` wrapper
  or a `try { } catch (e) { return apiError(e) }` one-liner per route is
  enough; this app doesn't need more.
- Add Zod (already likely worth adding — check if it's already a dep)
  input validation at minimum for POST/PATCH bodies on `pantry`,
  `shopping-list`, `preferences`, `weekly-plan/generate`.
- Test the 5–6 highest-risk endpoints first: `weekly-plan/generate` (just
  fixed — needs an integration test with a seeded DB, not just the pure
  `extendedPool` unit test), `pantry` CRUD, `shopping-list` CRUD,
  `recipes/suggestions`.

## Priority 3 — dependencies & environment (not started)

- `src/lib/mercadona.ts:166-193` calls an external `mercadona` CLI via
  `execFile`, not declared as an npm dependency, not documented, silently
  falls back to `searchDemoMercadonaProducts` if missing. Minimum fix:
  document the exact install steps in README, and make the fallback loud
  (log a clear warning, maybe surface a banner in dev) instead of silent.
  Full fix (optional): check if it's a public npm package that could be a
  real `dependency` instead of a global binary.
- Create `.env.example` with `DATABASE_URL` and `UNSPLASH_ACCESS_KEY`
  (found via grep — check `src/lib/db.ts` and `src/lib/unsplash.ts` for any
  others).
- Fix README: `npm run prisma:seed` doesn't exist, real command is
  `npx prisma db seed`.
- `npm audit`: 20 vulns (1 critical, 11 high per Phase 0 diagnosis) — run
  `npm audit fix` for the ones with a fix, manually assess the rest.
- Clean up `output/playwright/`, `docs/superpowers/` residual empty dirs.

## Priority 4 — security/production (not started)

- No rate limiting anywhere — lowest priority for a single-user app, but
  worth a cheap IP-based limiter on `/api/mercadona/*` (external API calls)
  if this ever goes multi-user.
- No logging/monitoring — at minimum, structure the `console.error` calls
  (4 in `ExploreClient.tsx`) so they're greppable, and consider Sentry only
  if/when this gets real users — don't over-build for a single-user app.

## Priority 5 — data & deploy (CRITICAL, not started)

This is the highest-risk item in the whole list — real data loss risk.
- `.github/workflows/deploy.yml` currently runs
  `npx prisma db push --accept-data-loss` against production SQLite on
  every push to `main`. Replace with `prisma migrate deploy` — this
  requires actually generating migration files (`prisma migrate dev`
  locally first) since the project has apparently been using `db push`
  only. Check `prisma/migrations/` — if empty/stale, this is a real gap.
- Add an automated SQLite backup step before any deploy migration runs
  (simple `cp dev.db backups/dev-$(date +%s).db` + prune old ones, or
  proper `sqlite3 .backup`). Test the restore path once, document it.
- Health check exists per Phase 0 notes (`.github/workflows/deploy.yml`
  has an HTTP health check) — verify it actually gates rollback, not just
  logs.

## Priority 6 — testing/CI (not started)

- No CI gate before deploy currently — deploy workflow deploys straight
  away. Add a separate CI workflow (or a pre-deploy job) running
  lint + typecheck + test + build, and only deploy on success.
- Playwright E2E: none exist yet. Add a minimal smoke suite covering the
  flows verified manually in Phase 1 (generate weekly plan → assert
  variety; explore → favorite → reload → still favorited; no console
  errors on each of the 7 pages).

## Known issue not fixed (accepted risk)

**Turbopack dev-mode panic on `/meals`** — see `STATUS.md` item 6. Confirmed
production-safe (doesn't reproduce in `next build`/`next start`), only a
dev-workflow annoyance. If it recurs: `rm -rf .next` and restart. Not worth
chasing further without a Next.js support channel — this is a non-standard
Next build per `AGENTS.md`.

**Home hydration error root cause** — see `STATUS.md` item 4. Fixed via
`force-dynamic`, but the underlying mechanism (why a static/ISR home page
hydrated with mismatched text in this specific Next build) wasn't isolated
to a single line of framework behavior. If it resurfaces on other pages,
the same `force-dynamic` fix likely applies — check pages relying on
`new Date()` or similar non-deterministic-at-build-time values without it.

## Deliberate exclusions (Phase 1)

- Favorites persistence is `localStorage`-only (device-local), not a
  backend `Product.isFavorite` field + migration. Chosen because: (a) it's
  a real, verified improvement over the previous "lost on reload" state,
  (b) a full backend feature (schema change + migration + endpoint + tests)
  is disproportionate for a single-user app with no cross-device sync
  requirement stated anywhere. Revisit if multi-device use becomes a real
  requirement.
- Did not rename the `category` data model values (`meat`, `dairy`, etc.)
  to Spanish — only added a display-label map. Renaming the stored values
  would touch `mercadona.ts`, `ketoRules.ts`, seed data and any existing
  DB rows; not worth the migration risk for a cosmetic fix.

## How to continue

Next session: pick Priority 5 (data/deploy) first — it's the one with real
data-loss risk in production right now. Spec it as a Codex work package per
the pattern above, or do it directly if it needs the same kind of
investigation-heavy judgment calls as Phase 1 did.
