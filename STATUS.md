# Project Status — KetoHoy

Status: **Phase 1 of 6 complete** (core product bugs fixed and verified E2E).
Priorities 2–6 from the v1 hardening plan (API robustness, dependency/env
hygiene, security, data/deploy safety, CI) are **not started yet** — see
`HANDOFF.md` for the exact plan and how to continue.

Stack: Next.js 16.2.9 (Turbopack, canary-ish — see `AGENTS.md`) + React 19 +
TypeScript + Tailwind v4 + Prisma 7 / SQLite (better-sqlite3 adapter) +
Vitest. Single-user, deployed via SSH/rsync + PM2 to a VPS (OVH).

## What was verified before touching anything

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 35 passing (baseline), all in `src/lib/__tests__`, zero API/UI
  test coverage.
- `npm run build` — succeeds (production build, no panic).
- Working tree: only `.gitignore`/`.ignore` uncommitted (graft tool cache
  config, harmless).
- Full manual Playwright E2E across Home/Explore/Meals/Inventory/
  Shopping List/Weekly Plan — see prior conversation turn for the raw
  findings; summarized as Phase 1 bugs below.

## Phase 1 — done and verified

1. **Weekly Plan generator was broken** (`src/app/api/weekly-plan/generate/route.ts`).
   Root cause: `minAvailability: hasPantryItems ? 0.4 : 0` hard-filtered
   recipes by pantry match before ranking. With only 5 pantry items, this
   zeroed out ALL 20 "lunch" recipes (→ "Comida: Sin asignar" every day) and
   left only 1–2 recipes per other meal type (→ same 3 recipes all week).
   Fix: pantry match now only *ranks* (via `scoreRecipe`'s score), never
   excludes; `extendedPool` (moved to testable `src/lib/weeklyPlanPool.ts`)
   now does a full non-repeating pass through the ranked pool before
   repeating, and never repeats the immediately preceding day.
   Verified live: generated a plan with 7 distinct days, all 4 meal types
   filled, zero consecutive repeats. 5 deterministic regression tests added.

2. **Nested `<button>` in Explore** (`src/app/explore/ExploreClient.tsx`)
   caused 2 React DOM-nesting console errors on every product card
   (favorite heart + qty +/- buttons inside a card `<button>`). Fixed by
   making the card a `<div role="button" tabIndex={0}>` with keyboard
   support; inner buttons now stop propagation cleanly. Verified: 0 console
   errors on `/explore` in production build.

3. **Favorites didn't persist** — now persisted to `localStorage`
   (`ketohoy:favoriteProductIds`), verified surviving a reload. This is
   explicitly device-local, not a backend feature — see "Deliberate
   exclusions" in `HANDOFF.md`.

4. **Production hydration error on Home** (`React error #418`, reproducible
   2/2 times on a clean `main` checkout via `next start`, NOT reproducible
   in `next dev`). Root cause not fully diagnosed (minified in prod, and
   this Next build is non-standard per `AGENTS.md`), but adding
   `export const dynamic = 'force-dynamic'` to `src/app/page.tsx` (correct
   anyway — pantry/shopping stats and the hour-based greeting should never
   be served from a stale static/ISR shell) eliminated it: 0/2 repro after
   the fix vs 2/2 before, on identical build+start cycles.

5. **Copy/i18n cleanup**:
   - Plural agreement fixed (`src/lib/pluralize.ts`, with tests):
     "1 productos pendientes" → "1 producto pendiente".
   - Despensa categories now shown in Spanish (`CATEGORY_LABEL` map in
     `src/app/inventory/page.tsx`) — the underlying `category` data value
     stays in English since it's a shared key with `mercadona.ts`/
     `ketoRules.ts`; only the display label changed.
   - Home's "0 recetas" relabeled "listas ya" — still the same
     `recipesAvailable` stat, but no longer reads as "the app has 0
     recipes" when it actually means "0 you can cook right now with what's
     in your pantry".
   - Bottom nav (`src/components/Navigation.tsx`) now has 6 items —
     added Despensa (`/inventory`) and Plan (`/weekly-plan`), previously
     only reachable from Home cards.

6. **Turbopack dev-mode request storm investigated**: reproduced a genuine
   panic (`Next.js package not found`, in `next-panic-*.log`) specific to
   compiling `/meals/page` under Turbopack HMR with a stale `.next` cache —
   this triggered dev-server crash/reload loops (thousands of requests to
   `/api/recipes/suggestions` in seconds). **Confirmed this does NOT occur
   in `next build`/`next start`** (production is unaffected). `rm -rf .next`
   resolves it for a session. No code fix applied since it's a Turbopack/
   dev-tooling instability, not an app bug — flagged as a known dev-workflow
   risk in `HANDOFF.md`; worth a `.next` cache-bust step in any dev setup
   docs.

## New tests (8 added, 43 total passing)

- `src/lib/__tests__/weeklyPlanPool.test.ts` (5) — variety/no-empty-slot
  regression coverage for the weekly plan bug.
- `src/lib/__tests__/pluralize.test.ts` (3) — regression coverage for the
  plural-agreement bug.

## Not started (Priorities 2–6 of the original ask)

- API error handling/validation audit + tests (24 endpoints, ~2 have tests).
- `mercadona` execFile dependency formalization, `.env.example`, README
  `prisma:seed` fix, npm audit (20 vulns, 1 critical/11 high unreviewed).
- `prisma db push --accept-data-loss` in deploy → real migrations; SQLite
  backup/restore strategy; health check; rollback.
- CI pipeline (lint/typecheck/test/build/E2E gates before deploy).
- Broader architecture pass (monolithic files, `any` usage audit).

See `HANDOFF.md` for the prioritized continuation plan and the Sonnet→Codex
delegation pattern to use for the more mechanical remaining work.
