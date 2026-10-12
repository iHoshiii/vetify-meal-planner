import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Choice, Popup, colors } from '../../components/ui';
import { foodCategories } from './food-label';
import { defaultFoodFilters, foodSorts, mealTypes, type FoodFilters } from './food-browse';

export function FoodFilterPanel({
  filters,
  onApply,
  onClose,
}: {
  filters: FoodFilters;
  onApply: (filters: FoodFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  return (
    <Popup
      visible
      title="Filters"
      closeLabel="Close"
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Reset"
              variant="secondary"
              onPress={() => setDraft({ ...defaultFoodFilters })}
            />
          </View>
          <View style={styles.results}>
            <Button label="Show results" onPress={() => onApply(draft)} />
          </View>
        </View>
      }
    >
      <Choice
        label="Category"
        value={draft.category}
        options={[{ value: 'all', label: 'All' }, ...foodCategories]}
        onChange={(category) => setDraft({ ...draft, category })}
      />
      <Choice
        label="Meal type"
        value={draft.mealType}
        options={[{ value: 'all', label: 'All' }, ...mealTypes]}
        onChange={(mealType) => setDraft({ ...draft, mealType })}
      />
      <Text style={styles.hint}>Assign meal types when adding or editing your foods.</Text>
      <Choice
        label="Sort by"
        value={draft.sort}
        options={foodSorts}
        onChange={(sort) => setDraft({ ...draft, sort })}
      />
    </Popup>
  );
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minWidth: 0 },
  results: { flex: 1.5, minWidth: 0 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
