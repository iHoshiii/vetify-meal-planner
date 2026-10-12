import { View } from 'react-native';
import { Choice, Field } from '../../components/ui';
import type { PetFormValues, PetStepProps } from './pet-form-values';

export function PetBasics({ form, set }: PetStepProps) {
  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Pet name"
        value={form.name}
        onChangeText={(value) => set('name', value)}
        maxLength={60}
      />
      <Choice
        label="Species"
        value={form.species}
        onChange={(value) => set('species', value as PetFormValues['species'])}
        options={[
          { label: 'Dog', value: 'dog' },
          { label: 'Cat', value: 'cat' },
          { label: 'Other', value: 'other' },
        ]}
      />
      {form.species === 'other' && (
        <Field
          label="Species name"
          value={form.otherSpecies}
          onChangeText={(value) => set('otherSpecies', value)}
          placeholder="Rabbit, bird, or another species"
          maxLength={60}
        />
      )}
      <Field
        label="Breed (optional)"
        value={form.breed}
        onChangeText={(value) => set('breed', value)}
        maxLength={80}
      />
      <Choice
        label="Sex"
        value={form.sex}
        onChange={(value) => set('sex', value as PetFormValues['sex'])}
        options={[
          { label: 'Unknown', value: 'unknown' },
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ]}
      />
    </View>
  );
}
