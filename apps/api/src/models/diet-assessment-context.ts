import type { Pet } from '@vetify/planner-shared/pets';

/** Names and preferences don't change a feeding assessment; clinical inputs do. */
export function dietPetContext(pet: Pet): string {
  return JSON.stringify({
    species: pet.species,
    birthMonth: pet.birthMonth,
    registeredOn: pet.registeredOn,
    ageReferenceOn: pet.ageReferenceOn,
    ageYearsAtReference: pet.ageYearsAtReference,
    ageMonthsAtReference: pet.ageMonthsAtReference,
    weightKg: pet.weightKg,
    neuterStatus: pet.neuterStatus,
    activityLevel: pet.activityLevel,
    feedingGoal: pet.feedingGoal,
    pregnantOrNursing: pet.pregnantOrNursing,
    healthConditions: [...pet.healthConditions].sort(),
    allergies: [...pet.allergies].sort(),
  });
}
