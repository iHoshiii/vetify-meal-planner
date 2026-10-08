import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors } from '../../components/ui';
import type { PetFormValues } from './pet-form-values';

function display(value: string) {
  const label = value.trim().replace(/_/g, ' ');
  return label ? label[0].toUpperCase() + label.slice(1) : 'Not provided';
}

export function PetReview({
  form,
  onEdit,
}: {
  form: PetFormValues;
  onEdit: (step: number) => void;
}) {
  const age = `${form.ageValue || '?'} ${form.ageUnit}${form.ageUnit === 'years' && form.ageRemainderMonths ? `, ${form.ageRemainderMonths} months` : ''}`;
  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Basics',
      rows: [
        ['Name', form.name],
        ['Species', form.species === 'other' ? form.otherSpecies : form.species],
        ['Breed', form.breed],
        ['Sex', form.sex],
      ],
    },
    {
      title: 'Age and care',
      rows: [
        ['Age', age],
        [
          'Birth month',
          `${form.birthMonth || 'Not provided'}${form.birthMonthEstimated ? ' (estimated)' : ''}`,
        ],
        ['Spayed or neutered', form.neuterStatus],
        ['Pregnant or nursing', form.pregnantOrNursing],
      ],
    },
    {
      title: 'Food and weight',
      rows: [
        ['Current weight', `${form.weightKg} kg`],
        ['Current food', form.currentFood],
        ['Feeding goal', form.feedingGoal],
        ['Allergies or reactions', form.allergies],
      ],
    },
    {
      title: 'Health and activity',
      rows: [
        ['Health conditions', form.healthConditions],
        [
          'Profile condition score',
          form.bodyConditionScore === null ? 'Not sure' : `${form.bodyConditionScore} of 10`,
        ],
        ['Activity', form.activityLevel],
        ['Food preferences', form.foodPreferences],
      ],
    },
  ];
  return (
    <View style={styles.sections}>
      {sections.map((section, index) => (
        <Card key={section.title}>
          <View style={styles.heading}>
            <Text style={styles.title}>{section.title}</Text>
            <Button
              label={`Edit ${section.title.toLowerCase()}`}
              variant="ghost"
              onPress={() => onEdit(index)}
            />
          </View>
          {section.rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{display(value)}</Text>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 12 },
  heading: { gap: 6, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  row: { gap: 3, marginBottom: 10 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 15 },
});
