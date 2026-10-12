import {
  dietAssessmentInputSchema,
  type DailyDietAssessment,
  type DailyDietTargets,
} from './daily-diet.js';
import { petAge } from './pet-age.js';
import { isShihTzu, SHIH_TZU_WEIGHT_ENTRY_MAX_KG, type Pet } from './pets.js';
import { validCalendarDay } from './planner-date.js';
const energySource =
  'https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/';
const nutrientSource =
  'https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf';

// Current-profile, ordinary adult maintenance starting estimate only. The assessment supplies measured weight and explicitly confirmed screening flags; a bare pet profile must not silently become a healthy, growth-complete finding.
export function estimateDailyDietTargets(
  pet: Pet,
  today: string,
  assessment: DailyDietAssessment | null,
): DailyDietTargets {
  const blockers: string[] = [];
  const feline = pet.species === 'cat';
  const result: DailyDietTargets = {
    kcal: null,
    proteinG: null,
    fatG: null,
    carbsG: null,
    status: 'needs-review',
    factor: null,
    rerKcal: null,
    weightKg: null,
    profile: null,
    blockers,
    notes: [
      'Energy is a starting estimate. Reassess it using weight and body condition.',
      'Protein and fat are profile-derived minimum comparisons, not a complete recipe.',
      `There is no universal carbohydrate target in the selected ${feline ? 'feline' : 'canine'} profile.`,
      'Food composition estimates do not establish that the whole diet is complete.',
      ...(feline
        ? [
            'Vetify retains the conservative Adult Cat 75 comparison; this is a product policy, not a published FEDIAF profile-selection rule.',
            'A food meeting the Adult Cat 100 profile can fall below this protein comparison without being deficient.',
          ]
        : []),
    ],
    reference: 'AAHA 2021 · FEDIAF September 2025',
    version: feline ? 'vetify-cat-maintenance-v1' : 'vetify-dog-maintenance-v1',
    sources: { energy: energySource, nutrients: nutrientSource },
  };
  if (!validCalendarDay(today)) blockers.push('Enter a real assessment date.');
  if (pet.species !== 'dog' && !feline)
    blockers.push('Automatic daily targets support adult dogs and cats only.');
  if (pet.pregnantOrNursing !== 'no')
    blockers.push('Pregnancy, nursing or an unknown reproductive status needs a reviewed plan.');
  if (pet.feedingGoal !== 'maintain')
    blockers.push('Automatic targets are for weight maintenance only.');
  if (pet.healthConditions.length || pet.allergies.length)
    blockers.push('Health conditions or food reactions need a reviewed food plan.');
  if (pet.neuterStatus === 'prefer_not_to_say')
    blockers.push('Confirm the neuter status before estimating a daily target.');
  if (pet.activityLevel !== 'moderate')
    blockers.push('This starting estimate requires ordinary, moderate activity.');
  if (!assessment) {
    blockers.push('Confirm a current weight and feeding assessment to estimate daily targets.');
    return result;
  }
  const parsedAssessment = dietAssessmentInputSchema.safeParse({ petId: pet.id, ...assessment });
  if (!parsedAssessment.success) {
    blockers.push('Check the weight, measurement date and assessment answers.');
    return result;
  }
  // Reuse the existing unit/entry plausibility check. It is a request to verify the measurement, not a diagnosis or an ideal-weight value for this breed.
  if (isShihTzu(pet.species, pet.breed) && assessment.weightKg > SHIH_TZU_WEIGHT_ENTRY_MAX_KG)
    blockers.push(
      'Check the weight and units, then weigh the dog again before estimating targets.',
    );
  if (validCalendarDay(today)) {
    const age = petAge(pet, today);
    // Conservative MVP boundary; age alone does not prove growth completion.
    if (age.years < (feline ? 1 : 2) || assessment.growing)
      blockers.push(
        `Growing or young ${feline ? 'cats' : 'dogs'} need an individual reviewed feeding plan.`,
      );
    if (feline && age.years >= 7)
      blockers.push('Cats aged seven or older need an individual feeding review in this release.');
    const measurement = Date.parse(`${assessment.weightMeasuredOn}T00:00:00.000Z`);
    const current = Date.parse(`${today}T00:00:00.000Z`);
    if (measurement > current) blockers.push('The weight measurement cannot be in the future.');
    else if (current - measurement > 30 * 86400000)
      blockers.push(`Measure the ${feline ? 'cat' : 'dog'} again before estimating daily targets.`);
  }
  if (assessment.healthConcern || assessment.prescribedDiet)
    blockers.push('Health concerns or a prescribed diet need a reviewed feeding plan.');
  if (assessment.appetiteChange || !assessment.stableWeight)
    blockers.push('Recent appetite or weight changes need a feeding review.');
  if (assessment.conditionScore !== 4 && assessment.conditionScore !== 5)
    blockers.push('Confirm a body condition score of 4 or 5 out of 9.');
  if (feline && assessment.muscleCondition !== 'normal')
    blockers.push(
      'Confirm normal muscle condition; muscle loss needs an individual feeding review.',
    );
  if (blockers.length) return result;

  // One method, never a multiplied age/size/activity/neuter stack. Lower ends of AAHA adult ranges match the existing conservative Vetify research default.
  const factor = feline
    ? pet.neuterStatus === 'yes'
      ? 1.2
      : 1.4
    : pet.neuterStatus === 'yes'
      ? 1.4
      : 1.6;
  const metabolicWeight = assessment.weightKg ** 0.75;
  const rerKcal = 70 * metabolicWeight;
  const kcal = rerKcal * factor;
  if (feline) {
    // The chosen AAHA energy method uses W^.75. The feline FEDIAF food reference uses W^.67; these exponents and methods must not be combined.
    const felineEnergyCoefficient = kcal / assessment.weightKg ** 0.67;
    if (felineEnergyCoefficient < 75) {
      blockers.push('This energy intake needs a reviewed feline nutrient-density profile.');
      return result;
    }
    // Retaining Adult Cat 75 above its coefficient is a disclosed conservative Vetify comparison policy, not a FEDIAF selection rule or adequacy claim.
    return {
      ...result,
      kcal,
      proteinG: (83.3 * kcal) / 1000,
      fatG: (22.5 * kcal) / 1000,
      status: 'estimated',
      factor,
      rerKcal,
      weightKg: assessment.weightKg,
      profile: 'fediaf2025.cat-adult75',
      reference: `${result.reference} · Adult Cat 75`,
    };
  }
  const energyCoefficient = 70 * factor;
  // The A95 mapping at 98 is Vetify's disclosed conservative profile policy, not a newly published FEDIAF threshold or an adequacy approval.
  if (energyCoefficient < 95) {
    blockers.push('This energy intake needs a reviewed nutrient-density profile.');
    return result;
  }
  const profile = energyCoefficient < 110 ? 'fediaf2025.adult95' : 'fediaf2025.adult110';
  const proteinPer1000Kcal = profile === 'fediaf2025.adult95' ? 52.1 : 45;
  return {
    ...result,
    kcal,
    proteinG: (proteinPer1000Kcal * kcal) / 1000,
    fatG: (13.75 * kcal) / 1000,
    status: 'estimated',
    factor,
    rerKcal,
    weightKg: assessment.weightKg,
    profile,
    reference: `${result.reference} · ${profile.endsWith('95') ? 'Adult 95' : 'Adult 110'}`,
  };
}
