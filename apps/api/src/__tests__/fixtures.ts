import type { Introspection } from '@vetify/planner-shared/core-contract';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { PetInput } from '@vetify/planner-shared/pets';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { ObjectId } from 'mongodb';
import { loadConfig } from '../config/env.js';
import type { Fetcher } from '../middleware/auth.js';

export const testConfig = loadConfig({ NODE_ENV: 'test', AUTH_CACHE_TTL_SECONDS: 0 });
export const principals = new Map<string, Introspection>();
export function principal(id = new ObjectId().toHexString()): Introspection {
  return {
    version: 1,
    user: { id, role: 'user', status: 'active' },
    region: { timeZone: 'Asia/Manila' },
    subscription: { plan: 'free', status: null, expiresAt: null },
    entitlements: [],
    tokenExpiresAt: new Date(Date.now() + 900000).toISOString(),
    validUntil: new Date(Date.now() + 60000).toISOString(),
  };
}
export const mockFetch: Fetcher = async (_url, options) => {
  const token = new Headers(options?.headers).get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const value = principals.get(token);
  return value
    ? Response.json(value)
    : Response.json({ error: 'Invalid session' }, { status: 401 });
};
export async function account() {
  const value = principal();
  const token = `test-${value.user.id}`;
  principals.set(token, value);
  return token;
}
export const today = todayInTimeZone('Asia/Manila');
export const petInput: PetInput = {
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: '2020-01',
  ageYears: 6,
  ageMonths: 0,
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 6.2,
  allergies: [],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'moderate',
  bodyConditionScore: null,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
};
export function planInput(petId: string): MealPlanInput {
  return {
    requestId: '12345678-1234-1234-1234-123456789abc',
    petId,
    mode: 'estimate',
    weightKg: 6.2,
    weightMeasuredOn: today,
    conditionScore: 5,
    stableWeight: true,
    growing: false,
    healthConcern: false,
    prescribedDiet: false,
    appetiteChange: false,
    food: {
      name: 'Adult food',
      form: 'dry',
      adequacy: 'complete',
      species: 'dog',
      lifeStage: 'adult',
      calorieBasis: 'kg',
      calories: 3500,
      packageGrams: null,
      labelSource: 'Bag label',
      labelCheckedOn: today,
    },
    extrasKcal: 0,
    manualDailyGrams: null,
    mealTimes: ['08:00', '18:00'],
  };
}
