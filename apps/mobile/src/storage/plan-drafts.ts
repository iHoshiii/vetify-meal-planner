import AsyncStorage from '@react-native-async-storage/async-storage';

const pendingWrites = new Map<string, Promise<void>>();

function queue(key: string, write: () => Promise<void>): Promise<void> {
  const next = (pendingWrites.get(key) ?? Promise.resolve()).catch(() => undefined).then(write);
  pendingWrites.set(key, next);
  return next.finally(() => {
    if (pendingWrites.get(key) === next) pendingWrites.delete(key);
  });
}

export function writePlanDraft(key: string, value: string): Promise<void> {
  return queue(key, () => AsyncStorage.setItem(key, value));
}

export function removePlanDraft(key: string): Promise<void> {
  return queue(key, () => AsyncStorage.removeItem(key));
}

export async function readPlanDraft(key: string): Promise<string | null> {
  await pendingWrites.get(key)?.catch(() => undefined);
  return AsyncStorage.getItem(key);
}

export async function clearPlanDrafts(ownerId: string | undefined): Promise<void> {
  if (!ownerId) return;
  const prefix = `meal-plan-draft:${ownerId}:`;
  const keys = new Set([...pendingWrites.keys()].filter((key) => key.startsWith(prefix)));
  for (const key of [...(await AsyncStorage.getAllKeys()), ...pendingWrites.keys()]) {
    if (key.startsWith(prefix)) keys.add(key);
  }
  await Promise.all([...keys].map(removePlanDraft));
}
