import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import {
  defaultFoodDetails,
  savedFoodInputSchema,
  type FoodDetails,
  type FoodLabel,
} from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { accountToday } from '../../auth/session';
import { Button, Choice, ErrorMessage, Field, colors } from '../../components/ui';
import { useScreenActive } from '../../components/screen-activity';
import { FoodCategoryChoice } from './food-category-choice';
import {
  cloneFoodDetails,
  detailsWithNutrition,
  foodCategories,
  foodWithAmounts,
  ingredientLabel,
  newFoodDetails,
  newFoodLabel,
  nutritionValues,
  type NutritionValues,
} from './food-label';

const ingredientSteps = ['Ingredient', 'Nutrition per 100 g', 'Notes and source'];
const packagedSteps = ['Package label', 'Suitability', 'Calories', 'Notes and source'];
const packagedFields = [
  new Set(['name', 'form']),
  new Set(['species', 'adequacy', 'lifeStage']),
  new Set(['calorieBasis', 'calories', 'packageGrams']),
];

export function FoodForm({
  pet,
  food: initialFood,
  details: initialDetails,
  editing = false,
  pending,
  error,
  onSave,
  onCancel,
}: {
  pet: Pet;
  food?: FoodLabel;
  details?: FoodDetails;
  editing?: boolean;
  pending: boolean;
  error?: string;
  onSave: (food: FoodLabel, details: FoodDetails) => void;
  onCancel: () => void;
}) {
  const [details, setDetails] = useState(() =>
    cloneFoodDetails(initialDetails ?? (initialFood ? defaultFoodDetails() : newFoodDetails())),
  );
  const [food, setFood] = useState(() => ({ ...(initialFood ?? newFoodLabel(pet)) }));
  const [nutrition, setNutrition] = useState(() => nutritionValues(details));
  const [calories, setCalories] = useState(initialFood?.calories?.toString() ?? '');
  const [packageGrams, setPackageGrams] = useState(initialFood?.packageGrams?.toString() ?? '');
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState('');
  const isIngredient = details.kind === 'ingredient';
  const steps = isIngredient ? ingredientSteps : packagedSteps;
  const lastStep = steps.length - 1;
  const active = useScreenActive();
  useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) {
        if (step > 0) {
          setValidation('');
          setStep(step - 1);
        } else onCancel();
      }
      return true;
    });
    return () => listener.remove();
  }, [active, step, pending, onCancel]);
  function update(patch: Partial<FoodLabel>) {
    setFood((value) => ({ ...value, ...patch }));
    setValidation('');
  }
  function updateDetails(patch: Partial<FoodDetails>) {
    setDetails((value) => ({ ...value, ...patch }));
    setValidation('');
  }
  function updateNutrition(key: keyof NutritionValues, value: string) {
    setNutrition((current) => ({ ...current, [key]: value }));
    setValidation('');
  }
  function changeKind(kind: FoodDetails['kind']) {
    if (editing || kind === details.kind) return;
    const next = defaultFoodDetails(kind);
    setDetails(next);
    setNutrition(nutritionValues(next));
    setFood((current) => ({ ...newFoodLabel(pet), name: current.name }));
    setCalories('');
    setPackageGrams('');
    setValidation('');
  }
  function submit() {
    const nextFood = isIngredient
      ? ingredientLabel(food)
      : foodWithAmounts(food, calories, packageGrams);
    const nextDetails = isIngredient
      ? detailsWithNutrition(details, nutrition)
      : cloneFoodDetails(details);
    const parsed = savedFoodInputSchema.safeParse({
      petId: pet.id,
      food: nextFood,
      details: nextDetails,
    });
    const issue = parsed.success
      ? undefined
      : parsed.error.issues.find((item) => {
          if (step === lastStep) return true;
          if (!isIngredient)
            return item.path[0] === 'food' && packagedFields[step]?.has(String(item.path[1]));
          return step === 0
            ? (item.path[0] === 'food' && ['name', 'species'].includes(String(item.path[1]))) ||
                (item.path[0] === 'details' && item.path[1] === 'category')
            : item.path[0] === 'details' && item.path[1] === 'nutritionPer100g';
        });
    if (issue) {
      setValidation(issue.message);
      return;
    }
    if (step < lastStep) {
      setValidation('');
      setStep(step + 1);
      return;
    }
    if (nextFood.labelCheckedOn && nextFood.labelCheckedOn > accountToday()) {
      setValidation('The checked date cannot be in the future.');
      return;
    }
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Check the food details.');
      return;
    }
    setValidation('');
    onSave(parsed.data.food, parsed.data.details!);
  }
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {editing ? 'Edit food' : 'Add food'}
        </Text>
        <Button label="Cancel" variant="ghost" compact disabled={pending} onPress={onCancel} />
      </View>
      <View style={styles.stepHeading}>
        <Text style={styles.stepTitle}>{steps[step]}</Text>
        <Text style={styles.progress}>
          {step + 1} / {steps.length}
        </Text>
      </View>
      <View style={styles.track}>
        {steps.map((name, index) => (
          <View key={name} style={[styles.segment, index <= step && styles.complete]} />
        ))}
      </View>
      <View style={styles.fields} pointerEvents={pending ? 'none' : 'auto'}>
        {step === 0 ? (
          <>
            {!editing ? (
              <Choice<FoodDetails['kind']>
                label="Food type"
                value={details.kind}
                options={[
                  { value: 'ingredient', label: 'Ingredient' },
                  { value: 'packaged', label: 'Packaged food' },
                ]}
                onChange={changeKind}
              />
            ) : (
              <Text style={styles.hint}>{isIngredient ? 'Ingredient' : 'Packaged food'}</Text>
            )}
            <Field
              label="Food name"
              value={food.name}
              onChangeText={(name) => update({ name })}
              maxLength={120}
              placeholder={isIngredient ? 'e.g. Plain cooked chicken' : 'Name on the package'}
            />
            {isIngredient ? (
              <FoodCategoryChoice
                label="Category"
                value={details.category ?? 'unknown'}
                options={[{ value: 'unknown', label: 'Not sure' }, ...foodCategories]}
                onChange={(category) =>
                  updateDetails({ category: category === 'unknown' ? null : category })
                }
              />
            ) : (
              <Choice<FoodLabel['form']>
                label="Food form"
                value={food.form}
                options={[
                  { value: 'dry', label: 'Dry' },
                  { value: 'wet', label: 'Wet' },
                  { value: 'other', label: 'Other' },
                ]}
                onChange={(form) => update({ form })}
              />
            )}
          </>
        ) : isIngredient && step === 1 ? (
          <>
            <Text style={styles.hint}>Estimated values. Leave anything unknown blank.</Text>
            <View style={styles.nutrientRow}>
              <View style={styles.nutrientField}>
                <Field
                  label="Energy, kcal"
                  value={nutrition.kcal}
                  onChangeText={(value) => updateNutrition('kcal', value)}
                  keyboardType="decimal-pad"
                  placeholder="Unknown"
                />
              </View>
              <View style={styles.nutrientField}>
                <Field
                  label="Protein, g"
                  value={nutrition.proteinG}
                  onChangeText={(value) => updateNutrition('proteinG', value)}
                  keyboardType="decimal-pad"
                  placeholder="Unknown"
                />
              </View>
            </View>
            <View style={styles.nutrientRow}>
              <View style={styles.nutrientField}>
                <Field
                  label="Fat, g"
                  value={nutrition.fatG}
                  onChangeText={(value) => updateNutrition('fatG', value)}
                  keyboardType="decimal-pad"
                  placeholder="Unknown"
                />
              </View>
              <View style={styles.nutrientField}>
                <Field
                  label="Carbs, g"
                  value={nutrition.carbsG}
                  onChangeText={(value) => updateNutrition('carbsG', value)}
                  keyboardType="decimal-pad"
                  placeholder="Unknown"
                />
              </View>
            </View>
            <Text style={styles.hint}>An ingredient is not a complete diet.</Text>
          </>
        ) : !isIngredient && step === 1 ? (
          <>
            <Choice<FoodLabel['species']>
              label="Made for"
              value={food.species}
              options={[
                { value: 'dog', label: 'Dogs' },
                { value: 'cat', label: 'Cats' },
                { value: 'other', label: 'Other' },
              ]}
              onChange={(species) => update({ species })}
            />
            <Choice<FoodLabel['adequacy']>
              label="Label says"
              value={food.adequacy}
              options={[
                { value: 'unknown', label: 'Not sure' },
                { value: 'complete', label: 'Complete and balanced' },
                { value: 'supplemental', label: 'Supplemental only' },
              ]}
              onChange={(adequacy) => update({ adequacy })}
            />
            <Choice<FoodLabel['lifeStage']>
              label="Life stage"
              value={food.lifeStage}
              options={[
                { value: 'unknown', label: 'Not sure' },
                { value: 'adult', label: 'Adult' },
                { value: 'growth', label: 'Growth' },
                { value: 'all', label: 'All stages' },
              ]}
              onChange={(lifeStage) => update({ lifeStage })}
            />
          </>
        ) : !isIngredient && step === 2 ? (
          <>
            <Choice<FoodLabel['calorieBasis']>
              label="Calories printed per"
              value={food.calorieBasis}
              options={[
                { value: 'kg', label: 'Kilogram' },
                { value: 'package', label: 'Can or pouch' },
              ]}
              onChange={(calorieBasis) => {
                update({ calorieBasis });
                setCalories('');
              }}
            />
            <Field
              label={`Calories, kcal/${food.calorieBasis === 'kg' ? 'kg' : 'package'}`}
              value={calories}
              onChangeText={(value) => {
                setCalories(value);
                setValidation('');
              }}
              keyboardType="decimal-pad"
              placeholder="Unknown"
              hint="Leave blank if not on the label."
            />
            {food.calorieBasis === 'package' && (
              <Field
                label="Package net weight, g"
                value={packageGrams}
                onChangeText={(value) => {
                  setPackageGrams(value);
                  setValidation('');
                }}
                keyboardType="decimal-pad"
                placeholder="Unknown"
              />
            )}
          </>
        ) : (
          <>
            <Field
              label="Notes (optional)"
              value={details.notes}
              onChangeText={(notes) => updateDetails({ notes })}
              multiline
              maxLength={500}
              placeholder="Preparation or label notes"
            />
            <Field
              label="Source (optional)"
              value={food.labelSource}
              onChangeText={(labelSource) => update({ labelSource })}
              maxLength={180}
              placeholder={
                isIngredient ? 'Where these values came from' : 'Package or manufacturer'
              }
            />
            <Field
              label="Date checked (optional)"
              value={food.labelCheckedOn ?? ''}
              onChangeText={(value) => update({ labelCheckedOn: value || null })}
              maxLength={10}
              placeholder="YYYY-MM-DD"
            />
          </>
        )}
      </View>
      <ErrorMessage message={validation || error} />
      <View style={styles.actions}>
        {step > 0 && (
          <View style={styles.backAction}>
            <Button
              label="Back"
              variant="secondary"
              disabled={pending}
              onPress={() => {
                setValidation('');
                setStep(step - 1);
              }}
            />
          </View>
        )}
        <View style={styles.saveAction}>
          <Button
            label={pending ? 'Saving...' : step < lastStep ? 'Next' : 'Save food'}
            disabled={pending}
            onPress={submit}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.ink, fontSize: 24, fontWeight: '700' },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  progress: { color: colors.muted, fontSize: 13 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  complete: { backgroundColor: colors.primary },
  fields: { gap: 14 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  nutrientRow: { flexDirection: 'row', gap: 10 },
  nutrientField: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  backAction: { flex: 1, minWidth: 0 },
  saveAction: { flex: 2, minWidth: 0 },
});
