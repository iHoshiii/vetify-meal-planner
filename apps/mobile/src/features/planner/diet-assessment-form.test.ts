// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DailyDietAssessment } from '@vetify/planner-shared/daily-diet';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  active: true,
  back: undefined as (() => boolean) | undefined,
  remove: vi.fn(),
}));
vi.mock('../../auth/session', () => ({ accountToday: () => '2026-10-11' }));
vi.mock('../../components/screen-activity', () => ({ useScreenActive: () => native.active }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Text: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) =>
    createElement(
      'span',
      { role: accessibilityRole === 'header' ? 'heading' : accessibilityRole },
      children,
    ),
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
    accessibilityState?: { checked?: boolean; disabled?: boolean };
  }) =>
    createElement(
      'button',
      {
        onClick: onPress,
        disabled: disabled || accessibilityState?.disabled,
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
    maxLength,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    maxLength?: number;
  }) =>
    createElement('input', {
      value,
      'aria-label': accessibilityLabel,
      maxLength,
      onChange: (event: { target: { value: string } }) => onChangeText(event.target.value),
    }),
  Switch: () => null,
  BackHandler: {
    addEventListener: (_event: string, listener: () => boolean) => {
      native.back = listener;
      return { remove: native.remove };
    },
  },
  StyleSheet: { create: <T>(styles: T) => styles },
}));
import { DietAssessmentForm, type DietAssessmentFormProps } from './diet-assessment-form';

const dog = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Milo',
  species: 'dog',
  weightKg: 6.2,
  bodyConditionScore: 5,
  createdAt: '2023-01-01T00:00:00.000Z',
} as Pet;
const cat = {
  ...dog,
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  name: 'Nori',
  species: 'cat',
  weightKg: 4,
} as Pet;
const confirmed: DailyDietAssessment = {
  weightKg: 6.2,
  weightMeasuredOn: '2026-10-10',
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
};
const input = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const answer = (question: string, value: 'Yes' | 'No') =>
  fireEvent.click(screen.getByRole('radio', { name: `${question}: ${value}` }));
function mount(props: Partial<DietAssessmentFormProps> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const initial = { pet: dog, today: '2026-10-11', onSave, onCancel, ...props };
  return {
    ...render(createElement(DietAssessmentForm, initial)),
    onSave,
    onCancel,
    props: initial,
  };
}
function answerAll(values: ['Yes' | 'No', 'Yes' | 'No', 'Yes' | 'No', 'Yes' | 'No', 'Yes' | 'No']) {
  [
    'Weight has been stable',
    'Fully grown',
    'Health concern or food reaction',
    'On a prescribed diet',
    'Recent appetite change',
  ].forEach((question, index) => answer(question, values[index]));
}

beforeEach(() => {
  vi.clearAllMocks();
  native.active = true;
  native.back = undefined;
});
afterEach(cleanup);

it('prefills an owner-reported weight/date without treating legacy condition score or profile creation as measurements', () => {
  mount({ today: '2026-10-09' });
  expect(input('Weight, kg').value).toBe('6.2');
  expect(input('Date weighed').value).toBe('2026-10-09');
  expect(input('Body condition, 1 to 9 (optional)').value).toBe('');
  expect(screen.getByRole('heading', { name: 'Daily target' })).toBeTruthy();
  click('Next');
  const radios = screen.getAllByRole('radio');
  expect(radios).toHaveLength(10);
  expect(radios.every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true);
});

it('requires all five explicit screening reports before saving', () => {
  const { onSave } = mount();
  click('Next');
  click('Save assessment');
  expect(screen.getByRole('alert').textContent).toBe('Please answer all five health questions.');
  expect(onSave).not.toHaveBeenCalled();
  answer('Weight has been stable', 'Yes');
  click('Save assessment');
  expect(onSave).not.toHaveBeenCalled();
  answerAll(['Yes', 'Yes', 'No', 'No', 'No']);
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    ...confirmed,
    weightMeasuredOn: '2026-10-11',
    conditionScore: null,
  });
});

it('saves measured values and maps an explicit fully-grown answer to the inverse growing flag', () => {
  const { onSave } = mount();
  fireEvent.change(input('Weight, kg'), { target: { value: '6.4' } });
  fireEvent.change(input('Date weighed'), { target: { value: '2026-10-08' } });
  fireEvent.change(input('Body condition, 1 to 9 (optional)'), { target: { value: '4' } });
  click('Next');
  answerAll(['Yes', 'Yes', 'No', 'No', 'No']);
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    ...confirmed,
    weightKg: 6.4,
    weightMeasuredOn: '2026-10-08',
    conditionScore: 4,
  });
});

it('preserves concerning reports and out-of-healthy-range scores for review instead of silently marking the pet healthy', () => {
  const { onSave } = mount();
  fireEvent.change(input('Body condition, 1 to 9 (optional)'), { target: { value: '8' } });
  click('Next');
  answerAll(['No', 'No', 'Yes', 'Yes', 'Yes']);
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    weightKg: 6.2,
    weightMeasuredOn: '2026-10-11',
    conditionScore: 8,
    stableWeight: false,
    growing: true,
    healthConcern: true,
    prescribedDiet: true,
    appetiteChange: true,
  });
});

it.each([
  ['Weight, kg', '', 'Enter a weight greater than 0 and no more than 500 kg.'],
  ['Weight, kg', '0', 'Enter a weight greater than 0 and no more than 500 kg.'],
  ['Weight, kg', '501', 'Enter a weight greater than 0 and no more than 500 kg.'],
  ['Date weighed', '2026-02-30', 'Enter a real measurement date (YYYY-MM-DD).'],
  ['Date weighed', '2026-10-12', 'The measured date cannot be in the future.'],
  [
    'Body condition, 1 to 9 (optional)',
    '5.5',
    'Use a whole body condition score from 1 to 9, or leave it blank.',
  ],
  [
    'Body condition, 1 to 9 (optional)',
    '10',
    'Use a whole body condition score from 1 to 9, or leave it blank.',
  ],
])('rejects invalid %s input %s before advancing', (field, value, message) => {
  const { onSave } = mount();
  fireEvent.change(input(field), { target: { value } });
  click('Next');
  expect(screen.getByRole('alert').textContent).toBe(message);
  expect(screen.queryByRole('radio')).toBeNull();
  expect(onSave).not.toHaveBeenCalled();
});

it('prefills a saved assessment from explicit reports and lets the owner revise an answer', () => {
  const { onSave } = mount({ assessment: confirmed });
  expect(input('Date weighed').value).toBe('2026-10-10');
  expect(input('Body condition, 1 to 9 (optional)').value).toBe('5');
  click('Next');
  expect(screen.getByRole('radio', { name: 'Fully grown: Yes' }).getAttribute('aria-checked')).toBe(
    'true',
  );
  answer('Recent appetite change', 'Yes');
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({ ...confirmed, appetiteChange: true });
});

it('resets measurement and unanswered report state when the selected pet changes', () => {
  const rendered = mount();
  fireEvent.change(input('Body condition, 1 to 9 (optional)'), { target: { value: '5' } });
  click('Next');
  answer('Weight has been stable', 'Yes');
  rendered.rerender(createElement(DietAssessmentForm, { ...rendered.props, pet: cat }));
  expect(input('Weight, kg').value).toBe('4');
  expect(input('Body condition, 1 to 9 (optional)').value).toBe('');
  click('Next');
  expect(
    screen.getAllByRole('radio').every((radio) => radio.getAttribute('aria-checked') === 'false'),
  ).toBe(true);
  expect(rendered.onSave).not.toHaveBeenCalled();
});

it('requires an explicit cat muscle assessment without assuming a legacy report is normal', () => {
  const { onSave } = mount({ pet: cat, assessment: { ...confirmed, weightKg: 4 } });
  click('Next');
  for (const label of ['Normal', 'Mild loss', 'Moderate loss', 'Severe loss', 'Not sure'])
    expect(
      screen
        .getByRole('radio', { name: `Muscle condition: ${label}` })
        .getAttribute('aria-checked'),
    ).toBe('false');
  click('Save assessment');
  expect(screen.getByRole('alert').textContent).toBe(
    'Choose a muscle condition, or select Not sure.',
  );
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('radio', { name: 'Muscle condition: Normal' }));
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    ...confirmed,
    weightKg: 4,
    muscleCondition: 'normal',
  });
});

it.each([
  ['Mild loss', 'mild-loss'],
  ['Moderate loss', 'moderate-loss'],
  ['Severe loss', 'severe-loss'],
  ['Not sure', 'unknown'],
] as const)('preserves the cat muscle report %s for review', (label, muscleCondition) => {
  const { onSave } = mount({ pet: cat, assessment: { ...confirmed, weightKg: 4 } });
  click('Next');
  fireEvent.click(screen.getByRole('radio', { name: `Muscle condition: ${label}` }));
  click('Save assessment');
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    ...confirmed,
    weightKg: 4,
    muscleCondition,
  });
});

it('prefills a confirmed cat muscle report and prevents changing it while saving', () => {
  const rendered = mount({
    pet: cat,
    assessment: { ...confirmed, weightKg: 4, muscleCondition: 'mild-loss' },
  });
  click('Next');
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Mild loss' }).getAttribute('aria-checked'),
  ).toBe('true');
  rendered.rerender(createElement(DietAssessmentForm, { ...rendered.props, pending: true }));
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Normal' }).hasAttribute('disabled'),
  ).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: 'Muscle condition: Normal' }));
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Mild loss' }).getAttribute('aria-checked'),
  ).toBe('true');
});

it('does not carry a cat muscle answer or editing step to another pet or a dog', () => {
  const rendered = mount({ pet: cat });
  click('Next');
  fireEvent.click(screen.getByRole('radio', { name: 'Muscle condition: Normal' }));
  rendered.rerender(
    createElement(DietAssessmentForm, {
      ...rendered.props,
      pet: { ...cat, id: 'cccccccccccccccccccccccc', name: 'Luna' },
    }),
  );
  expect(input('Weight, kg').value).toBe('4');
  click('Next');
  expect(
    screen.getByRole('radio', { name: 'Muscle condition: Normal' }).getAttribute('aria-checked'),
  ).toBe('false');
  rendered.rerender(createElement(DietAssessmentForm, { ...rendered.props, pet: dog }));
  expect(input('Weight, kg').value).toBe('6.2');
  click('Next');
  expect(screen.queryByRole('radio', { name: 'Muscle condition: Normal' })).toBeNull();
  answerAll(['Yes', 'Yes', 'No', 'No', 'No']);
  click('Save assessment');
  expect(rendered.onSave).toHaveBeenCalledExactlyOnceWith({
    ...confirmed,
    weightMeasuredOn: '2026-10-11',
    conditionScore: null,
  });
});

it('blocks save/cancel navigation while pending and displays a server failure without discarding input', () => {
  const rendered = mount({ assessment: confirmed });
  click('Next');
  rendered.rerender(createElement(DietAssessmentForm, { ...rendered.props, pending: true }));
  for (const label of ['Saving...', 'Back', 'Cancel'])
    expect(screen.getByRole('button', { name: label }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
  act(() => {
    native.back?.();
  });
  expect(rendered.onSave).not.toHaveBeenCalled();
  expect(rendered.onCancel).not.toHaveBeenCalled();
  rendered.rerender(
    createElement(DietAssessmentForm, { ...rendered.props, error: 'Unable to save assessment.' }),
  );
  expect(screen.getByRole('alert').textContent).toBe('Unable to save assessment.');
  expect(
    screen.getByRole('radio', { name: 'Weight has been stable: Yes' }).getAttribute('aria-checked'),
  ).toBe('true');
});

it('handles Android back by returning to measurements before closing the form', () => {
  const { onCancel } = mount();
  click('Next');
  act(() => {
    native.back?.();
  });
  expect(input('Weight, kg')).toBeTruthy();
  expect(onCancel).not.toHaveBeenCalled();
  act(() => {
    native.back?.();
  });
  expect(onCancel).toHaveBeenCalledOnce();
});
