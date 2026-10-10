import {
  packagedFoodCatalog,
  savedFoodInputSchema,
  type SavedFoodInput,
} from '@vetify/planner-shared/foods';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { validate } from '../../middleware/validate.js';
import {
  createSavedFood,
  deleteSavedFood,
  findSavedFood,
  listSavedFoods,
  updateSavedFood,
} from '../../models/foods.js';
import { isValidObjectId } from '../../models/object-id.js';
import { findPet } from '../../models/pets.js';
import { fail, ok } from '../../utils/response.js';
import { accountToday } from './account-today.js';
import { actorOf } from './caller.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!isValidObjectId(req.query.petId)) return fail(res, 400, 'Choose a pet');
  const ownerId = actorOf(req).id;
  const petId = new ObjectId(req.query.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  return ok(res, { foods: await listSavedFoods(ownerId, petId), catalog: packagedFoodCatalog });
});

router.post('/', validate(savedFoodInputSchema), async (req, res) => {
  const ownerId = actorOf(req).id;
  const input = req.body as SavedFoodInput;
  const petId = new ObjectId(input.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  if (input.food.labelCheckedOn && input.food.labelCheckedOn > accountToday(req))
    return fail(res, 400, 'The label check date cannot be in the future.');
  const food = await createSavedFood(ownerId, petId, input.food);
  return ok(res, { food }, 201);
});

router.put('/:id', validate(savedFoodInputSchema), async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Food not found');
  const ownerId = actorOf(req).id;
  const input = req.body as SavedFoodInput;
  const petId = new ObjectId(input.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  if (input.food.labelCheckedOn && input.food.labelCheckedOn > accountToday(req))
    return fail(res, 400, 'The label check date cannot be in the future.');
  const food = await updateSavedFood(ownerId, petId, new ObjectId(req.params.id), input.food);
  if (!food) return fail(res, 404, 'Food not found');
  return ok(res, { food });
});

router.delete('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Food not found');
  const ownerId = actorOf(req).id;
  const id = new ObjectId(req.params.id);
  const food = await findSavedFood(ownerId, id);
  if (!food) return fail(res, 404, 'Food not found');
  const petId = new ObjectId(food.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  if (!(await deleteSavedFood(ownerId, petId, id))) return fail(res, 404, 'Food not found');
  return res.status(204).end();
});

export default router;
