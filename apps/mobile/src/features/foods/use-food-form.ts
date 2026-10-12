import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import {
  defaultFoodDetails,
  savedFoodInputSchema,
  type FoodDetails,
  type FoodLabel,
} from '@vetify/planner-shared/foods';
import { accountToday } from '../../auth/session';
import { useScreenActive } from '../../components/screen-activity';
import {
  cloneFoodDetails,
  detailsWithNutrition,
  foodWithAmounts,
  ingredientLabel,
  newFoodDetails,
  newFoodLabel,
  nutritionValues,
  type NutritionValues,
} from './food-label';

import type { FoodFormProps } from './food-form-types';
const ingredientSteps = ['Ingredient', 'Nutrition per 100 g', 'Notes and source'];
const packagedSteps = ['Package label', 'Suitability', 'Calories', 'Notes and source'];
const packagedFields = [
  new Set(['name', 'form']),
  new Set(['species', 'adequacy', 'lifeStage']),
  new Set(['calorieBasis', 'calories', 'packageGrams']),
];

export function useFoodForm({
  pet,
  food: initialFood,
  details: initialDetails,
  editing = false,
  pending,
  onSave,
  onCancel,
}: FoodFormProps) {
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
  return {
    details,
    food,
    nutrition,
    calories,
    packageGrams,
    step,
    setStep,
    validation,
    setValidation,
    isIngredient,
    steps,
    lastStep,
    update,
    updateDetails,
    updateNutrition,
    changeKind,
    submit,
    setCalories,
    setPackageGrams,
  };
}
export type FoodFormState = ReturnType<typeof useFoodForm>;
