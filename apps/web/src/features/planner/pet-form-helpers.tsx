import { accountToday } from '@/auth/session';
import type { FormValues } from './pet-form-values';
import { estimatedBirthMonthFromAge } from '@vetify/planner-shared/pet-age';
export const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-hidden transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

export const toList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

export const capitalizeFirstLetter = (value: string) =>
  value.replace(/\p{L}/u, (letter) => letter.toUpperCase());

export const capitalizeListEntries = (value: string) =>
  value.replace(
    /(^|[,\n])(\s*)(\p{L})/gu,
    (_, separator, spaces, letter: string) => `${separator}${spaces}${letter.toUpperCase()}`,
  );

export function birthMonthForAge(value: string, unit: FormValues['ageUnit']): string {
  if (!value.trim()) return '';
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > (unit === 'years' ? 200 : 2411)) return '';
  return estimatedBirthMonthFromAge(
    unit === 'years' ? age : 0,
    unit === 'months' ? age : 0,
    accountToday(),
  );
}

export function RequiredMarker({ show }: { show: boolean }) {
  return show ? (
    <span aria-hidden="true" className="text-red-600">
      {' '}
      *
    </span>
  ) : null;
}

export function OptionalMarker() {
  return <span className="ml-1 text-xs font-normal text-slate-500">(Optional)</span>;
}

export const provided = (value: string) => value.trim() || 'Not provided';

export const optionLabel = (value: string) => capitalizeFirstLetter(value.replaceAll('_', ' '));

export function birthMonthLabel(value: string, estimated: boolean): string {
  if (!value) return 'Not provided';
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return estimated ? `${label} (estimated)` : label;
}

export function ageLabel(form: FormValues): string {
  if (form.ageValue === '') return 'Not provided';
  const age = Number(form.ageValue);
  if (form.ageUnit === 'months') return `${age} ${age === 1 ? 'month' : 'months'}`;
  const years = `${age} ${age === 1 ? 'year' : 'years'}`;
  return form.ageRemainderMonths
    ? `${years}, ${form.ageRemainderMonths} ${form.ageRemainderMonths === 1 ? 'month' : 'months'}`
    : years;
}
