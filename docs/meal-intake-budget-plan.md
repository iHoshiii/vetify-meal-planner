# Meal intake budget

## Research

- Human diaries separate a daily target from food actually logged. MyFitnessPal shows consumed and remaining calories on Today, and lets people set the serving amount and meal before logging. Cronometer similarly shows energy consumed or remaining against a target. Eat This Much marks planned food as eaten and updates progress. We will keep Vetify's planned portions separate from eaten portions. Sources: [MyFitnessPal Today](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab), [MyFitnessPal food logging](https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-to-log-food-to-your-diary), [Cronometer Energy Summary](https://support.cronometer.com/hc/en-us/articles/31118923481876-Energy-Summary), [Eat This Much tracking](https://help.eatthismuch.com/help/how-do-i-track-what-ive-eaten-or-lock-meals-in-place).
- AAFCO food labels give energy in kcal/kg as fed and per familiar unit. For package energy, package mass is needed before calculating kcal/g. AAHA recommends accounting for all food, treats and snacks, weighing dry portions where possible, and keeping extras to at most 10% of daily energy for healthy pets. Sources: [AAFCO calorie labels](https://www.aafco.org/consumers/understanding-pet-food/calories/), [AAHA feeding plans](https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/feeding-plans-for-healthy-appropriate-weight-cats-and-dogs/), [AAHA weight management](https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/weight-management/2014-AAHA-Weight-Management-Guidelines-for-Dogs-and-Cats).
- The mass ounce conversion is exactly 28.349523125 g per avoirdupois oz. Fluid ounces measure volume and cannot be converted to food grams without a density. Source: [NIST conversion tables](https://www.nist.gov/document/2026-hb-133-appendix-e).

## Calculation and data flow

1. The saved plan supplies a daily kcal target and an immutable food energy label. Existing manual plans derive a target from their daily grams and known planned extras. If calories or extras are unknown, no kcal target is displayed.
2. Each dated meal log records the amount **eaten**, not merely served. The owner enters mass in g or weight oz. Convert oz to g once and store grams. Skipped means 0 g. Record actual treats or other extras in kcal; an empty extras field means unknown, while 0 means none.
3. Compute food kcal as eaten grams times kcal/g from that plan's saved label. Add actual extras kcal. Sum logs for the pet and local date, including earlier plan versions active on that date. Each entry uses its own plan label. Planned but unlogged meals contribute 0. Replacing a log recalculates the sum from current entries, so edits cannot double count.
4. Remaining kcal equals daily target minus known consumed kcal. Show `kcal left` when positive, `kcal over` when negative, and `0 kcal left` at target. Do not roll deficits into another day. If a logged meal has unknown extras or the label is missing, show grams logged/left instead of an exact kcal balance.
5. Example arithmetic: if the verified label is 10 kcal/g, 10 g eaten is 100 kcal, leaving 150 kcal from a 250 kcal target. This density is only an illustration. A 3.5 kcal/g label would make the same meal 35 kcal and leave 215 kcal.

## Screen and checks

- One compact Today budget: amount left or over, consumed/target, and a progress bar. Each meal shows planned grams, entered amount, calculated kcal and short save buttons. The g/oz selector sits with the mass field. Avoid instructional paragraphs on the screen.
- Keep the existing plan setup and safety gates. Manual plans with no label still track mass. Treats count against the same target. Do not add exercise calories or recalculate a veterinarian's target from activity logs.
- The mass field applies to the saved plan food shown on each meal. Other foods need their own known kcal logged under extras. Never apply the plan food's kcal/g to a different food.
- Verify grams and oz, kcal/kg and kcal/package, partial and skipped meals, extras, unknown labels and extras, over-target display, edited logs, plan versions, date boundaries, and owner access. Keep the UI usable on narrow screens.
