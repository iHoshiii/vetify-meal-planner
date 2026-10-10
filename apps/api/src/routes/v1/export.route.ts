import { Router } from 'express';
import { getDb } from '../../config/db.js';
import { actorOf } from './caller.js';

const router = Router();
router.get('/', async (req, res) => {
  const ownerId = actorOf(req).id;
  const names = [
    'pets',
    'meal_plans',
    'feeding_logs',
    'nutrition_observations',
    'saved_foods',
  ] as const;
  const entries = await Promise.all(
    names.map(
      async (name) => [name, await getDb().collection(name).find({ ownerId }).toArray()] as const,
    ),
  );
  res.json({ exportedAt: new Date().toISOString(), ownerId, ...Object.fromEntries(entries) });
});
export default router;
