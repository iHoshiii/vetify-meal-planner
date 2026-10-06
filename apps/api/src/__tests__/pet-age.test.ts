import {
  ageFromBirthMonth,
  ageFromEstimate,
  estimatedBirthMonthFromAge,
} from '@vetify/planner-shared/pet-age';
import { describe, expect, it } from 'vitest';

describe('pet age', () => {
  it('estimates a birth month from the entered age', () => {
    expect(estimatedBirthMonthFromAge(2, 0, '2026-10-01')).toBe('2024-10');
    expect(estimatedBirthMonthFromAge(0, 28, '2026-10-01')).toBe('2024-06');
  });

  it('adds a year on the last day of the birth month', () => {
    expect(ageFromBirthMonth('2026-06', '2027-06-29')).toEqual({ years: 0, months: 11 });
    expect(ageFromBirthMonth('2026-06', '2027-06-30')).toEqual({ years: 1, months: 0 });
    expect(ageFromBirthMonth('2024-02', '2025-02-27')).toEqual({ years: 0, months: 11 });
    expect(ageFromBirthMonth('2024-02', '2025-02-28')).toEqual({ years: 1, months: 0 });
  });

  it('uses the registration date when the birth month is unknown', () => {
    expect(ageFromEstimate(2, 0, '2026-09-30', '2026-09-30', '2027-09-29')).toEqual({
      years: 2,
      months: 11,
    });
    expect(ageFromEstimate(2, 0, '2026-09-30', '2026-09-30', '2027-09-30')).toEqual({
      years: 3,
      months: 0,
    });
  });
});
