import { View } from 'react-native';
import { Choice, Field } from '../../components/ui';
import type { PetFormValues, PetStepProps } from './pet-form-values';

const scores = [
  { label: 'Not sure', value: '' },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `${index + 1} of 10`,
    value: String(index + 1),
  })),
];

export function PetHealth({ form, set }: PetStepProps) {
  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Health conditions (optional)"
        value={form.healthConditions}
        onChangeText={(value) => set('healthConditions', value)}
        placeholder="Arthritis, diabetes"
        multiline
        hint="Separate each item with a comma."
      />
      <Choice
        label="Profile body condition score (1 to 10)"
        value={form.bodyConditionScore === null ? '' : String(form.bodyConditionScore)}
        onChange={(value) => set('bodyConditionScore', value ? Number(value) : null)}
        options={scores}
      />
      <Choice
        label="Activity level"
        value={form.activityLevel}
        onChange={(value) => set('activityLevel', value as PetFormValues['activityLevel'])}
        options={[
          { label: 'Unknown', value: 'unknown' },
          { label: 'Low', value: 'low' },
          { label: 'Moderate', value: 'moderate' },
          { label: 'High', value: 'high' },
        ]}
      />
      <Field
        label="Food preferences (optional)"
        value={form.foodPreferences}
        onChangeText={(value) => set('foodPreferences', value)}
        placeholder="Wet food or preferred flavors"
        multiline
        maxLength={500}
      />
    </View>
  );
}
