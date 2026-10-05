# Full E2E exception

Full Playwright run: **100 passed, 1 failed, 1 skipped**. KH-027 scenarios passed; the one failure is `home-freshness.spec.ts` → “home immediately reflects fish preferences, pantry and shopping writes for two independent users”, before the home interaction begins.

The test searches the seeded recipes for a current-meal fish recipe with `prepTimeMinutes <= 20` **and `imageUrl` present**. Inspection of the final disposable Playwright database found 11 fish recipes distributed across breakfast/lunch/dinner/snack, but every seeded recipe has `imageUrl: null` (71 recipes total, zero with an image). No recipe can satisfy the selector at any time of day; its candidate is `undefined` and the assertion at line 43 fails deterministically before the tested shopping route is exercised.

This is independent of the Shopping List changes and E2E bootstrap fix. The test/seed expectation is outside this experiment's allowed surface, so it was left untouched. The report does not claim the full suite is green.
