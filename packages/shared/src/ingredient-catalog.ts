import type { CatalogFood } from './foods.js';
import { dogProteinCatalog } from './dog-protein-catalog.js';
import { dogPlantCatalog } from './dog-plant-catalog.js';
// User-provided composition estimates, not verified canine metabolizable energy.
export const defaultIngredientCatalog: readonly CatalogFood[] = [
  ...dogProteinCatalog,
  ...dogPlantCatalog,
];
