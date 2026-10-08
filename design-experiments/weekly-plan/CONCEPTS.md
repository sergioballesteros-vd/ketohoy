# Weekly Plan — concepts

The task split is based on the brief, not measured behavior:

- **Quick Today (10 seconds):** identify today's date, the active day, and the four meal names; notice any missing recipe or meaningful availability issue; open a recipe or replace a meal.
- **Weekly Review:** compare all seven days in order, spot incomplete slots, understand where the current view sits, and prepare one aggregated shopping list.

## A — Weekline with focused day

- **Hierarchy:** today/active context → compact week navigation → all seven days as short ordered meal rows → slot actions on demand.
- **Header:** date range and regenerate; weekly purchase stays visible but visually quiet.
- **Week navigation:** seven date buttons in a sticky horizontal strip; current day and selected day use different text and semantics.
- **Today / active:** “Hoy” remains on the natural date; “Día activo” follows selection/visible day.
- **Slot:** meal type, recipe title and domain availability label always visible; prep time secondary; recipe link is the title.
- **Images:** none in schedule rows.
- **Availability:** existing four-state contract rendered with the shared label; never reduce to a boolean.
- **Swap:** per-slot disclosure with a named button to open existing replacement sheet.
- **Purchase:** secondary header action; existing plan-completeness guard and API remain unchanged.
- **Mobile:** one column, sticky day strip, compact rows; week remains one continuous scroll.
- **Desktop:** same sequence in a readable max-width column; no forced grid.
- **Incomplete:** planned count and explicit “Sin receta” slots.
- **Advantages:** fast Today lookup, all 28 slots remain in the page, less repeated chrome, no image dependence.
- **Risks:** a full-week comparison still requires scroll; the day selector and sticky header take vertical space.

## B — Seven-day digest with selected-day expansion

- **Hierarchy:** all seven day summaries first; selected day expands to full meal details.
- **Header:** week range and plan state; purchase action follows the digest.
- **Week navigation:** seven compact day rows/cards; choose a day to expand.
- **Today / active:** Today has a text label; selected day has a separate expanded outline.
- **Slot:** summaries show four recipe names; expanded day shows full time/availability and actions.
- **Images:** none in digest; optional single thumbnail for the expanded day.
- **Availability:** hidden in collapsed summaries except a textual attention count.
- **Swap:** only in expanded day.
- **Purchase:** header action.
- **Mobile:** vertical seven-day digest; expanding one day adds details in place.
- **Desktop:** seven stacked day summaries, no calendar grid.
- **Incomplete:** each day summary shows planned count and missing meal names.
- **Advantages:** week comparison is immediate and the selected day receives detail.
- **Risks:** selection hides full slot details across the other six days; summary copy gets dense; less suitable for the “don’t hide the 28 slots” constraint.

## C — Continuous meal agenda

- **Hierarchy:** meal sequence is the primary timeline; day transitions are stronger dividers; week selector is secondary.
- **Header:** active date and progress context; shopping is at the end of the agenda.
- **Week navigation:** compact sticky selector with previous/next day controls.
- **Today / active:** Today has an explicit badge; active date is repeated in the fixed header.
- **Slot:** timeline rail with meal type, recipe and availability; time sits opposite the title.
- **Images:** none in the timeline.
- **Availability:** persistent text label on each slot.
- **Swap:** disclosure on each slot.
- **Purchase:** end-of-week context block.
- **Mobile:** one vertical schedule with continuous day-to-day scanning.
- **Desktop:** same vertical timeline with wider text measure.
- **Incomplete:** gaps appear as labeled empty timeline stops and a plan count.
- **Advantages:** strong temporal continuity and useful long-form scanning.
- **Risks:** Today may be harder to reach after browsing; weekly shopping moves far from the header; the timeline rail adds decoration to a simple list.

These are structural alternatives, not visual skins. Concept B deliberately trades full-slot visibility for an at-a-glance digest; concept C trades direct date selection and nearby purchase for continuous sequence.
