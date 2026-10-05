# Shopping List — Iteration 2

This iteration isolates list grouping (flat vs existing catalog zones), keeps purchased rows in place for the current session, clarifies culinary need vs package, and shows catalog item price as secondary information. It does not establish a global visual system.

## Checkpoint

- KH-027 requires 28 valid meal slots. The earlier 422 came from an unseeded disposable E2E database (zero recipes), not a product or KH-027 regression. E2E startup now migrates and seeds only the guarded disposable SQLite file; the same request returns 200 with 28 slots.
- The KH-027 focused E2E passed 6/6 (320, 390, 768, 1280 and interaction coverage).
- A/B uses `?redesign=1&grouping=flat` and `?redesign=1&grouping=zones`; row content and controls are shared.
- The E2E validates comparable content, known/unknown quantities, keyboard purchase/undo and row/scroll stability at 100 items, then checks 15, 5 and 1 items and a 500-item batch purchase.
- Full E2E: 100 passed, 1 failed, 1 skipped. The lone failure is an unrelated home fixture that requires image-backed fish recipes; the seed has no recipe image URLs. See [E2E exception](E2E-EXCEPTIONS.md).

## Evidence limits

These are implementation and heuristic checks, not user comprehension or physical one-handed usability research. No visual decision is promoted to a reusable product pattern on this evidence alone. The list remains the next surface to validate before extending to Weekly Plan.

See [diagnosis](KH027-E2E-DIAGNOSIS.md), [A/B](AB-COMPARISON.md), [purchase stability](PURCHASE-STABILITY.md), [quantity hierarchy](QUANTITY-HIERARCHY.md), [price](PRICE-DECISION.md), and [open questions](OPEN-QUESTIONS.md).
