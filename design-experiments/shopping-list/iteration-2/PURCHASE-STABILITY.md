# Purchased row stability

## Choice

Use option 1: keep a bought row in its original position for the current page session. It gets immediate checked feedback and the semantic `Comprado` label, with an accessible action to return it to the list. The page's stable ID order is initialized from the API, then retained across mutation refreshes. New IDs append; a reload starts from server order.

This matches physical shopping: preserving the shopper's place is more useful than immediately compacting the list. It avoids a timer and avoids hiding purchased items. Flat and Zones share this behavior.

## Verification

The 100-item browser test checks a middle row's viewport top and `scrollY` before and after Enter; both remain within 2 CSS px, then Space undoes under reduced motion. `aria-pressed`, accessible action name and `Comprado` state are asserted. KH-020 purchase/error-recovery suites are also part of the E2E run; the new test does not claim physical-user validation.

The existing adversarial E2E suite covers duplicate actions, mutation recovery and rejection. A separate local stress assertion sends 500 IDs through the batch purchase endpoint and verifies all 500 move to the bought state; it is a backend batch check, not 500 physical taps. Existing API/transaction tests cover rollback and undo invariants. This does not claim first/last/sequential manual taps were separately measured for viewport stability.
