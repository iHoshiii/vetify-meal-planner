# Vetify Cat Meal Planner: Research and Implementation Blueprint

**Research date:** 11 October 2026, Asia/Singapore. **Scope:** domestic cats. **Status:** research and proposed implementation rules; cat catalog and daily-target support have not been implemented by this document.

This is the feline companion to the [dog research](dog-meal-planner-research-and-blueprint.md). It uses independently checked cat references rather than treating the owner's dog guide or food table as feline evidence. Published recommendations, mathematical examples, and proposed Vetify policies are identified separately. Publication dates and the date a live page was checked are different facts.

**Implementation follow-up, 12 October 2026:** the adult-cat catalog, daily references, explicit muscle assessment and historical references described below are now implemented in the working tree. The research date and proposal wording retain the original evidence snapshot. Implementation details appear in section 13; a full micronutrient formulation engine remains outside this release.

## 1. Findings that change the app design

Cats need their own food catalog and nutrient profiles. Protein, fat, and carbohydrates alone cannot demonstrate nutritional adequacy. Taurine, essential amino acids, fatty acids, vitamins, minerals, and water matter. The NRC's public feline nutrition guide explains taurine and arginine requirements and distinguishes carbohydrate energy from an essential dietary carbohydrate requirement. A carbohydrate requirement of zero is not a claim that every carbohydrate-containing food is inappropriate. [NRC feline nutrition guide, based on the 2006 report](https://nap.nationalacademies.org/resource/10668/cat_nutrition_final.pdf)

The first main-food catalog should contain identified complete commercial cat foods for the appropriate life stage. A formulation or feeding-test adequacy statement is evidence about that product; it is not an approval of Vetify or a homemade mixture. Supplemental ingredients should remain separate from primary-food selection. [FDA nutritional adequacy guidance](https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food)

For the requested Tracker, show an estimated calorie budget and clearly labeled protein/fat minimum comparisons. Record carbohydrate intake without inventing a universal daily carbohydrate target or a fixed percentage split. Record what was eaten: adding food to the library or planning a portion must not deduct it from today's consumed-intake budget.

## 2. Why cats currently appear unsupported

Inspection of the repository at commit `9cbdec6` found the following:

| Component                                                 | Current behavior                                                             | Cat implementation needed                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/shared/src/ingredient-catalog.ts`               | Twenty supplied ingredients, all tagged dog                                  | Separate sourced cat entries and identifiers                 |
| `packages/shared/src/foods.ts`                            | Packaged catalog is empty; library filters by species                        | Region- and formulation-specific cat labels                  |
| `packages/shared/src/daily-diet.ts`                       | Automatic daily targets reject every non-dog                                 | Separately versioned feline energy and reference profiles    |
| `apps/mobile/src/features/planner/daily-diet-tracker.tsx` | Assessment button appears for dogs only                                      | Eligible cats can complete the assessment                    |
| `packages/shared/src/meal-calculation.ts`                 | Existing primary-food portion estimator already supports screened adult cats | Reconcile its energy defaults with the new daily engine      |
| Food diary, exports, owner checks                         | Already accept cat records and enforce species matching                      | Reuse these paths; preserve their checks                     |
| `packages/shared/src/monthly-progress.ts`                 | Historical target coverage comes from saved meal plans                       | Persist dated daily-target snapshots for diary-only tracking |

The existing commercial portion estimator uses feline factors 1.2 for neutered adults and 1.4 for intact adults. Removing the species filter or changing dog labels to cat would leave the daily engine, nutritional evidence, and server catalog lookup incomplete.

## 3. Evidence and scope

| Source                                                                                                                                                                                                                                                                               | Verified edition/date                                       | Purpose in this proposal                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------- |
| [AAHA nutrition guideline](https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/0/)                                                                                                                                 | 2021                                                        | Starting energy estimates and reassessment          |
| [FEDIAF edition page](https://europeanpetfood.org/self-regulation/nutritional-guidelines/)                                                                                                                                                                                           | Public download is September 2025, checked on research date | Separately versioned feline food nutrient reference |
| [AAHA/AAFP feline life stages](https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/feline-life-stage-definitions/)                                                                                                                                            | 2021                                                        | Lifecycle distinctions                              |
| [WSAVA feline BCS chart](https://wsava.org/wp-content/uploads/2025/06/WSAVA_BCSCat_BCSCat_Nutrition_250612.pdf)                                                                                                                                                                      | June 2025                                                   | Body-condition assessment                           |
| [Cornell feeding guidance](https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat)                                                                                                     | Updated 30 April 2026                                       | Food choice and feeding context                     |
| [USDA poultry](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg05.pdf), [eggs](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg01.pdf), [seafood](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg15.pdf) | SR27/SR28 legacy composition records                        | Preparation-specific ingredient estimates           |

This proposal covers ordinary healthy adult maintenance first. Growth, reproduction, weight-change treatment, and medical diets need separate reviewed workflows. The source editions should be retained with each future rule/data version. FEDIAF's edition page also specifies conditions for commercial use; retain a record of the applicable source permissions before distributing a production nutrient library.

### Proposed initial eligibility policy

Automatic daily references require all of these explicit confirmations:

- Cat aged at least one and under seven years, with growth confirmed complete. This initial age range is a conservative Vetify release policy, not a diagnosis for older cats.
- Known neuter status; ordinary moderate activity; no pregnancy or nursing.
- Current measured weight, dated within 30 days; stable weight; maintenance goal.
- Nine-point BCS of 4 or 5; no muscle loss, appetite change, reported illness, food reaction, or prescribed diet.
- A suitable complete cat food with traceable energy information before calculating an automatic primary-food portion.

The existing 30-day freshness rule is a Vetify policy. Unknown answers must not become healthy defaults. Keep food logging available when an automatic reference is unavailable.

WSAVA assesses body fat and muscle separately; overweight animals can still lose muscle. Its assessment framework treats nutritional risk factors as reasons for extended evaluation. Add muscle-condition information to future cat assessments rather than inferring it from BCS. [WSAVA assessment guideline](https://wsava.org/wp-content/uploads/2020/01/WSAVA-Nutrition-Assessment-Guidelines-2011-JSAP.pdf)

The June 2025 cat chart notes that 6/9 may be acceptable for some cats, especially older cats. An MVP can request review outside 4–5/9 without labeling every 6/9 cat obese. [WSAVA cat chart](https://wsava.org/wp-content/uploads/2025/06/WSAVA_BCSCat_BCSCat_Nutrition_250612.pdf)

## 4. Energy: choose and disclose one method

### Proposed ordinary-adult default

Use the exponential method already used by the existing cat portion estimator:

```text
RER_kcal = 70 × measured_weight_kg^0.75
daily_energy_kcal = RER_kcal × selected_factor

neutered ordinary adult: selected_factor = 1.2
intact ordinary adult:   selected_factor = 1.4
```

AAHA gives ranges of 1.2–1.4 for neutered cats and 1.4–1.6 for intact cats. Choosing the lower endpoints is a proposed product default, not an individual animal's proven requirement. Adjust the plan after assessing actual weight and condition trends. Select one factor; do not multiply additional indoor, breed, senior, activity, or climate factors into it. [AAHA Box 1](https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/0/)

### Independent alternatives explain why estimates differ

FEDIAF's adult feline energy approach uses `weightKg^0.67`: indoor/neutered cats have a published range of `52–75 × weightKg^0.67`, and normally active cats use `100 × weightKg^0.67`. These are separate methods, not additional multipliers. [FEDIAF 2025, printed page 57, Table VII-9](https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf)

AAHA/AAFP's young-adult feline page gives another starting approach, `(30 × weightKg + 70) × 1`. At 4 kg this is 190 kcal/day. The publications do not establish one universal answer; the app must retain the selected method instead of averaging formulas. [AAHA/AAFP young-adult nutrition](https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/nutrition-and-weight-young-adult-cats/)

| Illustrative profile/method                              |          Independent result, kcal/day |
| -------------------------------------------------------- | ------------------------------------: |
| 4 kg neutered adult, proposed AAHA default               | 237.587878, display approximately 238 |
| Same 4 kg, FEDIAF indoor/neutered average coefficient 75 | 189.863489, display approximately 190 |
| Same 4 kg, FEDIAF indoor/neutered coefficients 52–75     |                 131.638686–189.863489 |
| 4 kg normally active adult, FEDIAF coefficient 100       |                            253.151319 |
| 6 kg intact ordinary adult, proposed AAHA default        | 375.698545, display approximately 376 |

Keep full calculation precision until display/portion rounding. Being intact does not establish normal activity. Indoor cats needing fewer calories should receive an individually reviewed plan rather than having this proposal's eligibility checks bypassed.

## 5. Feline macro references and essential nutrients

The following is a limited adult reference excerpt, **per 1,000 kcal metabolizable energy**, rather than a complete formulation specification:

| Nutrient             | FEDIAF adult 75 | FEDIAF adult 100 | Unit |
| -------------------- | --------------: | ---------------: | ---- |
| Protein              |           83.30 |            62.50 | g    |
| Fat                  |           22.50 |            22.50 | g    |
| Taurine, dry food    |            0.33 |             0.25 | g    |
| Taurine, canned food |            0.67 |             0.50 | g    |

The columns refer to different energy-intake profiles using feline metabolic weight. Canned and dry taurine recommendations differ. Do not substitute a dog profile, mix dry-matter/as-fed/energy bases, or apply the lower dry-food taurine reference to an entire wet/dry mixture. [FEDIAF September 2025, printed page 19, Table III-4b and page 21 footnotes](https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf)

**Proposed Vetify reference policy:** initially retain the adult-75 protein/fat comparison for eligible cats as the more protein-dense of these two profiles. Calculate `energyCoefficient = daily_energy_kcal / weightKg^0.67`; require individual nutrient-density review below 75. Keeping the same conservative profile above that coefficient avoids an automatic switch to a less dense reference. This mapping between an AAHA energy estimate and a FEDIAF reference is a product proposal, not a published FEDIAF selection algorithm or an adequacy certification. A food meeting the adult-100 profile can fall below this conservative protein comparison without being deficient; the UI must describe the comparison rather than issue a deficiency warning.

Cats specifically need dietary taurine, preformed vitamin A, and arachidonic acid; additional amino-acid and vitamin requirements also differ from dogs. Total protein cannot stand in for taurine or amino-acid quality, and total fat cannot stand in for an essential fatty-acid profile. Minerals and their relationships also need consideration. Do not infer these values from a food name or automatically recommend supplements to fill a missing value. [Merck nutritional requirements, updated September 2024](https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals)

A later micronutrient engine needs a professionally checked full matrix, separate life stages, units, chemical forms, applicable limits, bioavailability assumptions, and source locators. Implementing only the four excerpted rows does not implement a complete feline diet evaluator.

### Tracker example: healthy 4 kg neutered adult

Using the proposed AAHA default and adult-75 comparison:

| Tracker row                            | Initial daily reference | Interpretation                           |
| -------------------------------------- | ----------------------: | ---------------------------------------- |
| Calories                               |  approximately 238 kcal | Starting maintenance energy estimate     |
| Protein                                |    approximately 19.8 g | Profile-derived minimum comparison       |
| Fat                                    |     approximately 5.3 g | Profile-derived minimum comparison       |
| Carbohydrates                          |      No fixed reference | Show logged intake only                  |
| Taurine and other unverified nutrients |                 Unknown | No supplement dose or completeness score |

Original arithmetic: `237.587878 × 83.3 / 1000 = 19.791070 g` protein; `237.587878 × 22.5 / 1000 = 5.345727 g` fat. These are reference calculations, not exact optimal macro prescriptions. Do not attach a human-style 4/9/4 calorie percentage chart to this table or make a deficiency diagnosis from one day's logs.

For complete numeric intake, calorie Remaining is `energyReference − loggedEnergy`. Protein/fat Remaining describes the amount below the comparison; display zero once met and preserve a signed difference internally if needed. Exceeding a minimum is not automatically a harmful excess. With incomplete composition, show known intake plus an unknown indicator and leave exact Remaining unknown.

## 6. Food data: estimates, guarantees, and missing values

Pet food labels commonly guarantee protein/fat minima and fiber/moisture maxima. These are bounds, not exact measured daily intake. Preserve the inequality. For example, 10% minimum protein implies at least 10 g per 100 g as fed; it must not become an exact 10 g macro value. [AAFCO nutritional labeling](https://www.aafco.org/resources/startups/nutritional-labeling/)

The current nullable-number schema cannot represent bounds. Until extended, keep exact packaged protein/fat/carbohydrate fields null when only guarantees are available. Verified manufacturer energy can still support calorie tracking and eligible portion estimation.

Illustrative future nutrient value representation:

```typescript
type NutrientEvidence = {
  value: number | null;
  unit: 'g' | 'mg' | 'IU' | 'kcal';
  basis: 'per100gAsFed' | 'per100gDryMatter' | 'per1000kcalME';
  relation: 'typical' | 'estimate' | 'minimum' | 'maximum' | 'unknown';
  sourceId: string;
};
```

This sketch is not a complete nutrient schema: measured values, intervals/detection bounds, and microgram units also need representation before implementing a full nutrient matrix. Also preserve species, life stage, preparation/food form, market, SKU, formulation/version, label date, source URL, and energy method. Historical entries need their original values and evidence, not a live pointer that changes after a label update.

Only derive carbohydrate by difference from a compatible typical/proximate analysis with known protein, fat, moisture, ash, and fiber:

```text
estimated_NFE_percent = 100 − protein − fat − moisture − ash − crude_fiber
```

AAFCO supplies this equation and describes use of mean proximate analyses. [AAFCO calorie-content guidance](https://www.aafco.org/resources/startups/calorie-content/)

Label the result as an estimate of nitrogen-free extract. It is not a direct measurement of all carbohydrate or total dietary fiber. Missing ash or a mixture of minimum/maximum guarantees makes an exact subtraction inappropriate. Do not use such a calculation to overwrite manufacturer calories. A lab proximate analysis and a guaranteed analysis are distinct evidence. [Merck food analysis explanation](https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/dog-and-cat-foods?redirectid=123)

Unknown must remain null, including taurine absent from a composition record. Zero is a known composition value, not the default for missing data. Partial evidence can support a lower-bound display only when all bounds and missing components are modeled explicitly.

## 7. Sourced supplemental cat ingredient candidates

These are six preparation-specific USDA records, **per 100 g edible cooked food**. Their calories are human food-energy estimates, not independently verified feline metabolizable energy. They are supplemental food candidates, not a complete cat diet or a replacement for the packaged-food catalog.

| Food/preparation                                                | USDA NDB ID | kcal | Protein, g | Fat, g | Carbs, g |
| --------------------------------------------------------------- | ----------- | ---: | ---------: | -----: | -------: |
| Chicken breast, meat only, roasted                              | 05064       |  165 |      31.02 |   3.57 |        0 |
| Turkey breast from whole bird, non-enhanced, meat only, roasted | 05220       |  147 |      30.13 |   2.08 |        0 |
| Whole egg, hard-boiled                                          | 01129       |  155 |      12.58 |  10.61 |     1.12 |
| Atlantic cod, dry-heat cooked                                   | 15016       |  105 |      22.83 |   0.86 |        0 |
| Atlantic farmed salmon, dry-heat cooked                         | 15237       |  206 |      22.10 |  12.35 |        0 |
| Shrimp, cooked, not previously frozen                           | 15271       |   99 |      23.98 |   0.28 |     0.20 |

Verified report locators are PDF pages 118/938 in [USDA SR27 poultry](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg05.pdf), page 384 in [USDA SR28 eggs/dairy](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg01.pdf), and pages 145/381/51 in [USDA SR28 seafood](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg15.pdf), counting the first PDF page as 1. These legacy records were checked against their exact names and identifiers on the research date.

Proposed entries use separate IDs such as `cat.usda.sr27.05064.roasted.v1`, `species: 'cat'`, `kind: 'ingredient'`, and `adequacy: 'supplemental'`. Keep packaged-label `food.calories` null; store the USDA estimate in per-100 g details with its source. The turkey record has 147 kcal, so the dog table's 140 kcal must not be copied into this record.

A conservative preparation policy is plain, fully cooked portions without sauces or seasonings; remove poultry skin and bones, fish bones, and shrimp shells/tails. Suitability still depends on the individual cat, including allergies and prescribed diets.

WSAVA recommends treats contribute no more than 10% of daily calories. Apply the allowance to all supplemental extras combined, not 10% per ingredient. For the example cat the proposed estimate gives about 23.8 kcal/day for extras, approximately 14.4 g of this chicken if it is the only extra. That arithmetic remains approximate because its energy evidence is a human-food estimate. [WSAVA feline treats guide, 2024](https://wsava.org/wp-content/uploads/2024/06/Feeding-treats-to-your-cat-v2.pdf)

An ingredient macro total must never produce a complete-diet badge. UC Davis researchers found none of the homemade recipes they evaluated supplied every essential nutrient for healthy adult cats. [UC Davis study summary, 2019](https://nutrition.vetmed.ucdavis.edu/news/homemade-cat-food-diets-could-be-risky)

## 8. Packaged food label candidates

These illustrate source-backed catalog records, rather than product rankings or Philippine label verification:

| Product and market                                                     | Verified energy evidence        | Adequacy evidence                                                                | Exact P/F/C fields                     |
| ---------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| Fancy Feast Classic Chicken Feast, US, 3 oz can                        | 1,080 kcal/kg; 91 kcal/can      | AAFCO formulation statement, all life stages                                     | Null when only guarantees are supplied |
| Fancy Feast Classic Paté Chicken Feast, Australia, 85 g, item 12552998 | 110 kcal/100 g                  | Complete/balanced claim; precise life-stage statement needs package confirmation | Null                                   |
| Purina ONE Tender Selects Blend With Real Chicken, current US page     | 403 kcal per 99 g measuring cup | AAFCO feeding-test statement, adult maintenance                                  | Null when only bounds are supplied     |

Sources: [US Fancy Feast manufacturer label](https://www.purina.com/sites/default/files/product-label-deck-file/2023-05/6672-e667222-fancy-feast-classic-chicken-feast-cat-food.pdf), [Australian Fancy Feast product](https://www.purina.com.au/12552998.html), [US Purina ONE current product](https://www.purina.com/cats/shop/purina-one-chicken-tender-selects-blend-dry-cat-food).

Do not merge different markets or silently mix an older label with the current product page. For Purina ONE, 403 kcal per 99 g is the evidence recorded here; any converted kcal/kg value is a derivation with that measuring-cup mass assumption, not a separately verified label value. Prefer directly stated mass energy on the current package before publishing.

For a Philippine default catalog, check the actual locally sold SKU, package, life stage, and current label. The Australian entry needs its life-stage evidence completed before automatic adult-food eligibility. Each import should record the checked source and date; preserve the adequacy statement's method rather than claiming an AAFCO statement establishes FEDIAF compliance.

## 9. Feeding, lifecycle, and safety boundaries

Cornell recommends appropriate complete commercial foods and fresh water. Avoid making a canned or dry format universally mandatory. Food acceptance matters; wet-food moisture and drinking water should be distinguishable in any hydration diary. Do not implement a drinking-water deficit solely from a fixed weight formula or force rapid food changes. [Cornell feline feeding guidance](https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat)

AAHA/AAFP describes kittens under one year, young adults one through six, mature adults seven through ten, and seniors over ten. Use the lifecycle to request the right assessment, not as an exact biological cutoff. [Feline life-stage definitions](https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/feline-life-stage-definitions/)

| Situation                                                    | Proposed app behavior                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Growing kitten or growth completion unknown                  | Record intake; use a separately reviewed growth plan                |
| Pregnant or nursing                                          | Record intake; require a reproduction-specific plan                 |
| Mature/senior cat in initial release                         | Record intake; request individual reference review                  |
| Weight loss/gain goal or abnormal condition                  | Preserve observations; request a reviewed plan                      |
| Kidney/urinary disease, diabetes, allergies, prescribed diet | Use clinician instructions; avoid automatic nutrient treatment      |
| Appetite reduction or unexplained weight/muscle change       | Flag for prompt veterinary contact and stop automatic prescriptions |

Older cats should not receive an automatic calorie reduction or protein restriction just because of age. Their weight, muscle, digestion, and disease status require individual assessment. [AAHA/AAFP mature and senior nutrition](https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/nutrition-and-weight-mature-adult-and-senior-cats/)

Raw animal foods carry infectious risks, and bones are unsuitable default extras. [FDA raw-food guidance](https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-raw-pet-food-diets-can-be-dangerous-you-and-your-pet), [WSAVA cat treats guidance](https://wsava.org/wp-content/uploads/2024/06/Feeding-treats-to-your-cat-v2.pdf)

Exclude allium-seasoned foods and human sweets/alcohol from catalog suggestions. Do not describe every precautionary avoid-list item as having identical feline toxicology. Raw fish can contain thiaminase; liver-dominated diets can cause vitamin A excess. Those concerns do not establish that a balanced commercial food containing cooked fish or liver is unsuitable. [Merck nutritional requirements](https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals)

Food deprivation can contribute to potentially lethal feline hepatic lipidosis, especially in overconditioned cats. Appetite changes therefore need prompt veterinary attention, rather than an automatic fasting or missed-calorie catch-up instruction. The app must not prescribe refeeding protocols. [Merck feline hepatic lipidosis, updated June 2025](https://www.merckvetmanual.com/digestive-system/hepatic-diseases-of-small-animals/feline-hepatic-lipidosis)

## 10. Concrete implementation sequence

This section is an original engineering proposal. It describes future changes; this research task changes documentation only.

1. Add a feline catalog module containing the six independently sourced supplemental entries and subsequently verified complete-food labels. Keep built-ins read-only and preserve custom foods. Combine catalogs in **both** Foods GET and diet-entry POST resolution so a visible entry can actually be added. Keep server owner/pet/species validation.
2. Add a distinct `vetify-cat-maintenance-v1` rule set. Share validation where appropriate while preserving every current dog calculation and profile. Enable the cat assessment flow and add explicit muscle-condition information to its schemas, persistence, and form.
3. Reconcile `previewMealPlan` and the daily engine around the same named feline energy method. Avoid the existing rounded-versus-unrounded value becoming unexplained different targets. Show the source, assumptions, and method under the existing calculation details control.
4. Add evidence-aware nutrient fields before treating packaged guarantees as macro totals. Extend the custom packaged-food form if typical composition entry is supported; do not require fabricated macros to save a label. Keep unknowns visible in View and Tracker.
5. Save dated target snapshots with an explicit validity interval and input revision. Include measured weight/date, pet age provenance, screening result, selected factor, exponent, reference profile, method version, timezone, and source locators. Reassess validity after pet-profile edits, assessment expiry, age-boundary crossings, reference changes, and timezone changes. Monthly progress must use the target applicable on that date, not today's assessment applied retroactively.
6. Preserve immutable food/nutrition/evidence snapshots in consumed diary entries, deletion behavior, and request-ID retry semantics. Keep library addition separate from consumption and prevent a scheduled log and diet entry from counting the same consumed portion twice. Current request IDs deduplicate diary retries only; cross-path enforcement needs a shared consumed-portion identity or explicit ledger link.

The existing `DailyDietTargets.profile` union is canine-only and needs feline identifiers. The current food schema needs bounds, provenance, and food-form distinctions before micronutrient comparisons. Daily-target history also needs an owner-scoped persistence/API contract; it is not supplied merely by extending the current live calculator.

The current commercial estimator has no upper-age exclusion for otherwise eligible cats. Introducing the proposed under-seven automatic-reference policy is therefore a deliberate behavior change. Preserve previously saved older-cat schedules as historical/manual records; do not silently delete them or replace their recorded amounts with a new estimate.

### UI behavior for cats

- Foods: cat-specific list; Add and View keep their existing positions. View shows source-aware composition, preparation, and whether the food is supplemental or complete.
- Add: confirms grams and consumption date before writing to the daily diet. Estimate labels remain concise.
- Tracker: Target, Added, Remaining; protein/fat comparisons labeled as minima; carbohydrates show intake without a fabricated target.
- Progress: separate missing intake from recorded zero, and distinguish days with historical targets from days without them.
- Pet switcher: loads the selected cat's data and reference, without showing dog foods or retaining another pet's assessment.

## 11. Acceptance checks for the future implementation

| Case                                                             | Expected result                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Eligible 4 kg neutered adult                                     | Energy 237.587878 before rounding; comparison protein 19.791070 g/fat 5.345727 g |
| Eligible 6 kg intact adult                                       | Energy 375.698545 before rounding; feline rule/profile identifiers               |
| Kitten, growth unknown, unknown neuter/reproductive status       | No automatic adult reference; diary stays available                              |
| Stale/future measured weight or malformed date                   | No automatic reference; clear assessment action                                  |
| Muscle loss, appetite change, prescribed diet, abnormal activity | Reviewed plan required                                                           |
| BCS 6/9                                                          | Initial policy requests review; no automatic obesity diagnosis                   |
| Supplemental cooked turkey                                       | 147 kcal/100 g estimate; separate feline ID and source                           |
| Complete commercial label with unknown macros                    | Calorie intake known; exact P/F/C Remaining unknown                              |
| Minimum protein guarantee                                        | Lower-bound evidence retained; no fabricated exact total                         |
| Missing taurine, ash, or moisture                                | Null preserved; no invented micronutrient or exact carbohydrate result           |
| Dog selected / forged dog ID for cat diet entry                  | Species filter and server validation remain effective                            |
| Another owner's food/pet/target history                          | Access denied by owner-scoped queries                                            |
| Same request ID retried                                          | One consumed entry, same captured values                                         |
| Food edited/deleted or assessment changed later                  | Historical diary/target snapshots remain unchanged                               |
| Different device/account timezones                               | Diary dates and historical target dates stay consistent                          |
| Every existing dog fixture                                       | Unchanged canine results and screen behavior                                     |

Independent high-precision decimal and JavaScript calculations agreed on the energy examples. These numerical checks validate arithmetic only; they are not evidence that a calculated diet is clinically appropriate. Application test coverage should be added with implementation, not represented as already completed by this document.

## 12. Decisions and limitations to carry forward

The proposed initial decisions are: complete commercial main foods, separate supplemental ingredients, one disclosed ordinary-adult energy method, conservative feline protein/fat comparisons, no fixed carbohydrate target, and explicit uncertainty. Exact packaged macros, taurine intake, full-diet adequacy, kitten/reproductive/clinical algorithms, and Philippine product equivalence remain unverified unless their required evidence is supplied.

The sourced candidate list and implementation plan are ready for review. Completing this research does not populate the app's cat list, release a cat calculator, migrate records, or certify recipes. Preserve this document alongside the dog blueprint so those future changes use distinct species-specific evidence.

## 13. Adult-cat implementation follow-up

Implemented on 12 October 2026:

- Six USDA supplemental cat entries and one independently rechecked US Fancy Feast E667222 complete-food label are combined with the existing dog catalog through `food-catalog.ts`. Both Foods GET and diary POST use that registry. The cat label uses directly stated 1,080 kcal/kg; exact guaranteed-only macros remain unknown. Built-ins are immutable; custom cat foods retain their existing save/edit flow.
- `vetify-cat-maintenance-v1` uses factors 1.2/1.4, adult-75 protein/fat comparisons and the separate feline coefficient guard. Eligible cats must be fully grown, age one to under seven, and explicitly assessed with normal muscle condition. Existing dog calculations retain their values and identifiers. New commercial cat estimates and daily references share unrounded energy; displays and portions round at their respective boundaries.
- Cat current assessment and reference history use one authoritative immutable document in `diet_target_snapshots`, with the source pet, assessment, zone and frozen dated projections through the applicable 30-day limit. This avoids separate current/history writes disagreeing. Revisions never backfill dates before confirmation; later revisions supersede older projections even when blocked or expired. The latest write takes precedence across timezone changes; expired markers keep monthly Progress from reverting to an older automatic schedule target.
- Newly estimated cat schedules retain a server pet snapshot. Their associated assessment is derived from the returned immutable plan, with its original creation date/zone and a unique source-plan identity. Retries cannot renew the confirmation or substitute a conflicting payload's assessment. Existing manual schedules and historic food records stay readable.
- Relevant cat profile changes require a current assessment; name-only edits do not. The cat Tracker uses current server assessments rather than treating an old saved plan as fresh evidence. Muscle answers remain unknown until supplied, while diary logging stays available for cats outside automatic-estimate scope.
- Owner exports include the reference revisions and their assessments. Monthly Progress preserves original source zones and reference versions; future dates and missing food intake do not become recorded consumption.

The broader evidence-bound nutrient schema, locally matched Philippine packaged products, full micronutrient evaluation, growth/reproduction and clinical diet calculations remain later work. This implementation records uncertainty rather than fabricating composition or prescribing supplement doses.
