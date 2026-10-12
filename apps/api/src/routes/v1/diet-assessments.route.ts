import {
  dietAssessmentInputSchema,
  type DietAssessmentInput,
} from '@vetify/planner-shared/daily-diet';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { validate } from '../../middleware/validate.js';
import { findCurrentDietAssessment, saveDietAssessment } from '../../models/diet-assessments.js';
import { isValidObjectId } from '../../models/object-id.js';
import { findPet } from '../../models/pets.js';
import { fail, ok } from '../../utils/response.js';
import { accountTimeZone, accountToday } from './account-today.js';
import { actorOf } from './caller.js';

const router = Router();

router.get('/:petId', async (req, res) => {
  if (!isValidObjectId(req.params.petId)) return fail(res, 404, 'Pet not found');
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(req.params.petId);
  const pet = await findPet(ownerId, petId);
  if (!pet) return fail(res, 404, 'Pet not found');
  return ok(res, {
    assessment: await findCurrentDietAssessment(
      ownerId,
      petId,
      accountToday(req),
      pet,
      accountTimeZone(req),
    ),
  });
});

router.put('/:petId', validate(dietAssessmentInputSchema), async (req, res) => {
  if (!isValidObjectId(req.params.petId)) return fail(res, 404, 'Pet not found');
  const input = req.body as DietAssessmentInput;
  const petId = new ObjectId(req.params.petId);
  if (petId.toHexString() !== new ObjectId(input.petId).toHexString())
    return fail(res, 400, 'Choose the same pet for the assessment.');
  const ownerId = actorOf(req).id;
  const pet = await findPet(ownerId, petId);
  if (!pet) return fail(res, 404, 'Pet not found');
  const today = accountToday(req);
  if (input.weightMeasuredOn > today)
    return fail(res, 400, 'The weight measurement cannot be in the future.');
  const timeZone = accountTimeZone(req);
  const assessment = await saveDietAssessment(ownerId, input, today, timeZone, pet);
  return ok(res, { assessment });
});

export default router;
