import type { FormValues } from './pet-form-values';
import { provided, optionLabel, ageLabel, birthMonthLabel, toList } from './pet-form-helpers';
export function reviewSections(form: FormValues) {
  const sections: { title: string; fields: [string, string][] }[] = [
    {
      title: 'Pet information',
      fields: [
        ['Pet name', provided(form.name)],
        ['Species', provided(form.species)],
        ['Breed', provided(form.breed)],
        ['Sex', optionLabel(form.sex)],
      ],
    },
    {
      title: 'Age and care',
      fields: [
        ['Age', ageLabel(form)],
        ['Birth month and year', birthMonthLabel(form.birthMonth, form.birthMonthEstimated)],
        ['Spayed or neutered?', optionLabel(form.neuterStatus)],
        ['Pregnant or nursing?', optionLabel(form.pregnantOrNursing)],
      ],
    },
    {
      title: 'Food and feeding',
      fields: [
        ['Current weight', form.weightKg ? `${form.weightKg} kg` : 'Not provided'],
        ['Current food', provided(form.currentFood)],
        [
          'Feeding goal',
          {
            unsure: 'Unsure',
            maintain: 'Maintain weight',
            gain: 'Gain weight',
            lose: 'Lose weight',
          }[form.feedingGoal],
        ],
        ['Allergies or food reactions', provided(toList(form.allergies).join(', '))],
      ],
    },
    {
      title: 'Health and activity',
      fields: [
        ['Health conditions', provided(toList(form.healthConditions).join(', '))],
        [
          'Body condition score',
          form.bodyConditionScore ? `${form.bodyConditionScore} of 10` : 'Not sure',
        ],
        ['Activity level', optionLabel(form.activityLevel)],
        ['Food preferences', provided(form.foodPreferences)],
      ],
    },
  ];
  return sections;
}
