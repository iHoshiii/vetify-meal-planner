import { petInputSchema, type PetInput } from '@vetify/planner-shared/pets';
import { ageFromBirthMonth } from '@vetify/planner-shared/pet-age';
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { validate } from '../../middleware/validate.js';
import { createPet, listPets, updatePet } from '../../models/pets.js';
import { isValidObjectId } from '../../models/object-id.js';
import { fail, ok } from '../../utils/response.js';
import { actorOf } from './caller.js';
import { accountToday } from './account-today.js';

const router = Router();

router.get('/', async (req, res) => {
  ok(res, { pets: await listPets(actorOf(req).id) });
});

router.post('/', validate(petInputSchema), async (req, res) => {
  const ownerId = actorOf(req).id;
  const today = await accountToday(req);
  const input = req.body as PetInput;
  if (
    input.birthMonth &&
    (input.birthMonth > today.slice(0, 7) || ageFromBirthMonth(input.birthMonth, today).years > 200)
  )
    return fail(res, 400, 'Check the birth month');
  const pet = await createPet(ownerId, input, today);
  res.status(201).json({ pet });
});

router.put('/:id', validate(petInputSchema), async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Pet not found');
  const ownerId = actorOf(req).id;
  const today = await accountToday(req);
  const input = req.body as PetInput;
  if (
    input.birthMonth &&
    (input.birthMonth > today.slice(0, 7) || ageFromBirthMonth(input.birthMonth, today).years > 200)
  )
    return fail(res, 400, 'Check the birth month');
  const pet = await updatePet(ownerId, new ObjectId(req.params.id), input, today);
  if (!pet) return fail(res, 404, 'Pet not found');
  ok(res, { pet });
});

export default router;
