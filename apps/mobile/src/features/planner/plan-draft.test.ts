import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initial, loadDraft, removeDraft, storeDraft } from './plan-draft';

const storage = vi.hoisted(() => ({
  values: new Map<string, string>(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));

const pet = {
  id: '507f1f77bcf86cd799439011',
  species: 'dog',
  currentFood: '',
  weightKg: 6.2,
} as Pet;
const key = 'owner-a:plan-draft:' + pet.id;

describe('native meal plan drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.values.clear();
    storage.getItem.mockImplementation(
      async (draftKey: string) => storage.values.get(draftKey) ?? null,
    );
    storage.setItem.mockImplementation(async (draftKey: string, value: string) => {
      storage.values.set(draftKey, value);
    });
    storage.removeItem.mockImplementation(async (draftKey: string) => {
      storage.values.delete(draftKey);
    });
  });

  it('restores unfinished dates, food names, and meal times without requiring a valid final plan', async () => {
    const draft = { ...initial(pet), weightKg: 0, weightMeasuredOn: '2026-1', mealTimes: ['08:'] };
    await storeDraft(key, draft);
    expect(await loadDraft(key, pet.id)).toEqual(draft);
    expect(await loadDraft('owner-b:plan-draft:' + pet.id, pet.id)).toBeNull();
  });

  it.each([
    'not json',
    JSON.stringify({ petId: pet.id }),
    JSON.stringify({ ...initial(pet), petId: '507f1f77bcf86cd799439012' }),
  ])('rejects damaged or mismatched drafts: %s', async (stored) => {
    storage.values.set(key, stored);
    expect(await loadDraft(key, pet.id)).toBeNull();
  });

  it('creates a new save request when revising a plan and strips saved metadata', () => {
    const saved = {
      ...initial(pet),
      requestId: 'previous-save-request',
      weightMeasuredOn: '2026-10-01',
      food: { ...initial(pet).food, name: 'Adult food' },
      id: 'saved-plan-id',
    } as MealPlan;
    const revision = initial(pet, saved);
    expect(revision.requestId).not.toBe(saved.requestId);
    expect(revision).not.toHaveProperty('id');
    expect(revision.food).toEqual(saved.food);
  });

  it('clears a saved draft after any write still in progress', async () => {
    let release!: () => void;
    storage.setItem.mockImplementationOnce(
      (draftKey: string, value: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            storage.values.set(draftKey, value);
            resolve();
          };
        }),
    );
    const write = storeDraft(key, initial(pet));
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const clear = removeDraft(key);
    expect(storage.removeItem).not.toHaveBeenCalled();
    release();
    await Promise.all([write, clear]);
    expect(storage.values.has(key)).toBe(false);
  });

  it('retains the latest edit when an older write completes slowly', async () => {
    let release!: () => void;
    storage.setItem.mockImplementationOnce(
      (draftKey: string, value: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            storage.values.set(draftKey, value);
            resolve();
          };
        }),
    );
    const original = initial(pet);
    const firstWrite = storeDraft(key, original);
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const edited = { ...original, extrasKcal: 10 };
    const secondWrite = storeDraft(key, edited);
    release();
    await Promise.all([firstWrite, secondWrite]);
    expect(await loadDraft(key, pet.id)).toEqual(edited);
  });

  it('waits for pending writes when reopening a draft', async () => {
    let release!: () => void;
    storage.setItem.mockImplementationOnce(
      (draftKey: string, value: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            storage.values.set(draftKey, value);
            resolve();
          };
        }),
    );
    const edited = { ...initial(pet), extrasKcal: 15 };
    const write = storeDraft(key, edited);
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const read = loadDraft(key, pet.id);
    expect(storage.getItem).not.toHaveBeenCalled();
    release();
    await write;
    expect(await read).toEqual(edited);
  });
});
