import { catIngredientCatalog, catPackagedFoodCatalog } from './cat-food-catalog.js';
import { packagedFoodCatalog, type CatalogFood } from './foods.js';
import { defaultIngredientCatalog } from './ingredient-catalog.js';

function immutableCatalogCopy(item: CatalogFood): CatalogFood {
  return Object.freeze({
    id: item.id,
    food: Object.freeze({ ...item.food }),
    details: Object.freeze({
      ...item.details,
      nutritionPer100g: Object.freeze({ ...item.details.nutritionPer100g }),
    }),
  });
}

// Species filtering is shared by library browsing and authoritative diet lookup.
// Copy before freezing so the existing dog-only catalog retains its own objects.
export const defaultFoodCatalog: readonly CatalogFood[] = Object.freeze(
  [
    ...defaultIngredientCatalog,
    ...packagedFoodCatalog,
    ...catIngredientCatalog,
    ...catPackagedFoodCatalog,
  ].map(immutableCatalogCopy),
);
