// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  values: new Map<string, string>(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: storage.getItem, setItem: storage.setItem },
}));
import { useSelectedPet } from './use-selected-pet';

function pet(id: string, name: string): Pet {
  return {
    id,
    name,
    species: 'dog',
    otherSpecies: '',
    breed: '',
    birthMonth: null,
    ageYearsAtReference: 3,
    ageMonthsAtReference: 0,
    registeredOn: '2026-10-10',
    ageReferenceOn: '2026-10-10',
    sex: 'male',
    neuterStatus: 'yes',
    weightKg: 6,
    allergies: [],
    healthConditions: [],
    foodPreferences: '',
    currentFood: '',
    activityLevel: 'moderate',
    bodyConditionScore: null,
    feedingGoal: 'maintain',
    pregnantOrNursing: 'no',
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
  };
}
const milo = pet('pet-a', 'Milo');
const luna = pet('pet-b', 'Luna');
const ownedPets = [milo, luna];

beforeEach(() => {
  storage.values.clear();
  storage.getItem
    .mockReset()
    .mockImplementation(async (key: string) => storage.values.get(key) ?? null);
  storage.setItem.mockReset().mockImplementation(async (key: string, value: string) => {
    storage.values.set(key, value);
  });
});
afterEach(cleanup);

describe('selected pet storage', () => {
  it('waits for owner-scoped storage before restoring an owned pet', async () => {
    let finish!: (value: string) => void;
    storage.getItem.mockReturnValueOnce(new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useSelectedPet('owner-a', ownedPets));
    expect(result.current.ready).toBe(false);
    expect(result.current.selectedPet).toBeUndefined();
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith('selected-pet:owner-a');
    await act(async () => finish(luna.id));
    expect(result.current.ready).toBe(true);
    expect(result.current.selectedPet).toBe(luna);
  });

  it.each(['deleted-pet', 'another-owner-pet'])(
    'rejects stored %s and refuses to select a pet outside the owned list',
    async (storedId) => {
      storage.values.set('selected-pet:owner-a', storedId);
      const { result } = renderHook(() => useSelectedPet('owner-a', ownedPets));
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.selectedPet).toBe(milo);
      act(() => result.current.selectPet(pet(storedId, 'Foreign pet')));
      expect(result.current.selectedPet).toBe(milo);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it('persists a chosen pet under its owner and hides that selection when the account changes', async () => {
    const otherPet = pet('owner-b-pet', 'Ollie');
    storage.values.set('selected-pet:owner-b', otherPet.id);
    const { result, rerender } = renderHook(({ ownerId, pets }) => useSelectedPet(ownerId, pets), {
      initialProps: { ownerId: 'owner-a', pets: ownedPets },
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.selectPet(luna));
    await waitFor(() => expect(storage.values.get('selected-pet:owner-a')).toBe(luna.id));
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith('selected-pet:owner-a', luna.id);

    rerender({ ownerId: 'owner-b', pets: [otherPet] });
    expect(result.current.ready).toBe(false);
    expect(result.current.selectedPet).toBeUndefined();
    await waitFor(() => expect(result.current.selectedPet).toBe(otherPet));
    expect(storage.values.get('selected-pet:owner-a')).toBe(luna.id);
    expect(storage.getItem).toHaveBeenLastCalledWith('selected-pet:owner-b');
  });

  it('ignores a previous owner storage read that resolves after switching accounts', async () => {
    let finishOldRead!: (value: string) => void;
    const otherPet = pet('owner-b-pet', 'Ollie');
    storage.getItem
      .mockReturnValueOnce(new Promise<string>((resolve) => (finishOldRead = resolve)))
      .mockResolvedValueOnce(otherPet.id);
    const { result, rerender } = renderHook(({ ownerId, pets }) => useSelectedPet(ownerId, pets), {
      initialProps: { ownerId: 'owner-a', pets: ownedPets },
    });
    rerender({ ownerId: 'owner-b', pets: [otherPet] });
    await waitFor(() => expect(result.current.selectedPet).toBe(otherPet));
    await act(async () => finishOldRead(luna.id));
    expect(result.current.ready).toBe(true);
    expect(result.current.selectedPet).toBe(otherPet);
  });

  it('retains the stored selection while the owned pet query is loading', async () => {
    storage.values.set('selected-pet:owner-a', luna.id);
    const initialProps: { pets: Pet[] | undefined } = { pets: undefined };
    const { result, rerender } = renderHook(
      ({ pets }: { pets: Pet[] | undefined }) => useSelectedPet('owner-a', pets),
      { initialProps },
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.selectedPet).toBeUndefined();
    rerender({ pets: ownedPets });
    expect(result.current.selectedPet).toBe(luna);
    rerender({ pets: [milo] });
    expect(result.current.selectedPet).toBe(milo);
  });

  it('continues with an owned pet when storage is unavailable', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('Storage unavailable'));
    const { result } = renderHook(() => useSelectedPet('owner-a', ownedPets));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.selectedPet).toBe(milo);
  });

  it('serializes rapid selection writes so an older write cannot overwrite the latest pet', async () => {
    let finishFirstWrite!: () => void;
    storage.setItem.mockImplementationOnce(
      (key: string, value: string) =>
        new Promise<void>((resolve) => {
          finishFirstWrite = () => {
            storage.values.set(key, value);
            resolve();
          };
        }),
    );
    const { result } = renderHook(() => useSelectedPet('owner-a', ownedPets));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.selectPet(luna));
    await waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    act(() => result.current.selectPet(milo));
    expect(result.current.selectedPet).toBe(milo);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await act(async () => finishFirstWrite());
    await waitFor(() => expect(storage.values.get('selected-pet:owner-a')).toBe(milo.id));
    expect(storage.setItem).toHaveBeenNthCalledWith(2, 'selected-pet:owner-a', milo.id);
  });
});
