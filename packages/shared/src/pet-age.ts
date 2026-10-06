export type PetAge = { years: number; months: number };

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

function parts(date: string): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number);
  return [year, month, day];
}

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthlyAnniversaries(from: string, through: string, day: number | 'last'): number {
  const [fromYear, fromMonth, fromDay] = parts(from);
  const [endYear, endMonth, endDay] = parts(through);
  let months = (endYear - fromYear) * 12 + endMonth - fromMonth;
  const anniversaryDay =
    day === 'last' ? lastDay(endYear, endMonth) : Math.min(day, lastDay(endYear, endMonth));
  if (endDay < anniversaryDay) months -= 1;
  // At the reference date, the entered age already includes that day.
  if (
    fromDay <
    (day === 'last' ? lastDay(fromYear, fromMonth) : Math.min(day, lastDay(fromYear, fromMonth)))
  ) {
    months += 1;
  }
  return Math.max(0, months);
}

export function ageFromBirthMonth(birthMonth: string, today: string): PetAge {
  const [year, month] = birthMonth.split('-').map(Number);
  const elapsed = monthlyAnniversaries(
    `${year}-${String(month).padStart(2, '0')}-${lastDay(year, month)}`,
    today,
    'last',
  );
  return { years: Math.floor(elapsed / 12), months: elapsed % 12 };
}

export function estimatedBirthMonthFromAge(
  ageYears: number,
  ageMonths: number,
  today: string,
): string {
  const [year, month] = parts(today);
  const birthMonthIndex = year * 12 + month - 1 - ageYears * 12 - ageMonths;
  return `${Math.floor(birthMonthIndex / 12)}-${String((birthMonthIndex % 12) + 1).padStart(
    2,
    '0',
  )}`;
}

export function ageFromEstimate(
  yearsAtReference: number,
  monthsAtReference: number,
  referenceOn: string,
  registeredOn: string,
  today: string,
): PetAge {
  const [, , registeredDay] = parts(registeredOn);
  const elapsed = monthlyAnniversaries(referenceOn, today, registeredDay);
  const total = yearsAtReference * 12 + monthsAtReference + elapsed;
  return { years: Math.floor(total / 12), months: total % 12 };
}

export function petAge(
  pet: {
    birthMonth: string | null;
    ageYearsAtReference: number;
    ageMonthsAtReference: number;
    ageReferenceOn: string;
    registeredOn: string;
  },
  today: string,
): PetAge {
  return pet.birthMonth
    ? ageFromBirthMonth(pet.birthMonth, today)
    : ageFromEstimate(
        pet.ageYearsAtReference,
        pet.ageMonthsAtReference,
        pet.ageReferenceOn,
        pet.registeredOn,
        today,
      );
}
