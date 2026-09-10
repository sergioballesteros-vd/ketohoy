# Project Status — KetoHoy

Status: **Phases 1–6 of 6 complete** — the full v1 hardening plan from
`HANDOFF.md` is done: core product bugs (Phase 1), API robustness (2),
dependency/env hygiene (3), security/production basics (4), data/deploy
safety (5), and CI/testing (6).

Stack: Next.js 16.3.4 (Turbopack) + React 19 + TypeScript + Tailwind v4 +
Prisma 7 / SQLite (better-sqlite3 adapter) + Vitest + Playwright. Single-user,
deployed via SSH/rsync + PM2 to a VPS (OVH).

## Phase 1 — done and verified (see prior session)

Weekly Plan generator fix, Explore hydration errors, favorites persistence,
Home hydration fix, copy/i18n cleanup. Full detail preserved in git history
of this file.

## Phase 2 — API robustness

- `src/lib/apiError.ts`: `ApiError` class + `withErrorHandling(handler)`
  wrapper mapping any thrown error to `{ error, status }` JSON. Applied to
  all 24 route handlers across `src/app/api/`.
- Zod input validation on every POST/PATCH/DELETE body (pantry, shopping-list,
  preferences, products, mercadona/add).
- Integration tests (14 new, hitting route handlers directly against a
  temp-copied seeded SQLite DB — see `src/lib/__tests__/testDb.ts`) for the
  highest-risk endpoints: pantry CRUD, shopping-list CRUD, weekly-plan/generate,
  recipes/suggestions.

## Phase 3 — dependencies & environment

- `.env.example` added (`DATABASE_URL`, `UNSPLASH_ACCESS_KEY`).
- `mercadona` CLI fallback now logs a clear `console.warn` instead of failing
  silently; README documents it's optional and not an npm dependency.
- README fixed: `npx prisma migrate dev` + `npx prisma db seed` (real
  commands, not the nonexistent `npm run prisma:seed`).
- `next` bumped 16.2.9 → 16.3.4 (fixes the RCE/critical advisories from
  `npm audit`). Remaining ~16 vulns are all inside Prisma CLI's own
  transitive deps (js-yaml, hono, mysql2, fast-uri — used by multi-db
  support this SQLite-only app never exercises); fixing them requires a
  `prisma@6.x` downgrade, not worth the breaking-change risk.
- Removed residual empty dirs (`output/playwright/`, `docs/superpowers/`)
  and a stale, out-of-date `prisma/dev.db` copy (the real DB lives at
  repo-root `dev.db`, gitignored either way).

## Phase 4 — security/production

- `src/lib/rateLimit.ts`: cheap in-memory fixed-window limiter (30 req/min
  per IP), applied to all 4 `/api/mercadona/*` routes (the ones calling
  external services). Documented as single-process-only — fine for this
  single-user app, upgrade to a shared store if it ever goes multi-instance.
- The 4 `console.error` calls in `ExploreClient.tsx` now carry a
  `[ExploreClient]` + context prefix so they're greppable in prod logs.
- Sentry/full monitoring intentionally skipped — no real users yet, per the
  original ask.

## Phase 5 — data & deploy safety (was the critical item)

- `.github/workflows/deploy.yml`: `prisma db push --accept-data-loss` →
  `prisma migrate deploy` (real migrations were already present under
  `prisma/migrations/`, just never used in the deploy path).
- Added an automated SQLite backup step (`sqlite3 dev.db .backup`, WAL-safe)
  before every migration run, keeping the last 10 backups on the VPS.
- Deploy now only runs after CI passes (see Phase 6) via `workflow_run`,
  gated on `conclusion == 'success'`.

## Phase 6 — CI/testing

- `.github/workflows/ci.yml`: lint → typecheck → unit tests → build → E2E
  smoke suite, on every push and PR.
- `.github/workflows/deploy.yml` now triggers on CI's `workflow_run`
  completion instead of a raw push, so a broken build/test/lint never
  reaches production.
- Playwright added (`e2e/smoke.spec.ts`, `playwright.config.ts`,
  `npm run test:e2e`): no-console-errors check on all 7 pages, weekly-plan
  generation produces a full 7-day/4-meal-type plan, Explore favorite
  persists across reload.

## Test counts

- `npm test` (Vitest): **57 passing** (43 unit + 14 new API integration).
- `npm run test:e2e` (Playwright): **9 passing**.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: all clean.

## Known issues not fixed (accepted risk, unchanged from Phase 1)

- Turbopack dev-mode panic on `/meals` — dev-workflow only, confirmed
  production-safe. `rm -rf .next` if it recurs.
- Home hydration error root cause not fully isolated, but the
  `force-dynamic` fix holds; same fix likely applies if it resurfaces
  elsewhere.

## Deliberate exclusions (unchanged from Phase 1)

- Favorites stay `localStorage`-only (device-local), not a backend field —
  disproportionate for a single-user app with no cross-device requirement.
- `category` data model values stay in English (display-label map added
  instead) — renaming would touch multiple modules and existing DB rows for
  a cosmetic fix.

See `HANDOFF.md` for what's next if this app grows beyond single-user.
