import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
export type AuthUser = { id: string; name: string | null; email: string; role: string };
export type AuthSession = { accessToken: string; user: AuthUser };
let session: AuthSession | null = null;
let timeZone = 'Asia/Manila';
const listeners = new Set<() => void>();

export function getSession() {
  return session;
}
export function readAccessToken() {
  return session?.accessToken ?? null;
}
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function clearDrafts() {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith('meal-plan-draft:')) sessionStorage.removeItem(key);
  }
}
export function writeSession(next: AuthSession | null) {
  if (next?.user.id !== session?.user.id) {
    clearDrafts();
    timeZone = 'Asia/Manila';
  }
  session = next;
  listeners.forEach((listener) => listener());
}
export function setAccountTimeZone(value: string) {
  timeZone = value;
}
export function accountToday() {
  return todayInTimeZone(timeZone);
}
export function draftKey(petId: string) {
  return `meal-plan-draft:${session?.user.id ?? 'anonymous'}:${petId}`;
}
export function ownerQueryKey(...parts: unknown[]) {
  return ['owner', session?.user.id ?? 'anonymous', ...parts];
}
