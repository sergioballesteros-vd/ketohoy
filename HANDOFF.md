# Handoff — KetoHoy v1 hardening (complete)

All 6 phases of the original v1 hardening plan are done — see `STATUS.md`
for the detailed breakdown of what changed in each phase. This file now
covers what's genuinely left if the app's scope grows.

## If this app goes multi-user or multi-instance

- `src/lib/rateLimit.ts` is an in-memory, single-process limiter — swap for
  a shared store (Redis, etc.) if deployed across more than one instance.
- Favorites are `localStorage`-only (device-local) — would need a backend
  `Product.isFavorite`-style field + migration for cross-device sync.
- The `mercadona` CLI dependency (`src/lib/mercadona.ts`) is still an
  unpublished external binary, not an npm package — worth checking again
  whether it's since been published, to make install reproducible.

## If this app gets real traffic

- Add Sentry or similar — skipped deliberately while single-user.
- Revisit the remaining `npm audit` findings (all currently inside Prisma
  CLI's transitive deps, not exercised at runtime by this SQLite-only app —
  see `STATUS.md` Phase 3 for detail).

## Architecture debt not addressed

- No broader "any usage" or monolithic-file audit was done — the original
  ask flagged this as optional/lower-priority and it wasn't revisited.
- `src/app/api/*/route.ts` handlers still inline their Zod schemas per file;
  fine at the current 24-endpoint scale, would be worth extracting to
  `src/lib/schemas/` if the API surface grows significantly.
