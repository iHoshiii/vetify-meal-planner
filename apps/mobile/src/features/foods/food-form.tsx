import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { savedFoodInputSchema, type FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { accountToday } from '../../auth/session';
import { Button, Choice, ErrorMessage, Field, colors } from '../../components/ui';
import { useScreenActive } from '../../components/screen-activity';
import { foodWithAmounts, newFoodLabel } from './food-label';

const steps = ['Package label', 'Suitability', 'Calories'];
const stepFields = [new Set(['name', 'form', 'species']), new Set(['adequacy', 'lifeStage'])];

export function FoodForm({
  pet,
  food: initialFood,
  editing = false,
  pending,
  error,
  onSave,
  onCancel,
}: {
  pet: Pet;
  food?: FoodLabel;
  editing?: boolean;
  pending: boolean;
  error?: string;
  onSave: (food: FoodLabel) => void;
  onCancel: () => void;
}) {
  const [food, setFood] = useState(() => ({ ...(initialFood ?? newFoodLabel(pet)) }));
  const [calories, setCalories] = useState(initialFood?.calories?.toString() ?? '');
  const [packageGrams, setPackageGrams] = useState(initialFood?.packageGrams?.toString() ?? '');
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState('');
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
  const update = (patch: Partial<FoodLabel>) => {
    setFood((value) => ({ ...value, ...patch }));
    setValidation('');
  };
  function submit() {
    const next = foodWithAmounts(food, calories, packageGrams);
    const parsed = savedFoodInputSchema.safeParse({ petId: pet.id, food: next });
    const issue = parsed.success
      ? undefined
      : parsed.error.issues.find(
          (item) => step === 2 || stepFields[step]?.has(String(item.path[1])),
        );
    if (issue) {
      setValidation(issue.message);
      return;
    }
    if (step < 2) {
      setValidation('');
      setStep(step + 1);
      return;
    }
    if (next.labelCheckedOn && next.labelCheckedOn > accountToday()) {
      setValidation('The label date cannot be in the future.');
      return;
    }
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Check the food label.');
      return;
    }
    setValidation('');
    onSave(parsed.data.food);
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
            <Field
              label="Food name"
              value={food.name}
              onChangeText={(name) => update({ name })}
              maxLength={120}
              placeholder="Name on the package"
            />
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
          </>
        ) : step === 1 ? (
          <>
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
        ) : (
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
            <Field
              label="Label source (optional)"
              value={food.labelSource}
              onChangeText={(labelSource) => update({ labelSource })}
              maxLength={180}
              placeholder="Package or manufacturer"
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
            label={pending ? 'Saving...' : step < 2 ? 'Next' : 'Save food'}
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
  complete: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  fields: { gap: 14 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  backAction: { flex: 1, minWidth: 0 },
  saveAction: { flex: 2, minWidth: 0 },
});
