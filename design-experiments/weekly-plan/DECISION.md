# Weekly Plan — decision

## Winner: A — Weekline with focused day

| Criterion | A: Weekline | B: Digest | C: Agenda |
|---|---|---|---|
| “Qué como hoy” | Strong: initial day + four slots | Medium: select/expand first | Medium: scan/scroll to today |
| Review seven days | Strong: one ordered sequence + selector | Strongest at a glance | Medium: continuous scan |
| 28 slots | Strong: every slot stays visible in document | Weak: details of six days are collapsed | Strong: all slots remain in timeline |
| 320/390 px | Strong: compact rows and horizontal-safe strip | Medium: summaries may wrap heavily | Strong: one column, but more chrome |
| Swap | Strong: contextual disclosure reuses sheet | Strong but hidden behind day expansion | Strong: per-slot disclosure |
| Weekly purchase | Strong: visible in quiet header | Strong: header | Weak: pushed to the end |
| Today vs active | Strong: separate text and ARIA states | Strong: label + expanded state | Medium: fixed active context can drift from Today |
| Accessibility | Strong: native buttons/details, text, one column | Medium: nested disclosure state | Medium: additional timeline semantics |
| Density | Strongest without hiding slots | High visually, but details are hidden | Medium: time rail consumes width |
| Contract fit | Strong: reuses existing day tracking, slots, swap, availability and shopping | Medium: summary risks hiding contract states | Strong: reuses most contracts but alters navigation emphasis |

The decision favors A because it makes Today immediate, preserves access to the full plan without a weekly wall of image cards, and changes only presentation. It also keeps the weekly purchase control near the week context and reuses the existing day-navigation, swap, completeness, availability and reduced-motion behavior.

## Proposed rules

- Keep all seven days and all 28 meal slots represented in the continuous page.
- Remove thumbnails/placeholders from schedule rows; retain recipe imagery only on recipe detail.
- Keep meal type, recipe name and shared availability label visible. Prep time is secondary.
- Use separate “Hoy” and “Día activo” markers, not one shared color state.
- Put swap and add-missing actions behind native per-slot disclosure; preserve button names and existing handlers.
- Keep the aggregate shopping action in the header at reduced visual emphasis; do not add a bottom sticky bar.
- Keep the existing one-column order at 320, 390, 768 and 1280+.

## Compatibility

No API/backend/schema or global navigation change. Preserve KH-003 preference validation, KH-004 incomplete-plan truthfulness, KH-014 freshness, KH-015 four-state availability, KH-017 preference semantics, KH-027 weekly purchase aggregation, KH-037 reduced motion and KH-044 Today/active separation. Shopping List remains frozen.
