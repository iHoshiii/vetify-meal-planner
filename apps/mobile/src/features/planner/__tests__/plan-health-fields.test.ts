// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../../../auth/session', () => ({ accountToday: () => '2026-10-12' }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Text: ({ children }: { children: ReactNode }) => createElement('span', {}, children),
  Pressable: ({
    children,
    onPress,
    disabled,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { checked?: boolean };
  }) =>
    createElement(
      'button',
      {
        onClick: onPress,
        disabled,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-checked': accessibilityState?.checked,
      },
      children,
    ),
  TextInput: ({
    value,
    onChangeText,
    accessibilityLabel,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
  }) =>
    createElement('input', {
      value,
      'aria-label': accessibilityLabel,
      onChange: (event: { target: { value: string } }) => onChangeText(event.target.value),
    }),
  Switch: () => null,
  Alert: { alert: vi.fn() },
  Linking: { openURL: vi.fn() },
  StyleSheet: { create: <T>(styles: T) => styles },
}));
import { HealthFields } from '../plan-health-fields';

const cat = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Nori',
  species: 'cat',
} as Pet;
const input: MealPlanInput = {
  requestId: '171bce66-619b-4dd4-a3dc-a2c519351ef6',
  petId: cat.id,
  mode: 'estimate',
  weightKg: 4,
  weightMeasuredOn: '2026-10-12',
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
  food: {
    name: 'Complete adult cat food',
    form: 'dry',
    adequacy: 'complete',
    species: 'cat',
    lifeStage: 'adult',
    calorieBasis: 'kg',
    calories: 3700,
    packageGrams: null,
    labelSource: 'Current package',
    labelCheckedOn: '2026-10-12',
  },
  extrasKcal: 0,
  manualDailyGrams: null,
  mealTimes: ['08:00', '18:00'],
};
afterEach(cleanup);

it('requires an explicit muscle selection for an estimated cat portion and preserves the remaining inputs', () => {
  const set = vi.fn();
  const rendered = render(createElement(HealthFields, { pet: cat, value: input, set }));
  for (const label of ['Normal', 'Mild loss', 'Moderate loss', 'Severe loss', 'Not sure'])
    expect(
      screen
        .getByRole('radio', { name: `Muscle condition: ${label}` })
        .getAttribute('aria-checked'),
    ).toBe('false');
  expect(set).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('radio', { name: 'Muscle condition: Normal' }));
  expect(set).toHaveBeenCalledExactlyOnceWith({ ...input, muscleCondition: 'normal' });
  rendered.rerender(
    createElement(HealthFields, { pet: cat, value: { ...input, muscleCondition: 'normal' }, set }),
  );
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Normal' }).getAttribute('aria-checked'),
  ).toBe('true');
});

it.each([
  ['Mild loss', 'mild-loss'],
  ['Moderate loss', 'moderate-loss'],
  ['Severe loss', 'severe-loss'],
  ['Not sure', 'unknown'],
] as const)(
  'retains the reported cat muscle condition %s instead of replacing it with normal',
  (label, muscleCondition) => {
    const set = vi.fn();
    render(createElement(HealthFields, { pet: cat, value: { ...input, muscleCondition }, set }));
    expect(
      screen
        .getByRole('radio', { name: `Muscle condition: ${label}` })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(set).not.toHaveBeenCalled();
  },
);

it('leaves dog assessment and manual cat schedules unchanged', () => {
  const set = vi.fn();
  const rendered = render(
    createElement(HealthFields, { pet: { ...cat, species: 'dog' }, value: input, set }),
  );
  expect(screen.queryByText('Muscle condition')).toBeNull();
  rendered.rerender(
    createElement(HealthFields, { pet: cat, value: { ...input, mode: 'manual' }, set }),
  );
  expect(screen.queryByText('Muscle condition')).toBeNull();
  expect(set).not.toHaveBeenCalled();
});

it('does not retain another cat muscle assessment when the parent supplies the selected pet inputs', () => {
  const set = vi.fn();
  const rendered = render(
    createElement(HealthFields, { pet: cat, value: { ...input, muscleCondition: 'normal' }, set }),
  );
  const nextCat = { ...cat, id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Luna' };
  rendered.rerender(
    createElement(HealthFields, { pet: nextCat, value: { ...input, petId: nextCat.id }, set }),
  );
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Normal' }).getAttribute('aria-checked'),
  ).toBe('false');
  expect(set).not.toHaveBeenCalled();
});
