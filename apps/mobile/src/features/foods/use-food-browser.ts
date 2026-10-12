import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { useFoods, useSaveFood } from '../../services/food-queries';
import { catalogForPet, sameFoodLabel, withFoodDetails } from './food-label';
import { browseFoods, defaultFoodFilters } from './food-browse';

type EditingFood = { id?: string; food?: FoodLabel; details?: FoodDetails };
export function useFoodBrowser(pet: Pet, activeFood?: FoodLabel) {
  const library = useFoods(pet.id);
  const save = useSaveFood();
  const [editing, setEditing] = useState<EditingFood>();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ ...defaultFoodFilters });
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setEditing(undefined);
    setSearch('');
    setFilters({ ...defaultFoodFilters });
    setFiltersOpen(false);
    save.reset();
  }, [pet.id, save.reset]);
  function openForm(food?: FoodLabel, details?: FoodDetails, id?: string) {
    save.reset();
    setEditing({ food, details, id });
  }
  const foods = (library.data?.foods ?? []).map(withFoodDetails);
  const catalog = catalogForPet((library.data?.catalog ?? []).map(withFoodDetails), pet);
  const filteredFoods = browseFoods(foods, search, filters);
  const filteredCatalog = browseFoods(catalog, search, filters);
  const hasCurrent = Boolean(
    activeFood &&
    !foods.some((item) => sameFoodLabel(item.food, activeFood)) &&
    !catalog.some((item) => sameFoodLabel(item.food, activeFood)),
  );
  function openFilters() {
    Keyboard.dismiss();
    setFiltersOpen(true);
  }
  return {
    library,
    save,
    editing,
    setEditing,
    search,
    setSearch,
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    foods,
    catalog,
    filteredFoods,
    filteredCatalog,
    hasCurrent,
    hasFoods: foods.length > 0 || catalog.length > 0 || hasCurrent,
    openForm,
    openFilters,
  };
}
export type FoodBrowser = ReturnType<typeof useFoodBrowser>;
