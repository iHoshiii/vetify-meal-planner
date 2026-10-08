import { View, StyleSheet } from 'react-native';
import { Choice, Field } from '../../components/ui';

export function MealEntryFields({
  index,
  unit,
  amount,
  extras,
  note,
  onAmount,
  onUnit,
  onExtras,
  onNote,
}: {
  index: number;
  unit: 'g' | 'oz';
  amount: string;
  extras: string;
  note: string;
  onAmount: (value: string) => void;
  onUnit: (value: 'g' | 'oz') => void;
  onExtras: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <View style={styles.fields}>
      <Choice
        label="Amount unit"
        value={unit}
        onChange={(value) => onUnit(value === 'oz' ? 'oz' : 'g')}
        options={[
          { label: 'Grams', value: 'g' },
          { label: 'Ounces', value: 'oz' },
        ]}
      />
      <Field
        label={`Meal ${index + 1} amount eaten (${unit})`}
        value={amount}
        onChangeText={onAmount}
        keyboardType="decimal-pad"
      />
      <Field
        label="Treats or extras, kcal"
        value={extras}
        onChangeText={onExtras}
        keyboardType="decimal-pad"
        hint="Enter 0 for none. Leave blank when calories are unknown."
      />
      <Field label="Meal note" value={note} onChangeText={onNote} maxLength={300} multiline />
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 12 } });
