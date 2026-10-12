# UI refinement

This change refines presentation in the existing mobile application and local browser preview. It preserves branding, navigation, form controls, calculation results and submitted values. Earlier pending cat implementation changes remain separate from this UI work.

## Changes

- Account shows the user's actual identity, membership and Pets, Export my data and Log out actions without a second subscription section.
- Foods, Tracker, Progress and pet forms use shorter headings and omit repeated introductory text. Preparation notes and target explanations are available through disclosures.
- Tracker retains minimum nutrient labels, unknown intake, unavailable targets, warnings and source links. Formula and calculation factors are omitted from presentation.
- Header, tabs and pet picker align with the content width on larger screens. Long identity text and form choices wrap; food categories no longer disappear beyond a horizontal strip.
- Technical error details receive a plain fallback while actionable validation and account errors remain visible.
- The browser preview has a compact planner header, wrapping account actions and shorter review screens.

## Files changed for this UI work

All mobile paths below are relative to `apps/mobile/src`:

| Area              | Files                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared components | `components/app-header.tsx`, `app-tab-bar.tsx`, `controls.tsx`, `fields.tsx`, `presentation.ts`, `presentation.test.ts`                                                                                                                                                                                                                           |
| Account           | `features/account/account-screen.tsx`                                                                                                                                                                                                                                                                                                             |
| Foods             | `features/foods/food-category-choice.tsx`, `food-form.tsx`, `foods-screen.tsx`, `foods-screen.test.ts`                                                                                                                                                                                                                                            |
| Pets              | `features/pets/pet-card.tsx`, `pet-health.tsx`, `pet-review.tsx`, `pet-switcher.tsx`, `pets-screen.tsx`                                                                                                                                                                                                                                           |
| Tracker and forms | `features/planner/daily-diet-tracker.tsx`, `daily-diet-tracker.test.ts`, `diet-assessment-form.tsx`, `diet-assessment-form.test.ts`, `meal-entry-fields.tsx`, `meal-log-row.tsx`, `observation-form.tsx`, `plan-food-energy.tsx`, `plan-health-fields.tsx`, `plan-health-notice.tsx`, `plan-progress.tsx`, `plan-review.tsx`, `plan-schedule.tsx` |
| Progress          | `features/progress/monthly-progress-screen.tsx`                                                                                                                                                                                                                                                                                                   |

Browser files: `apps/web/src/App.tsx`, `apps/web/src/features/planner/planner-header.tsx`, `pet-review.tsx` and `plan-review.tsx`.

## Verification

- Targeted mobile interaction and presentation tests; browser test suite.
- ESLint and workspace TypeScript checks.
- Android and iOS Hermes exports; browser production build.
- Actual React Native components rendered with React Native Web and fixture services: 44 food/target/pet-isolation stages and 32 account/form/progress stages at 320, 390, 768 and 1280 pixel widths. No page errors or horizontal overflow in these checks. Account also checked with long identity values and text enlarged to 130%.
- Login, signup and validation checked at four sizes, including 320 by 524. Content below a short viewport remains scrollable.

Visual preview files are ignored under `.local-data/mobile-ui-preview`. These checks do not replace a native phone check of keyboard behaviour, system font scaling and file sharing. No backend, schema, authentication or calculation rules were changed for this refinement.
