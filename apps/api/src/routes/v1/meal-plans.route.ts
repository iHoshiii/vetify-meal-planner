import { previewMealPlan } from '@vetify/planner-shared/meal-calculation';
import {
  feedingLogInputSchema,
  mealPlanInputSchema,
  type MealPlanInput,
} from '@vetify/planner-shared/meal-plans';
import { todayInTimeZone, validCalendarDay } from '@vetify/planner-shared/planner-date';
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { validate } from '../../middleware/validate.js';
import { listFeedingLogs, saveFeedingLog } from '../../models/feeding-logs.js';
import { findMealPlan, listMealPlans, saveMealPlan } from '../../models/meal-plans.js';
import { isValidObjectId } from '../../models/object-id.js';
import { findPet } from '../../models/pets.js';
import { fail, ok } from '../../utils/response.js';
import { actorOf } from './caller.js';
import { accountTimeZone, accountToday } from './account-today.js';

const router = Router();

async function prepare(req: Parameters<typeof actorOf>[0], input: MealPlanInput) {
  const ownerId = actorOf(req).id;
  const pet = await findPet(ownerId, new ObjectId(input.petId));
  if (!pet) return null;
  const today = await accountToday(req);
  return { ownerId, pet, preview: previewMealPlan(pet, input, today) };
}

router.get('/', async (req, res) => {
  if (!isValidObjectId(req.query.petId)) return fail(res, 400, 'Choose a pet');
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(req.query.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  return ok(res, { plans: await listMealPlans(ownerId, petId) });
});

router.post('/preview', validate(mealPlanInputSchema), async (req, res) => {
  const data = await prepare(req, req.body as MealPlanInput);
  if (!data) return fail(res, 404, 'Pet not found');
  return ok(res, { preview: data.preview });
});

router.post('/', validate(mealPlanInputSchema), async (req, res) => {
  const input = req.body as MealPlanInput;
  const data = await prepare(req, input);
  if (!data) return fail(res, 404, 'Pet not found');
  if (data.preview.blockers.length) return fail(res, 400, data.preview.blockers.join(' '));
  const plan = await saveMealPlan(
    data.ownerId,
    new ObjectId(input.petId),
    input,
    data.preview,
    data.pet.name,
    input.weightKg,
    await accountTimeZone(req),
  );
  return res.status(201).json({ plan });
});

router.get('/:id/logs', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Plan not found');
  const ownerId = actorOf(req).id;
  const plan = await findMealPlan(ownerId, new ObjectId(req.params.id));
  if (!plan) return fail(res, 404, 'Plan not found');
  const date = req.query.date;
  if (typeof date !== 'string' || !validCalendarDay(date)) {
    return fail(res, 400, 'Choose a date');
  }
  return ok(res, { logs: await listFeedingLogs(ownerId, new ObjectId(plan.id), date) });
});

router.put('/:id/logs', validate(feedingLogInputSchema), async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Plan not found');
  const ownerId = actorOf(req).id;
  const plan = await findMealPlan(ownerId, new ObjectId(req.params.id));
  if (!plan) return fail(res, 404, 'Plan not found');
  const input = req.body as import('@vetify/planner-shared/meal-plans').FeedingLogInput;
  if (input.mealIndex >= plan.mealTimes.length) return fail(res, 400, 'Choose a planned meal');
  if (input.date > (await accountToday(req))) return fail(res, 400, 'Cannot log a future meal');
  if (
    input.date < todayInTimeZone(plan.timeZone, new Date(plan.activeFrom)) ||
    (plan.endedAt && input.date > todayInTimeZone(plan.timeZone, new Date(plan.endedAt)))
  ) {
    return fail(res, 400, 'The plan was not active on this date');
  }
  const log = await saveFeedingLog(ownerId, new ObjectId(plan.id), input);
  return ok(res, { log });
});

export default router;
