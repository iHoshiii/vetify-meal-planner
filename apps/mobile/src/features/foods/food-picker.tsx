import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, ErrorMessage, colors } from '../../components/ui';
import { useFoods } from '../../services/food-queries';
import { foodCalories, foodMatchesPet, sameFoodLabel } from './food-label';

export function FoodPicker({
  pet,
  selected,
  onSelect,
}: {
  pet: Pet;
  selected: FoodLabel;
  onSelect: (food: FoodLabel) => void;
}) {
  const library = useFoods(pet.id);
  const [open, setOpen] = useState(false);
  const groups = [
    { title: 'Saved foods', items: library.data?.foods ?? [] },
    { title: 'Catalogue', items: library.data?.catalog ?? [] },
  ];
  return (
    <View style={styles.picker}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a saved food"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.trigger}
      >
        <Text style={styles.triggerText}>Choose a saved food</Text>
        <View style={open && styles.expanded}>
          <AppIcon name="chevron-right" size={16} color={colors.muted} />
        </View>
      </Pressable>
      {open && (
        <View style={styles.list}>
          {library.isPending && (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading saved foods" />
          )}
          {library.isError && (
            <>
              <ErrorMessage message={library.error.message} />
              <Button
                label="Try again"
                variant="secondary"
                compact
                onPress={() => void library.refetch()}
              />
            </>
          )}
          {library.data && groups.every((group) => group.items.length === 0) && (
            <Text style={styles.detail}>No saved foods yet. Enter the package label below.</Text>
          )}
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <View key={group.title} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.items.map((item) => {
                  const matches = foodMatchesPet(item.food, pet);
                  const checked = sameFoodLabel(item.food, selected);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${item.food.name}, ${matches ? foodCalories(item.food) : `label for ${item.food.species}, different species`}`}
                      accessibilityState={{ checked, disabled: !matches }}
                      disabled={!matches}
                      onPress={() => {
                        onSelect(item.food);
                        setOpen(false);
                      }}
                      style={[styles.row, checked && styles.selected]}
                    >
                      <View style={styles.identity}>
                        <Text style={styles.name}>{item.food.name}</Text>
                        <Text style={styles.detail}>{foodCalories(item.food)}</Text>
                        {!matches && (
                          <Text style={styles.mismatch}>
                            Label for{' '}
                            {item.food.species === 'cat'
                              ? 'cats'
                              : item.food.species === 'dog'
                                ? 'dogs'
                                : 'another species'}
                          </Text>
                        )}
                      </View>
                      {checked && <AppIcon name="check" size={16} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  trigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: { flex: 1, color: colors.primary, fontSize: 14, fontWeight: '600' },
  expanded: { transform: [{ rotate: '90deg' }] },
  list: { padding: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  group: { gap: 8 },
  groupTitle: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.soft },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  mismatch: { color: '#9a6700', fontSize: 12 },
});
