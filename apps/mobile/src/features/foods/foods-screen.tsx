import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { useFoods, useSaveFood } from '../../services/food-queries';
import { FoodForm } from './food-form';
import { foodCalories, foodMatchesPet, sameFoodLabel } from './food-label';

type EditingFood = { id?: string; food?: FoodLabel };

export function FoodsScreen({
  pet,
  activeFood,
  onPlanMeals,
}: {
  pet: Pet;
  activeFood?: FoodLabel;
  onPlanMeals: () => void;
}) {
  const library = useFoods(pet.id);
  const save = useSaveFood();
  const [editing, setEditing] = useState<EditingFood>();
  useEffect(() => {
    setEditing(undefined);
    save.reset();
  }, [pet.id, save.reset]);
  function openForm(food?: FoodLabel, id?: string) {
    save.reset();
    setEditing({ food, id });
  }
  const foods = library.data?.foods ?? [];
  const catalog = library.data?.catalog ?? [];
  const hasCurrent = Boolean(
    activeFood &&
    !foods.some((item) => sameFoodLabel(item.food, activeFood)) &&
    !catalog.some((item) => sameFoodLabel(item.food, activeFood)),
  );
  const hasFoods = foods.length > 0 || catalog.length > 0 || hasCurrent;
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {editing ? (
        <FoodForm
          key={`${pet.id}:${editing.id ?? 'new'}`}
          pet={pet}
          food={editing.food}
          editing={Boolean(editing.id)}
          pending={save.isPending}
          error={save.error?.message}
          onCancel={() => setEditing(undefined)}
          onSave={(food) =>
            save.mutate(
              { input: { petId: pet.id, food }, id: editing.id },
              { onSuccess: () => setEditing(undefined) },
            )
          }
        />
      ) : (
        <>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Foods
            </Text>
            {hasFoods && (
              <Button
                label="Add food"
                variant="secondary"
                compact
                icon={<AppIcon name="plus" size={16} />}
                onPress={() => openForm()}
              />
            )}
          </View>
          {library.isPending && (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading foods" />
          )}
          {library.isError && (
            <Card>
              <ErrorMessage message={library.error.message} />
              <Button
                label="Try again"
                variant="secondary"
                onPress={() => void library.refetch()}
              />
            </Card>
          )}
          {!library.isPending && !library.isError && !hasFoods && (
            <Card>
              <View style={styles.empty}>
                <View style={styles.mark}>
                  <AppIcon name="bowl" size={28} />
                </View>
                <Text style={styles.emptyTitle}>Add your pet's food</Text>
                <Text style={styles.detail}>Save the details from its package.</Text>
                <View style={styles.emptyAction}>
                  <Button
                    label="Add food"
                    icon={<AppIcon name="plus" size={18} color={colors.white} />}
                    onPress={() => openForm()}
                  />
                </View>
              </View>
            </Card>
          )}
          {hasCurrent && activeFood && (
            <FoodCard
              pet={pet}
              food={activeFood}
              current
              action="Save label"
              onPress={() => openForm(activeFood)}
            />
          )}
          {foods.map((item) => (
            <FoodCard
              key={item.id}
              pet={pet}
              food={item.food}
              current={Boolean(activeFood && sameFoodLabel(item.food, activeFood))}
              action="Edit"
              onPress={() => openForm(item.food, item.id)}
            />
          ))}
          {catalog.length > 0 && <Text style={styles.sectionTitle}>Catalogue</Text>}
          {catalog.map((item) => (
            <FoodCard
              key={item.id}
              pet={pet}
              food={item.food}
              current={Boolean(activeFood && sameFoodLabel(item.food, activeFood))}
              action="Save label"
              onPress={() => openForm(item.food)}
            />
          ))}
          <Button
            label="Plan meals"
            variant={hasFoods ? 'primary' : 'secondary'}
            onPress={onPlanMeals}
          />
        </>
      )}
    </ScrollView>
  );
}

function FoodCard({
  pet,
  food,
  current = false,
  action,
  onPress,
}: {
  pet: Pet;
  food: FoodLabel;
  current?: boolean;
  action: string;
  onPress: () => void;
}) {
  return (
    <Card>
      <View style={styles.cardHeading}>
        <View style={styles.identity}>
          {current && <Text style={styles.current}>Current plan</Text>}
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.detail}>
            {food.form === 'dry' ? 'Dry' : food.form === 'wet' ? 'Wet' : 'Other'} ·{' '}
            {food.species === 'dog' ? 'Dogs' : food.species === 'cat' ? 'Cats' : 'Other species'}
          </Text>
        </View>
        <Button
          label={action}
          variant="ghost"
          compact
          accessibilityLabel={`${action}: ${food.name}`}
          onPress={onPress}
        />
      </View>
      <Text style={styles.calories}>{foodCalories(food)}</Text>
      {!foodMatchesPet(food, pet) && (
        <Text style={styles.mismatch}>Different species from {pet.name}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 14,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 24, fontWeight: '700', color: colors.ink },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  emptyAction: { alignSelf: 'stretch', marginTop: 8 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  foodName: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  current: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  calories: { color: colors.ink, fontSize: 14 },
  mismatch: { color: '#9a6700', fontSize: 12 },
});
