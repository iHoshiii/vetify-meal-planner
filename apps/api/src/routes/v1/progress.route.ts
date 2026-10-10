import {
  summarizeMonthlyProgress,
  validProgressMonth,
} from '@vetify/planner-shared/monthly-progress';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { monthlyProgressRecords } from '../../models/monthly-progress.js';
import { isValidObjectId } from '../../models/object-id.js';
import { findPet } from '../../models/pets.js';
import { fail, ok } from '../../utils/response.js';
import { accountTimeZone, accountToday } from './account-today.js';
import { actorOf } from './caller.js';

const router = Router();
router.get('/', async (req, res) => {
  if (!isValidObjectId(req.query.petId)) return fail(res, 400, 'Choose a pet');
  const month = req.query.month;
  if (typeof month !== 'string' || !validProgressMonth(month))
    return fail(res, 400, 'Choose a valid month');
  const today = accountToday(req);
  if (month > today.slice(0, 7)) return fail(res, 400, 'Cannot view a future month');
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(req.query.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  const records = await monthlyProgressRecords(ownerId, petId, month, today);
  return ok(res, {
    progress: summarizeMonthlyProgress({
      petId: petId.toHexString(),
      month,
      today,
      timeZone: accountTimeZone(req),
      ...records,
    }),
  });
});
export default router;
