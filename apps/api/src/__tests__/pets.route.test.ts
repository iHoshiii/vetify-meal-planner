import { testConfig, mockFetch, account } from './fixtures.js';
import type { PetInput } from '@vetify/planner-shared/pets';
import { ageFromBirthMonth } from '@vetify/planner-shared/pet-age';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const input: PetInput = {
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: null,
  ageYears: 3,
  ageMonths: 4,
  sex: 'male',
  neuterStatus: 'prefer_not_to_say',
  weightKg: 6.2,
  allergies: ['chicken'],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'unknown',
  bodyConditionScore: null,
  feedingGoal: 'unsure',
  pregnantOrNursing: 'unknown',
};

describe('pet profiles', () => {
  it('derives age from an optional birth month', async () => {
    const token = await account();
    const birthMonth = `${new Date().getFullYear() - 2}-06`;
    const created = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send({ ...input, birthMonth, ageYears: 0, ageMonths: 0 });
    expect(created.status).toBe(201);
    const age = ageFromBirthMonth(birthMonth, created.body.pet.registeredOn);
    expect(created.body.pet.ageYearsAtReference).toBe(age.years);
    expect(created.body.pet.ageMonthsAtReference).toBe(age.months);
  });

  it('allows one account to own multiple pets and edit its own pet', async () => {
    const token = await account();
    const first = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send(input);
    const second = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send({ ...input, name: 'Luna', species: 'cat' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.pet.neuterStatus).toBe('prefer_not_to_say');
    expect(first.body.pet.ageYearsAtReference).toBe(3);
    expect(first.body.pet.registeredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const listed = await request(app).get('/api/v1/pets').auth(token, { type: 'bearer' });
    expect(listed.body.pets.map((pet: { name: string }) => pet.name)).toEqual(['Milo', 'Luna']);

    const edited = await request(app)
      .put(`/api/v1/pets/${first.body.pet.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...input, weightKg: 6.4 });
    expect(edited.status).toBe(200);
    expect(edited.body.pet.weightKg).toBe(6.4);
    expect(edited.body.pet.registeredOn).toBe(first.body.pet.registeredOn);
    expect(edited.body.pet.ageReferenceOn).toBe(first.body.pet.ageReferenceOn);
  });

  it('does not reveal or change another account’s pets', async () => {
    const owner = await account();
    const stranger = await account();
    const created = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send(input);
    const listed = await request(app).get('/api/v1/pets').auth(stranger, { type: 'bearer' });
    expect(listed.body.pets).toEqual([]);
    const edited = await request(app)
      .put(`/api/v1/pets/${created.body.pet.id}`)
      .auth(stranger, { type: 'bearer' })
      .send({ ...input, name: 'Stolen' });
    expect(edited.status).toBe(404);
    expect(
      (await request(app).get('/api/v1/pets').auth(owner, { type: 'bearer' })).body.pets[0].name,
    ).toBe('Milo');
  });

  it('requires weight and age, while allowing no birth month', async () => {
    const token = await account();
    for (const invalid of [
      { ...input, weightKg: undefined },
      { ...input, weightKg: 0 },
      { ...input, weightKg: 100 },
      { ...input, weightKg: 15.1 },
      { ...input, ageYears: undefined },
      { ...input, ageMonths: 12 },
      { ...input, birthMonth: '2099-01' },
    ]) {
      const response = await request(app)
        .post('/api/v1/pets')
        .auth(token, { type: 'bearer' })
        .send(invalid);
      expect(response.status).toBe(400);
    }
  });

  it('requires sign-in', async () => {
    expect((await request(app).get('/api/v1/pets')).status).toBe(401);
  });
});
