import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { portionNutrition, type DietEntryInput } from '@vetify/planner-shared/daily-diet';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { defaultFoodDetails, type FoodDetails, type FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, Field, colors } from '../../components/ui';
import { foodNotesText } from '../../components/presentation';
import { useFoods, useSaveFood } from '../../services/food-queries';
import { useAddDietEntry } from '../../services/diet-queries';
import { accountToday } from '../../auth/session';
import { FoodCategoryChoice } from './food-category-choice';
import { FoodForm } from './food-form';
import {
  catalogForPet,
  filterFoods,
  foodCalories,
  foodCategories,
  foodMatchesPet,
  nutritionText,
  sameFoodLabel,
  type FoodCategoryFilter,
  withFoodDetails,
} from './food-label';

type EditingFood = { id?: string; food?: FoodLabel; details?: FoodDetails };

export function FoodsScreen({
  pet,
  activeFood,
  onPlanMeals,
  today = accountToday(),
}: {
  pet: Pet;
  activeFood?: FoodLabel;
  onPlanMeals: () => void;
  today?: string;
}) {
  const library = useFoods(pet.id);
  const save = useSaveFood();
  const [editing, setEditing] = useState<EditingFood>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FoodCategoryFilter>('all');
  useEffect(() => {
    setEditing(undefined);
    setSearch('');
    setCategory('all');
    save.reset();
  }, [pet.id, save.reset]);
  function openForm(food?: FoodLabel, details?: FoodDetails, id?: string) {
    save.reset();
    setEditing({ food, details, id });
  }
  const foods = (library.data?.foods ?? []).map(withFoodDetails);
  const catalog = catalogForPet((library.data?.catalog ?? []).map(withFoodDetails), pet);
  const filteredFoods = filterFoods(foods, search, category);
  const filteredCatalog = filterFoods(catalog, search, category);
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
          details={editing.details}
          editing={Boolean(editing.id)}
          pending={save.isPending}
          error={save.error?.message}
          onCancel={() => setEditing(undefined)}
          onSave={(food, details) =>
            save.mutate(
              { input: { petId: pet.id, food, details }, id: editing.id },
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
          <Button
            label="Plan meals"
            variant={hasFoods ? 'primary' : 'secondary'}
            onPress={onPlanMeals}
          />
          {hasCurrent && activeFood && (
            <FoodCard
              key={`${pet.id}:${today}:current-food`}
              pet={pet}
              food={activeFood}
              details={defaultFoodDetails()}
              current
              today={today}
              onSaveLabel={() => openForm(activeFood, defaultFoodDetails())}
            />
          )}
          {(foods.length > 0 || catalog.length > 0) && (
            <>
              <Field
                label="Search foods"
                value={search}
                onChangeText={setSearch}
                placeholder="Find a food"
                maxLength={120}
              />
              <FoodCategoryChoice<FoodCategoryFilter>
                label="Category"
                value={category}
                options={[{ value: 'all', label: 'All' }, ...foodCategories]}
                onChange={setCategory}
              />
            </>
          )}
          {filteredFoods.length > 0 && <Text style={styles.sectionTitle}>Your foods</Text>}
          {filteredFoods.map((item) => (
            <FoodCard
              key={`${pet.id}:${today}:${item.id}`}
              pet={pet}
              food={item.food}
              details={item.details}
              current={Boolean(activeFood && sameFoodLabel(item.food, activeFood))}
              today={today}
              entrySource={{ source: 'saved', foodId: item.id }}
              onEdit={() => openForm(item.food, item.details, item.id)}
            />
          ))}
          {filteredCatalog.length > 0 && (
            <View style={styles.catalogHeading}>
              <Text style={styles.sectionTitle}>Food library</Text>
            </View>
          )}
          {filteredCatalog.map((item) => (
            <FoodCard
              key={`${pet.id}:${today}:${item.id}`}
              pet={pet}
              food={item.food}
              details={item.details}
              today={today}
              entrySource={{ source: 'catalog', foodId: item.id }}
            />
          ))}
          {!library.isPending &&
            !library.isError &&
            (foods.length > 0 || catalog.length > 0) &&
            filteredFoods.length === 0 &&
            filteredCatalog.length === 0 && (
              <Text style={styles.detail}>No foods match. Try another name or category.</Text>
            )}
        </>
      )}
    </ScrollView>
  );
}

function FoodCard({
  pet,
  food,
  details,
  current = false,
  today,
  entrySource,
  onEdit,
  onSaveLabel,
}: {
  pet: Pet;
  food: FoodLabel;
  details: FoodDetails;
  current?: boolean;
  today: string;
  entrySource?: Pick<DietEntryInput, 'source' | 'foodId'>;
  onEdit?: () => void;
  onSaveLabel?: () => void;
}) {
  const [open, setOpen] = useState<'view' | 'add' | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [grams, setGrams] = useState('');
  const [added, setAdded] = useState(false);
  const requestId = useRef<string | null>(null);
  const add = useAddDietEntry();
  const ingredient = details.kind === 'ingredient';
  const validAmount =
    grams.trim() !== '' &&
    Number.isFinite(Number(grams)) &&
    Number(grams) > 0 &&
    Number(grams) <= 10000;
  const nutrition = portionNutrition(
    food,
    details,
    open === 'add' && validAmount ? Number(grams) : 100,
  );
  function toggle(next: 'view' | 'add') {
    add.reset();
    setAdded(false);
    setOpen(open === next ? null : next);
  }
  function addPortion() {
    if (!entrySource || !validAmount || add.isPending) return;
    requestId.current ??= randomUUID();
    add.mutate(
      {
        ...entrySource,
        requestId: requestId.current,
        petId: pet.id,
        date: today,
        grams: Number(grams),
      },
      {
        onSuccess: () => {
          requestId.current = null;
          setGrams('');
          setOpen(null);
          setAdded(true);
        },
      },
    );
  }
  return (
    <Card>
      <View style={styles.cardHeading}>
        <View style={styles.foodActions}>
          {entrySource ? (
            <Button
              label="Add"
              compact
              disabled={add.isPending || !foodMatchesPet(food, pet)}
              accessibilityLabel={`Add: ${food.name}`}
              onPress={() => toggle('add')}
            />
          ) : (
            onSaveLabel && (
              <Button
                label="Save"
                compact
                variant="secondary"
                accessibilityLabel={`Save label: ${food.name}`}
                onPress={onSaveLabel}
              />
            )
          )}
          <Button
            label="View"
            compact
            variant="secondary"
            disabled={add.isPending}
            accessibilityLabel={`View: ${food.name}`}
            onPress={() => toggle('view')}
          />
        </View>
        <View style={styles.identity}>
          {current && <Text style={styles.current}>Current plan</Text>}
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.detail}>
            {ingredient
              ? (foodCategories.find((category) => category.value === details.category)?.label ??
                'Ingredient')
              : `${food.form === 'dry' ? 'Dry' : food.form === 'wet' ? 'Wet' : 'Other'} · ${food.species === 'dog' ? 'Dogs' : food.species === 'cat' ? 'Cats' : 'Other species'}`}
          </Text>
        </View>
      </View>
      {added && (
        <Text accessibilityLiveRegion="polite" style={styles.current}>
          Added to today's diet
        </Text>
      )}
      {open && (
        <View style={styles.expanded}>
          {open === 'add' ? (
            <Field
              label="Amount, g"
              value={grams}
              keyboardType="decimal-pad"
              maxLength={12}
              onChangeText={(value) => {
                setGrams(value);
                requestId.current = null;
                add.reset();
              }}
              placeholder="e.g. 50"
            />
          ) : (
            <Text style={styles.macroLabel}>Per 100 g{ingredient ? ' (estimated)' : ''}</Text>
          )}
          {(open === 'view' || validAmount) && (
            <>
              <Text style={styles.calories}>
                {nutritionText(
                  nutrition.kcal === null ? null : Math.round(nutrition.kcal * 10) / 10,
                  ' kcal',
                )}
                {open === 'add' ? '' : ' / 100 g'}
              </Text>
              <View style={styles.macroRow}>
                {(
                  [
                    ['Protein', nutrition.proteinG],
                    ['Fat', nutrition.fatG],
                    ['Carbs', nutrition.carbsG],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.macro}>
                    <Text style={styles.macroLabel}>{label}</Text>
                    <Text style={styles.macroValue}>
                      {nutritionText(value === null ? null : Math.round(value * 10) / 10, ' g')}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {open === 'view' && (
            <>
              {!ingredient && <Text style={styles.detail}>{foodCalories(food)}</Text>}
              <Text style={styles.detail}>
                {ingredient
                  ? 'Supplemental food'
                  : food.adequacy === 'complete'
                    ? 'Complete food (label)'
                    : 'Completeness not confirmed'}
              </Text>
              {details.notes && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Food details: ${food.name}`}
                    accessibilityState={{ expanded: notesOpen }}
                    onPress={() => setNotesOpen(!notesOpen)}
                    style={styles.notesButton}
                  >
                    <Text style={styles.notesLabel}>Preparation and notes</Text>
                    <AppIcon name="chevron-down" size={14} />
                  </Pressable>
                  {notesOpen && (
                    <Text style={styles.detail}>
                      {foodNotesText(details.notes, entrySource?.source === 'catalog')}
                    </Text>
                  )}
                </>
              )}
              {onEdit && (
                <Button
                  label="Edit food"
                  variant="ghost"
                  compact
                  accessibilityLabel={`Edit: ${food.name}`}
                  onPress={onEdit}
                />
              )}
            </>
          )}
          {open === 'add' && (
            <>
              <Text style={styles.detail}>Today's diet · {today}</Text>
              <ErrorMessage message={add.error?.message} />
              <View style={styles.macroRow}>
                <View style={styles.macro}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    disabled={add.isPending}
                    onPress={() => setOpen(null)}
                  />
                </View>
                <View style={styles.macro}>
                  <Button
                    label={add.isPending ? 'Adding...' : 'Add to diet'}
                    disabled={add.isPending || !validAmount}
                    onPress={addPortion}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      )}
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
  title: { flex: 1, minWidth: 0, fontSize: 24, fontWeight: '700', color: colors.ink },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 6 },
  catalogHeading: { gap: 6 },
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
  foodActions: { width: 68, gap: 6 },
  expanded: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  notesButton: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 },
  notesLabel: { color: colors.primary, fontSize: 13, flexShrink: 1 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  foodName: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  current: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  calories: { color: colors.ink, fontSize: 14 },
  mismatch: { color: '#9a6700', fontSize: 12 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, minWidth: 0, gap: 4 },
  macroLabel: { color: colors.muted, fontSize: 12 },
  macroValue: { color: colors.ink, fontSize: 13, fontWeight: '500' },
});
