import type { Pet } from '@vetify/planner-shared/pets';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDrafts } from '../auth/session';
import { initial, storeDraft } from '../features/planner/plan-draft';

const storage = vi.hoisted(() => ({
  values: new Map<string, string>(),
  getItem: vi.fn(),
  getAllKeys: vi.fn(),
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

describe('owner draft clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.values.clear();
    storage.getAllKeys.mockImplementation(async () => [...storage.values.keys()]);
    storage.removeItem.mockImplementation(async (key: string) => {
      storage.values.delete(key);
    });
  });

  it('waits for an unpublished draft write during logout and retains drafts for other owners', async () => {
    const pendingKey = `meal-plan-draft:owner-a:${pet.id}`;
    const savedKey = 'meal-plan-draft:owner-a:saved-pet';
    const otherOwnerKey = `meal-plan-draft:owner-b:${pet.id}`;
    storage.values.set(savedKey, 'saved draft');
    storage.values.set(otherOwnerKey, 'other owner draft');
    let release!: () => void;
    storage.setItem.mockImplementationOnce(
      (key: string, value: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            storage.values.set(key, value);
            resolve();
          };
        }),
    );

    const write = storeDraft(pendingKey, initial(pet));
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const clear = clearDrafts('owner-a');
    await vi.waitFor(() => expect(storage.getAllKeys).toHaveBeenCalledTimes(1));
    expect(storage.removeItem).not.toHaveBeenCalledWith(pendingKey);

    release();
    await Promise.all([write, clear]);

    expect(storage.values.has(pendingKey)).toBe(false);
    expect(storage.values.has(savedKey)).toBe(false);
    expect(storage.values.get(otherOwnerKey)).toBe('other owner draft');
  });
});
