import { z } from 'zod';

const words = z.array(z.string().trim().min(1).max(80)).max(20);

// The FCI Shih Tzu standard lists 4.5-8 kg for adults:
// https://www.fci.be/Nomenclature/Standards/208g09-en.pdf
// This is not a clinical limit. The higher entry limit catches obvious unit/typing mistakes.
export const SHIH_TZU_TYPICAL_ADULT_MAX_KG = 8;
export const SHIH_TZU_WEIGHT_ENTRY_MAX_KG = 15;
export const SHIH_TZU_WEIGHT_ERROR =
  'A Shih Tzu over 15 kg looks unlikely. Check the weight or breed.';

export function isShihTzu(species: string, breed: string): boolean {
  return (
    species.trim().toLowerCase() === 'dog' &&
    breed.trim().toLowerCase().replace(/[\s-]/g, '') === 'shihtzu'
  );
}

export const petInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    species: z.enum(['dog', 'cat', 'other']),
    otherSpecies: z.string().trim().max(60),
    breed: z.string().trim().max(80),
    birthMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable(),
    ageYears: z.number().int().min(0).max(200),
    ageMonths: z.number().int().min(0).max(11),
    sex: z.enum(['male', 'female', 'unknown']),
    neuterStatus: z.enum(['yes', 'no', 'prefer_not_to_say']),
    weightKg: z.number().finite().positive().max(500),
    allergies: words,
    healthConditions: words,
    foodPreferences: z.string().trim().max(500),
    currentFood: z.string().trim().max(120),
    activityLevel: z.enum(['low', 'moderate', 'high', 'unknown']),
    bodyConditionScore: z.number().int().min(1).max(10).nullable(),
    feedingGoal: z.enum(['maintain', 'gain', 'lose', 'unsure']),
    pregnantOrNursing: z.enum(['yes', 'no', 'unknown']),
  })
  .refine((pet) => pet.species !== 'other' || pet.otherSpecies.length > 0, {
    path: ['otherSpecies'],
    message: 'Enter the species',
  })
  .superRefine((pet, context) => {
    if (isShihTzu(pet.species, pet.breed) && pet.weightKg > SHIH_TZU_WEIGHT_ENTRY_MAX_KG) {
      context.addIssue({
        code: 'custom',
        path: ['weightKg'],
        message: SHIH_TZU_WEIGHT_ERROR,
      });
    }
  });

export type PetInput = z.infer<typeof petInputSchema>;

export type Pet = Omit<PetInput, 'ageYears' | 'ageMonths'> & {
  id: string;
  ageYearsAtReference: number;
  ageMonthsAtReference: number;
  registeredOn: string;
  ageReferenceOn: string;
  createdAt: string;
  updatedAt: string;
};
