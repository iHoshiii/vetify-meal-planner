import { Text, View } from 'react-native';
import { Choice, Field, Notice, colors } from '../../components/ui';
import type { PetFormValues, PetStepProps } from './pet-form-values';

type Props = PetStepProps & {
  setAge: (value: string) => void;
  setAgeUnit: (value: PetFormValues['ageUnit']) => void;
  setBirthMonth: (value: string) => void;
};

export function PetAgeCare({ form, set, setAge, setAgeUnit, setBirthMonth }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Age"
        value={form.ageValue}
        onChangeText={setAge}
        keyboardType="number-pad"
        placeholder="2"
      />
      <Choice
        label="Age unit"
        value={form.ageUnit}
        onChange={(value) => setAgeUnit(value as PetFormValues['ageUnit'])}
        options={[
          { label: 'Years', value: 'years' },
          { label: 'Months', value: 'months' },
        ]}
      />
      {form.ageUnit === 'years' && form.ageRemainderMonths > 0 && (
        <Text style={{ color: colors.muted }}>
          {form.ageRemainderMonths} additional months. Choose Months to edit the full age.
        </Text>
      )}
      <Field
        label="Birth month (optional, YYYY-MM)"
        value={form.birthMonth}
        onChangeText={setBirthMonth}
        placeholder="2024-06"
        maxLength={7}
      />
      {form.birthMonthEstimated && (
        <Notice>The displayed birth month is estimated from the age you entered.</Notice>
      )}
      <Choice
        label="Spayed or neutered?"
        value={form.neuterStatus}
        onChange={(value) => set('neuterStatus', value as PetFormValues['neuterStatus'])}
        options={[
          { label: 'Prefer not to say', value: 'prefer_not_to_say' },
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]}
      />
      <Choice
        label="Pregnant or nursing?"
        value={form.pregnantOrNursing}
        onChange={(value) => set('pregnantOrNursing', value as PetFormValues['pregnantOrNursing'])}
        options={[
          { label: 'Unknown', value: 'unknown' },
          { label: 'No', value: 'no' },
          { label: 'Yes', value: 'yes' },
        ]}
      />
    </View>
  );
}
