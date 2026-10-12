import { ScrollView, StyleSheet } from 'react-native';
import type { FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { accountToday } from '../../auth/session';
import { FoodForm } from './food-form';
import { FoodLibrary } from './food-library';
import { FoodFilterPanel } from './food-filter-panel';
import { useFoodBrowser } from './use-food-browser';

export function FoodsScreen({
  pet,
  activeFood,
  today = accountToday(),
}: {
  pet: Pet;
  activeFood?: FoodLabel;
  today?: string;
}) {
  const browser = useFoodBrowser(pet, activeFood);
  const { editing, save } = browser;
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {editing ? (
          <FoodForm
            key={pet.id + ':' + (editing.id ?? 'new')}
            pet={pet}
            food={editing.food}
            details={editing.details}
            editing={Boolean(editing.id)}
            pending={save.isPending}
            error={save.error?.message}
            onCancel={() => browser.setEditing(undefined)}
            onSave={(food, details) =>
              save.mutate(
                { input: { petId: pet.id, food, details }, id: editing.id },
                { onSuccess: () => browser.setEditing(undefined) },
              )
            }
          />
        ) : (
          <FoodLibrary browser={browser} pet={pet} activeFood={activeFood} today={today} />
        )}
      </ScrollView>
      {browser.filtersOpen && (
        <FoodFilterPanel
          filters={browser.filters}
          onClose={() => browser.setFiltersOpen(false)}
          onApply={(filters) => {
            browser.setFilters(filters);
            browser.setFiltersOpen(false);
          }}
        />
      )}
    </>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
});
