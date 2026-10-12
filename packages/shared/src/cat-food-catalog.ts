import type { CatalogFood, FoodDetails } from './foods.js';

const checkedOn = '2026-10-12';
const poultryReport =
  'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR27/reports/sr27fg05.pdf';
const eggReport =
  'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg01.pdf';
const seafoodReport =
  'https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg15.pdf';
const fancyFeastLabel =
  'https://www.purina.com/sites/default/files/product-label-deck-file/2023-05/6672-e667222-fancy-feast-classic-chicken-feast-cat-food.pdf';

function immutableFood(item: CatalogFood): CatalogFood {
  Object.freeze(item.food);
  Object.freeze(item.details.nutritionPer100g);
  Object.freeze(item.details);
  return Object.freeze(item);
}

function ingredient(
  id: string,
  name: string,
  nutritionPer100g: FoodDetails['nutritionPer100g'],
  report: string,
  record: string,
  page: number,
  preparation: string,
): CatalogFood {
  return immutableFood({
    id,
    food: {
      name,
      form: 'other',
      adequacy: 'supplemental',
      species: 'cat',
      lifeStage: 'unknown',
      calorieBasis: 'kg',
      calories: null,
      packageGrams: null,
      labelSource: `USDA SR composition estimate: ${report}`,
      labelCheckedOn: checkedOn,
    },
    details: {
      kind: 'ingredient',
      category: 'protein',
      nutritionPer100g,
      notes:
        `USDA ${record}; PDF page ${page} (first page = 1). ${preparation} ` +
        'Per 100 g edible portion; human-food energy estimate, not verified feline ME. ' +
        'Supplemental extra only; all extras together should stay within 10% of daily calories. ' +
        'Not a complete feline diet; taurine and other unlisted nutrients are unknown.',
    },
  });
}

// Preparation-specific USDA SR27 (2014) / SR28 (2015) records, checked 2026-10-12.
// These estimates must not become packaged-label calories or complete-diet claims.
export const catIngredientCatalog: readonly CatalogFood[] = Object.freeze([
  ingredient(
    'cat.usda.sr27.05064.roasted.v1',
    'Chicken breast (meat only, roasted)',
    { kcal: 165, proteinG: 31.02, fatG: 3.57, carbsG: 0 },
    poultryReport,
    'SR27 NDB 05064: Chicken, broilers or fryers, breast, meat only, cooked, roasted',
    118,
    'Serve plain and fully cooked; remove skin and bones.',
  ),
  ingredient(
    'cat.usda.sr27.05220.roasted.v1',
    'Turkey breast (non-enhanced, meat only, roasted)',
    { kcal: 147, proteinG: 30.13, fatG: 2.08, carbsG: 0 },
    poultryReport,
    'SR27 NDB 05220: Turkey, breast, from whole bird, non-enhanced, meat only, roasted',
    938,
    'Serve plain and fully cooked; remove skin and bones; no injected seasoning.',
  ),
  ingredient(
    'cat.usda.sr28.01129.hard-boiled.v1',
    'Whole egg (hard-boiled)',
    { kcal: 155, proteinG: 12.58, fatG: 10.61, carbsG: 1.12 },
    eggReport,
    'SR28 NDB 01129: Egg, whole, cooked, hard-boiled',
    384,
    'Remove shell; serve fully cooked without salt, butter or seasoning.',
  ),
  ingredient(
    'cat.usda.sr28.15016.dry-heat.v1',
    'Atlantic cod (cooked, dry heat)',
    { kcal: 105, proteinG: 22.83, fatG: 0.86, carbsG: 0 },
    seafoodReport,
    'SR28 NDB 15016: Fish, cod, Atlantic, cooked, dry heat',
    145,
    'Serve plain and fully cooked; remove all bones.',
  ),
  ingredient(
    'cat.usda.sr28.15237.dry-heat.v1',
    'Atlantic farmed salmon (cooked, dry heat)',
    { kcal: 206, proteinG: 22.1, fatG: 12.35, carbsG: 0 },
    seafoodReport,
    'SR28 NDB 15237: Fish, salmon, Atlantic, farmed, cooked, dry heat',
    381,
    'Serve plain and fully cooked; remove all bones.',
  ),
  ingredient(
    'cat.usda.sr28.15271.cooked.v1',
    'Shrimp (cooked, not previously frozen)',
    { kcal: 99, proteinG: 23.98, fatG: 0.28, carbsG: 0.2 },
    seafoodReport,
    'SR28 NDB 15271: Crustaceans, shrimp, cooked (not previously frozen)',
    51,
    'Remove shell and tail; serve plain and fully cooked.',
  ),
]);

// US formulation E667222, verified against the label linked by Purina's current
// US product page on 2026-10-12. Other countries/formulations need their own entry.
// Guaranteed protein/fat minima are not exact macro amounts; do not infer carbs.
export const catPackagedFoodCatalog: readonly CatalogFood[] = Object.freeze([
  immutableFood({
    id: 'cat.purina.us.e667222.classic-chicken-feast.v1',
    food: {
      name: 'Fancy Feast Classic Paté Chicken Feast (US, 3 oz)',
      form: 'wet',
      adequacy: 'complete',
      species: 'cat',
      lifeStage: 'all',
      calorieBasis: 'kg',
      calories: 1080,
      packageGrams: null,
      labelSource: fancyFeastLabel,
      labelCheckedOn: checkedOn,
    },
    details: {
      kind: 'packaged',
      category: null,
      nutritionPer100g: { kcal: 108, proteinG: null, fatG: null, carbsG: null },
      notes:
        'US formula E667222, 3 oz can; label linked by the current Purina US product page. ' +
        'Formulated to meet AAFCO Cat Food Nutrient Profiles for all life stages. ' +
        'Calculated ME: 1080 kcal/kg and 91 kcal/can; 108 kcal/100 g is derived from the kg value. ' +
        'Guarantees are bounds, not exact macros; protein, fat and carbohydrate totals stay unknown. ' +
        'Check that the purchased package matches this US formulation.',
    },
  }),
]);
