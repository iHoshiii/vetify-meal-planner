import { petInputSchema } from '@vetify/planner-shared/pets';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { connectDb, disconnectDb } from '../apps/api/src/config/db';
import { loadConfig } from '../apps/api/src/config/env';
import { ensureIndexes } from '../apps/api/src/config/indexes';
import { createPet, listPets } from '../apps/api/src/models/pets';
import { demoUsers } from '../tools/mock-main/demo-users';

const config = loadConfig();
const databaseUrl = new URL(config.PLANNER_MONGODB_URI);
if (
  config.NODE_ENV === 'production' ||
  !['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) ||
  databaseUrl.pathname !== '/vetify_meal_planner'
) {
  throw new Error('Demo seeding requires the local vetify_meal_planner database');
}
try {
  await ensureIndexes(await connectDb(config.PLANNER_MONGODB_URI));
  for (const user of demoUsers) {
    if ((await listPets(user.id)).length) continue;
    const pet = petInputSchema.parse({
      name: user.plan === 'pro' ? 'Luna' : 'Milo',
      species: 'dog',
      otherSpecies: '',
      breed: 'Mixed breed',
      birthMonth: null,
      ageYears: 3,
      ageMonths: 0,
      sex: 'male',
      neuterStatus: 'yes',
      weightKg: 12,
      allergies: [],
      healthConditions: [],
      foodPreferences: '',
      currentFood: '',
      activityLevel: 'moderate',
      bodyConditionScore: null,
      feedingGoal: 'maintain',
      pregnantOrNursing: 'no',
    });
    await createPet(user.id, pet, todayInTimeZone('Asia/Manila'));
  }
  console.log('Demo pets ready for the two mock accounts. No account records were created.');
} finally {
  await disconnectDb();
}
