import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { clearPlanDrafts } from '../storage/plan-drafts';
export type AuthUser = { id: string; name: string | null; email: string; role: string };
export type AuthSession = { accessToken: string; user: AuthUser };
let session: AuthSession | null = null;
let timeZone = 'Asia/Manila';
const listeners = new Set<() => void>();

export const getSession = () => session;
export const readAccessToken = () => session?.accessToken ?? null;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function writeSession(next: AuthSession | null) {
  if (next?.user.id !== session?.user.id) timeZone = 'Asia/Manila';
  session = next;
  listeners.forEach((listener) => listener());
}
export function setAccountTimeZone(value: string) {
  timeZone = value;
}
export const accountToday = () => todayInTimeZone(timeZone);
export const draftKey = (petId: string) =>
  `meal-plan-draft:${session?.user.id ?? 'anonymous'}:${petId}`;
export const ownerQueryKey = (...parts: unknown[]) => [
  'owner',
  session?.user.id ?? 'anonymous',
  ...parts,
];
export async function clearDrafts(ownerId: string | undefined) {
  await clearPlanDrafts(ownerId);
}
