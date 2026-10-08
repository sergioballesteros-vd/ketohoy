# Weekly Plan — before / after

## Before evidence

Captured on 2026-10-06 from a fresh 28-slot plan using a disposable local database. See [`before/`](before/).

At 390 px, the initial viewport contains the week heading, regenerate, bright full-width weekly shopping CTA, seven-day strip, four meal rows and the next day heading. Each slot repeats an image/placeholder, title, meal type, prep time, availability and two icon actions. At 320 px the sequence remains one column without horizontal document overflow, but the seven-day controls and action icons are crowded.

## After evidence

Captured from the isolated `?redesign=1` route on 2026-10-06. See [`after/`](after/). The 390 px first viewport now shows Today, all four current-day meals, and the next day heading. Meal rows show meal type, title, time and availability; the repeated image/placeholder and always-visible action icons are gone. The shopping action remains in the header with a quieter treatment. The full page still contains 28 slots. A measured sticky-header offset keeps Today’s heading visible when the plan message changes its height.

At 320 px the 44 px day targets wrap into a 4+3 grid, so all seven dates remain visible without horizontal document overflow. At 768 and 1280 px the schedule stays a centered one-column sequence. Separate captures show Today active, another day active, the open action disclosure, mixed availability, incomplete plan, purchase success and desktop layout. These states were created with disposable test data; no production data was used.

## Heuristics

| Check | Before | After |
|---|---|---|
| Density | Four current-day slots fit at 390 px; repeated 56 px image/placeholder and two actions per slot | Four slots and the next day heading remain in the first viewport; less repeated row chrome |
| Orientation | Week strip is sticky; mobile opens on Today; full-week review is a long scroll | Today opens in view; the selected day follows navigation/scroll in the stacked experiment |
| Today | Today is text-labeled on the day section and semantically `aria-current`; selected today shares lime fill | “Hoy” appears on its date, section and context line; `aria-current=date` stays distinct from `aria-pressed` |
| Active day | `aria-pressed`; selected button follows navigation/visible day; shares lime fill when same as Today | Separate “Día activo” label; keyboard, click, scroll and reduced-motion paths use existing navigation behavior |
| Scanability | Labels/title/time/availability visible, but every row repeats controls | Meal type, title, prep time and availability stay visible; actions expand on demand |
| Slot hierarchy | Title and type clear; placeholder/photo competes with status and controls | Title and availability take priority; no repeated image/placeholder |
| Weekly overview | Seven date controls, no compact per-day completeness summary | All 28 slots remain in page order; incomplete plans show per-day planned counts |
| CTA visibility | Bright full-width CTA dominates the header above meals | Same purchase action remains visible with a muted treatment |
| Mobile scroll | 28 rows produce a long page; no overflow observed | Still a long 28-slot review page; no horizontal document overflow at 320/390/768/1280 |

## Validation

- `npm run build`, `npx tsc --noEmit`, `git diff --check`: pass.
- `npm test -- --maxWorkers=4`: 314 tests pass.
- Full Playwright E2E: 112 passed, 1 skipped; includes the experiment at 320/390/768/1280, four availability summaries, slot swap, incomplete purchase guard and purchase aggregation.
- ESLint passes on the changed implementation and experiment spec. Repo-wide ESLint still reports three existing `no-require-imports` errors in `audit-assets/api-probes.cjs:2–4`.
- All browser testing and generated fixtures used disposable local SQLite databases.

Reduced-motion behavior was exercised by Playwright and respects the existing contract; this browser-only experiment does not claim physical-device or assistive-technology validation. Source limitations are noted in [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md).
