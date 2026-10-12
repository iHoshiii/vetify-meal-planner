import { Pressable, Text, View } from 'react-native';

import type { Pet } from '@vetify/planner-shared/pets';

import { MuscleConditionChoice } from './muscle-condition-choice';

import { reports, type DietAssessmentFields } from './use-diet-assessment';
import { styles } from './diet-assessment-styles';
export function AssessmentHealthFields({
  pet,
  pending,
  fields,
}: {
  pet: Pet;
  pending: boolean;
  fields: DietAssessmentFields;
}) {
  const { muscleCondition, setMuscleCondition, setValidation, answers, setAnswers } = fields;
  return (
    <>
      {pet.species === 'cat' && (
        <MuscleConditionChoice
          value={muscleCondition}
          disabled={pending}
          onChange={(value) => {
            setMuscleCondition(value);
            setValidation('');
          }}
        />
      )}
      {reports.map(([key, label]) => (
        <View key={key} style={styles.reportRow}>
          <Text style={styles.reportLabel}>{label}</Text>
          <View accessibilityRole="radiogroup" style={styles.answers}>
            {(['yes', 'no'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${label}: ${value === 'yes' ? 'Yes' : 'No'}`}
                accessibilityState={{ checked: answers[key] === value, disabled: pending }}
                disabled={pending}
                onPress={() => {
                  setAnswers((current) => ({ ...current, [key]: value }));
                  setValidation('');
                }}
                style={[styles.option, answers[key] === value && styles.selected]}
              >
                <Text style={[styles.optionText, answers[key] === value && styles.selectedText]}>
                  {value === 'yes' ? 'Yes' : 'No'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}
