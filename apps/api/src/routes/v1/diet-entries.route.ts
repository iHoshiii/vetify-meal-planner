import { dietEntryInputSchema, type DietEntryInput } from '@vetify/planner-shared/daily-diet';
import { packagedFoodCatalog, type CatalogFood } from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { validCalendarDay } from '@vetify/planner-shared/planner-date';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { validate } from '../../middleware/validate.js';
import {
  createDietEntry,
  deleteDietEntry,
  findDietEntry,
  findDietEntryRequest,
  listDietEntries,
} from '../../models/diet-entries.js';
import { findSavedFood } from '../../models/foods.js';
import { isValidObjectId } from '../../models/object-id.js';
import { findPet } from '../../models/pets.js';
import { fail, ok } from '../../utils/response.js';
import { accountTimeZone, accountToday } from './account-today.js';
import { actorOf } from './caller.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!isValidObjectId(req.query.petId)) return fail(res, 400, 'Choose a pet');
  const date = req.query.date;
  if (typeof date !== 'string' || !validCalendarDay(date) || date > accountToday(req))
    return fail(res, 400, 'Choose a real date that is not in the future.');
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(req.query.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  return ok(res, { entries: await listDietEntries(ownerId, petId, date) });
});

router.post('/', validate(dietEntryInputSchema), async (req, res) => {
  const input = req.body as DietEntryInput;
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(input.petId);
  const pet = await findPet(ownerId, petId);
  if (!pet) return fail(res, 404, 'Pet not found');
  if (input.date > accountToday(req)) return fail(res, 400, 'Cannot add food to a future date.');
  const previous = await findDietEntryRequest(ownerId, input);
  if (previous) return ok(res, { entry: previous }, 201);
  let source: Pick<CatalogFood, 'food' | 'details'> | undefined;
  if (input.source === 'catalog') {
    source = [...defaultIngredientCatalog, ...packagedFoodCatalog].find(
      (food) => food.id === input.foodId,
    );
  } else {
    if (!isValidObjectId(input.foodId)) return fail(res, 400, 'Choose a valid saved food.');
    const saved = await findSavedFood(ownerId, new ObjectId(input.foodId));
    if (!saved || saved.petId !== petId.toHexString()) return fail(res, 404, 'Food not found');
    source = saved;
  }
  if (!source) return fail(res, 404, 'Food not found');
  if (source.food.species !== pet.species)
    return fail(res, 400, 'This food is for a different species.');
  const entry = await createDietEntry(
    ownerId,
    input,
    source.food,
    source.details,
    accountTimeZone(req),
  );
  return ok(res, { entry }, 201);
});

router.delete('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Diet entry not found');
  const ownerId = actorOf(req).id;
  const id = new ObjectId(req.params.id);
  const entry = await findDietEntry(ownerId, id);
  if (!entry) return fail(res, 404, 'Diet entry not found');
  const petId = new ObjectId(entry.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  if (!(await deleteDietEntry(ownerId, petId, id))) return fail(res, 404, 'Diet entry not found');
  return res.status(204).end();
});

export default router;
