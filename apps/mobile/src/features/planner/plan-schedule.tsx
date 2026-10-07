import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import { StyleSheet, View } from 'react-native';
import { Choice, Field, Notice } from '../../components/ui';
import { PlanNumberField } from './plan-number-field';

function suggestedTimes(count: number): string[] {
  if (count === 1) return ['08:00'];
  return Array.from(
    { length: count },
    (_, index) => `${String(Math.round(7 + (index * 12) / (count - 1))).padStart(2, '0')}:00`,
  );
}

export function PlanSchedule({
  value,
  set,
}: {
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  return (
    <View style={styles.fields}>
      {value.mode === 'manual' && (
        <PlanNumberField
          label="Existing daily food amount, grams"
          value={value.manualDailyGrams}
          placeholder="e.g. 160"
          hint="Use the amount you already feed or were given by your veterinarian."
          onChange={(manualDailyGrams) => set({ ...value, manualDailyGrams })}
        />
      )}
      <Choice
        label="Meals each day"
        value={String(value.mealTimes.length)}
        options={Array.from({ length: 6 }, (_, index) => ({
          label: String(index + 1),
          value: String(index + 1),
        }))}
        onChange={(count) => set({ ...value, mealTimes: suggestedTimes(Number(count)) })}
      />
      {value.mealTimes.map((time, index) => (
        <Field
          key={index}
          label={`Meal ${index + 1} time`}
          value={time}
          maxLength={5}
          placeholder="HH:MM"
          hint="Use 24-hour time, for example 18:30."
          onChangeText={(next) => {
            const mealTimes = [...value.mealTimes];
            mealTimes[index] = next;
            set({ ...value, mealTimes });
          }}
        />
      ))}
      <Notice>
        The daily amount is divided evenly. Times are reminders for your schedule, not a change to
        the daily amount.
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
