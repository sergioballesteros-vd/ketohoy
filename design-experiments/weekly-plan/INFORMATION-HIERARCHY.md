# Weekly Plan — information hierarchy

| Level | Information | Priority | Default treatment |
|---|---|---:|---|
| Global | Week range and current day | P0 | Compact sticky heading; Today is named in text |
| Global | Active/viewed day | P0 | Selected day control plus “Día activo” on its section |
| Global | Plan completeness (recipes / 28) | P0 | Only call out when incomplete; never imply a complete plan |
| Global | Weekly shopping action | P1 | Always available, quiet header button; existing flow/feedback |
| Global | Regenerate plan | P1 | Header utility; existing confirmation and error recovery |
| Day | Day/date and whether it is Today | P0 | Heading; “Hoy” is distinct from “Día activo” |
| Day | Planned meal count and any empty slots | P0 | Incomplete days show count; empty slots say “Sin receta” |
| Day | Day navigation and selected location | P0 | Seven date controls; 44 px minimum hit area, keyboard support |
| Slot | Meal type | P0 | Always-visible Spanish text label |
| Slot | Recipe title/link | P0 | Always visible and opens recipe detail |
| Slot | Relevant availability summary | P0 | Existing domain labels preserve sufficient / insufficient / unknown / missing |
| Slot | Prep time | P1 | Secondary text while it fits; may wrap naturally at 320 px |
| Slot | Swap recipe | P1 | Available in a per-slot actions disclosure, never gesture-only |
| Slot | Add missing ingredients | P1 | In actions disclosure when availability requires review |
| Slot | Recipe thumbnail | P2 | Omitted in schedule; recipe detail is the image surface |
| Slot | Extra recipe metadata/macros | P2 | Not in the schedule row; do not imply unsupported nutrition |
| Any | Raw IDs, implementation state, duplicate status copy | P3 | Not shown |

Ordering remains one column at every breakpoint because the seven-day sequence matters. The view may widen but should not become a dashboard grid.
