import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet } from '@vetify/planner-shared/pets';

export function useSelectedPet(ownerId: string, pets: Pet[] | undefined) {
  const [selection, setSelection] = useState<{ ownerId: string; petId: string | null } | null>(
    null,
  );
  const writes = useRef(Promise.resolve());
  const storageKey = `selected-pet:${ownerId}`;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .catch(() => null)
      .then((petId) => {
        if (active) setSelection({ ownerId, petId });
      });
    return () => {
      active = false;
    };
  }, [ownerId, storageKey]);
  const ready = selection?.ownerId === ownerId;
  const selectedPet = ready
    ? (pets?.find((pet) => pet.id === selection?.petId) ?? pets?.[0])
    : undefined;
  function selectPet(pet: Pet) {
    if (!ready || !pets?.some((owned) => owned.id === pet.id)) return;
    setSelection({ ownerId, petId: pet.id });
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(storageKey, pet.id))
      .catch(() => undefined);
  }
  return { selectedPet, selectPet, ready };
}
