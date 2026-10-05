# A/B comparison: Flat vs Zones

Both variants render the same rows, ordering, controls, metadata and states. Only the existing catalog-category grouping and section headings change. Zones use known categories and an `Otros` fallback; they do not infer physical aisles.

| Criterion | Flat | Zones |
|---|---|---|
| Scanning | Direct continuous scan; no headings interrupt it | Headings can narrow a scan when the shopper knows the category |
| Orientation | Position/order is the primary cue | Category heading adds a location cue |
| Density | Highest; no section overhead | Slightly lower due to headings and counts |
| Section overhead | None | More visual structure, especially on short lists |
| Stability | Stable order during the session | Stable within the existing category grouping during the session |
| Long list | Less category context; no search is added | More landmarks; whether that helps 39+ items needs user observation |
| Short list | Compact and simple | Can add unnecessary headings |
| Unknown | Same explicit quantity/package unknown states | Same; unknown category degrades into `Otros` |
| Keyboard | Same controls and focus behavior | Same controls and focus behavior |
| Desktop | One contained column preserves list order | Also one contained column; no forced side-by-side scan |

## Heuristic read

Flat reduces competing elements before identifying an item. Zones may improve orientation in a long list but add heading overhead. E2E proves equivalent row data and keyboard behavior, not time-to-identify or human comprehension. **NO WINNER YET.** Capture and observe shoppers with identical lists before choosing.

## Evidence

The 100-item fixture (and 15-, 5-, and 1-item density checks) and grouping equivalence are in `e2e/shopping-list-iteration-2.spec.ts`. Viewport screenshots are stored in `flat/` and `zones/`.
