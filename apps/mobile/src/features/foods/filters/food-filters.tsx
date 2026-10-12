import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Button, Choice, Popup, colors, Field } from '../../../components/ui';
import { foodCategories } from '../food-label';
import { defaultFoodFilters, foodSorts, mealTypes, type FoodFilters } from '../food-browse';
import { AppIcon } from '../../../components/app-icon';

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

export function FoodSearchBar({
  search,
  onSearch,
  activeCount,
  onFilters,
}: {
  search: string;
  onSearch: (value: string) => void;
  activeCount: number;
  onFilters: () => void;
}) {
  return (
    <View style={searchStyles.row}>
      <View style={searchStyles.search}>
        <Field
          label="Search foods"
          value={search}
          onChangeText={onSearch}
          placeholder="Find a food"
          maxLength={120}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Filter and sort foods"
        accessibilityHint={
          activeCount ? `${activeCount} active options` : 'Choose category, meal type and sorting'
        }
        onPress={onFilters}
        style={[searchStyles.button, activeCount > 0 && searchStyles.active]}
      >
        <AppIcon name="filters" color={activeCount ? colors.white : colors.primary} />
        {activeCount > 0 && (
          <View style={searchStyles.badge}>
            <Text style={searchStyles.count}>{activeCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
const searchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  search: { flex: 1, minWidth: 0 },
  button: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
