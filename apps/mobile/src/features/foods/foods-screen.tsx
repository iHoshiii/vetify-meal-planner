import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { portionNutrition, type DietEntryInput } from '@vetify/planner-shared/daily-diet';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { defaultFoodDetails, type FoodDetails, type FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, Field, Popup, colors } from '../../components/ui';
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
  today = accountToday(),
}: {
  pet: Pet;
  activeFood?: FoodLabel;
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
          {hasCurrent && activeFood && (
            <FoodCard
              key={`${pet.id}:${today}:current-food`}
              pet={pet}
              food={activeFood}
              details={defaultFoodDetails()}
              current
              wide
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
          {filteredFoods.length > 0 && (
            <View style={styles.grid}>
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
            </View>
          )}
          {filteredCatalog.length > 0 && <Text style={styles.sectionTitle}>Food library</Text>}
          {filteredCatalog.length > 0 && (
            <View style={styles.grid}>
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
            </View>
          )}
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
  wide = false,
  today,
  entrySource,
  onEdit,
  onSaveLabel,
}: {
  pet: Pet;
  food: FoodLabel;
  details: FoodDetails;
  current?: boolean;
  wide?: boolean;
  today: string;
  entrySource?: Pick<DietEntryInput, 'source' | 'foodId'>;
  onEdit?: () => void;
  onSaveLabel?: () => void;
}) {
  const [open, setOpen] = useState<'view' | 'add' | null>(null);
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
  const per100 = portionNutrition(food, details, 100);
  const matches = foodMatchesPet(food, pet);
  const subtitle = ingredient
    ? (foodCategories.find((item) => item.value === details.category)?.label ?? 'Ingredient')
    : `${food.form === 'dry' ? 'Dry' : food.form === 'wet' ? 'Wet' : 'Other'} · ${food.species === 'dog' ? 'Dogs' : food.species === 'cat' ? 'Cats' : 'Other species'}`;
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
    <>
      {wide ? (
        <Card>
          <View style={styles.wideRow}>
            <View style={styles.identity}>
              {current && <Text style={styles.current}>Current plan</Text>}
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.detail}>{subtitle}</Text>
            </View>
            <View style={styles.wideActions}>
              {onSaveLabel && (
                <Button
                  label="Save"
                  compact
                  variant="secondary"
                  accessibilityLabel={`Save label: ${food.name}`}
                  onPress={onSaveLabel}
                />
              )}
              <Button
                label="View"
                compact
                variant="secondary"
                accessibilityLabel={`View: ${food.name}`}
                onPress={() => toggle('view')}
              />
            </View>
          </View>
          {added && (
            <Text accessibilityLiveRegion="polite" style={styles.current}>
              Added to today's diet
            </Text>
          )}
          {!matches && <Text style={styles.mismatch}>Different species from {pet.name}</Text>}
        </Card>
      ) : (
        <View style={styles.tile}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View: ${food.name}`}
            disabled={add.isPending}
            onPress={() => toggle('view')}
          >
            <View style={styles.image}>
              {details.imageUrl ? (
                <Image
                  source={{ uri: details.imageUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.placeholder}>
                  <AppIcon name="bowl" size={28} />
                </View>
              )}
              {per100.kcal !== null && (
                <View style={styles.kcalBadge}>
                  <Text style={styles.kcalBadgeText}>{Math.round(per100.kcal)} kcal</Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              {current && <Text style={styles.current}>Current plan</Text>}
              <Text style={styles.foodName} numberOfLines={2}>
                {food.name}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {subtitle}
              </Text>
              {!matches && <Text style={styles.mismatch}>Different species from {pet.name}</Text>}
              {added && (
                <Text accessibilityLiveRegion="polite" style={styles.current}>
                  Added to today's diet
                </Text>
              )}
            </View>
          </Pressable>
          {entrySource && (
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                (pressed || add.isPending || !matches) && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Add: ${food.name}`}
              disabled={add.isPending || !matches}
              onPress={() => toggle('add')}
            >
              <AppIcon name="plus" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
      )}
      <Popup visible={open !== null} title={food.name} onClose={() => setOpen(null)}>
        {open === 'add' ? (
          <>
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
            {validAmount && (
              <>
                <Text style={styles.calories}>
                  {nutritionText(
                    nutrition.kcal === null ? null : Math.round(nutrition.kcal * 10) / 10,
                    ' kcal',
                  )}
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
            <Text style={styles.detail}>Today's diet · {today}</Text>
            <ErrorMessage message={add.error?.message} />
            <Button
              label={add.isPending ? 'Adding...' : 'Add to diet'}
              disabled={add.isPending || !validAmount}
              onPress={addPortion}
            />
          </>
        ) : (
          <>
            <Text style={styles.macroLabel}>Per 100 g{ingredient ? ' (estimated)' : ''}</Text>
            <Text style={styles.calories}>
              {nutritionText(
                nutrition.kcal === null ? null : Math.round(nutrition.kcal * 10) / 10,
                ' kcal',
              )}
              {' / 100 g'}
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
            {!ingredient && <Text style={styles.detail}>{foodCalories(food)}</Text>}
            <Text style={styles.detail}>
              {ingredient
                ? 'Supplemental food'
                : food.adequacy === 'complete'
                  ? 'Complete food (label)'
                  : 'Completeness not confirmed'}
            </Text>
            {details.notes && (
              <Text style={styles.detail}>
                {foodNotesText(details.notes, entrySource?.source === 'catalog')}
              </Text>
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
      </Popup>
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
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: '700', color: colors.ink },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
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
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  emptyAction: { alignSelf: 'stretch', marginTop: 8 },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tile: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    height: 112,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  kcalBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kcalBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 10, gap: 3 },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  wideActions: { width: 76, gap: 6 },
  foodName: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  current: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  calories: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  mismatch: { color: '#9a6700', fontSize: 12 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, minWidth: 0, gap: 4 },
  macroLabel: { color: colors.muted, fontSize: 12 },
  macroValue: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
