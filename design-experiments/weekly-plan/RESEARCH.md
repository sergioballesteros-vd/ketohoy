# Weekly Plan — research

## Scope

Meal planning for KetoHoy users who either open the plan to answer “¿Qué como hoy?” or review all seven days. The audit focuses on a 28-slot plan, day orientation, recipe replacement, completeness, availability and weekly shopping. This is a targeted pattern review, not user research or a usability study.

## References and evidence

### Samsung Food — Getting Started with Meal Planner

Source: [Samsung Food Help](https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner)

- **OBSERVED:** The help page says the Plan view selects a date and week, lets people add meals to any day, and connects planned meals to shopping.
- **INFERRED:** A stable week context and a separate day/date selection can serve day lookup and week review in one surface.
- **LIMIT:** Help documentation, not an inspected screen. No visual density or interaction timing claims.

### Paprika — Meal planner, Windows and iOS guides

Sources: [Windows guide](https://www.paprikaapp.com/help/windows/), [iOS guide](https://paprikaapp.com/help/ios/)

- **OBSERVED:** Both guides describe day/week/month views; the Windows guide says a segmented control changes views and week arrows change the week. The guides name breakfast, lunch, dinner and snack as meal types.
- **INFERRED:** Meal type should be explicit in each slot, while overview density can change without changing the underlying schedule.
- **LIMIT:** Documentation confirms functions, not how well the screens fit a narrow phone.

### AnyList — Plan Your Meals

Source: [AnyList meal planning](https://www.anylist.com/meal-planning)

- **OBSERVED:** The page describes a calendar for weekly planning, opening a recipe from today, and adding ingredients from a selected date range or directly from tonight’s recipe.
- **INFERRED:** Today’s recipe and the weekly purchase action should remain adjacent in the product model but have different visual priority.
- **LIMIT:** Marketing page, not a visual inspection or evidence of task success.

## Current-screen observations

Captured locally on 2026-10-06 with a disposable local account and database. The plan contained 28 recipes; availability was `missing` because the fixture had no pantry stock.

- **390 px:** The first viewport shows the week title, regeneration, weekly purchase action, seven-day selector, all four meals for the active day and the next day heading. Each row repeats a 56 px image/placeholder, type, title, prep time, availability, add-missing and swap controls.
- **320 px:** The content fits without horizontal document overflow, but the day selector and row actions are crowded; 28 repeated rows create a long page.
- **768/1280 px:** Captures are saved in `before/`; desktop still presents repeated slot rows and is not a week-at-a-glance summary.
- **Today/active:** Today is semantically `aria-current="date"`; the selected day is `aria-pressed`. Today and active share the same lime fill when selected; when different, the day heading still labels Today.
- **Images:** Seed recipes have no images in this fixture, so repeated chef-hat placeholders take space without helping recognition.

See the captured screenshots in [`before/`](before/).

## Synthesis

- **OBSERVED:** The current page already has one-day-at-a-time mobile navigation, day headings, recipe links, swap sheets and an aggregate shopping CTA. Existing code keeps `today` and `active` separate and honors reduced motion.
- **INFERRED:** The best experiment should preserve the useful week strip and in-order weekly scroll, but make rows shorter and distinguish Today from the day being viewed with both text and selected-state semantics.
- **PROPOSED:** Keep one column, retain all 28 slots in the document, remove repeated thumbnails from the schedule, keep meal type/title/availability visible, move prep time to secondary text, and disclose slot actions. Keep shopping available in the header at lower emphasis than the plan itself.

## Questions answered by the concept

1. **Week vs day:** sticky seven-day selector plus all seven day sections in order.
2. **Density:** compact rows without repeated image blocks; no accordion hides the rest of the week.
3. **Navigation:** sticky context plus existing scroll-to-day/visible-day tracking.
4. **Today vs active:** Today uses a visible “Hoy” label and `aria-current`; active uses “Día activo” and `aria-pressed`/selected treatment.
5. **Meal slots:** textual breakfast/lunch/snack/dinner labels remain visible.
6. **Swap:** a named per-slot actions disclosure reveals swap and add-missing actions.
7. **Images:** omitted from the schedule; recipe detail remains the place to see imagery.
8. **Incomplete:** explicit planned count and “Sin receta” slot text; existing preference recovery remains intact.
9. **Purchase:** retain the aggregated action in the header as a quiet secondary action, not a sticky bottom bar.

## Limits

This research does not include interviews, analytics, real pantry data, assistive-technology testing, or direct access to logged-in competitor screens. Competitor pages support pattern hypotheses only.
