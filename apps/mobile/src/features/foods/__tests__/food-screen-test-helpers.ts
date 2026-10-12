import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SavedFood } from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { dog } from './food-screen-test-fixtures';
import { afterEach, beforeEach, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  useFoods: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
  addMutate: vi.fn(),
  addReset: vi.fn(),
  randomUUID: vi.fn(),
}));
vi.mock('../../../services/food-queries', () => ({
  useFoods: queries.useFoods,
  useSaveFood: () => ({
    mutate: queries.mutate,
    reset: queries.reset,
    isPending: false,
    error: null,
  }),
}));
vi.mock('../../../services/diet-queries', () => ({
  useAddDietEntry: () => ({
    mutate: queries.addMutate,
    reset: queries.addReset,
    isPending: false,
    error: null,
  }),
}));
vi.mock('expo-crypto', () => ({ randomUUID: queries.randomUUID }));
vi.mock('../../../auth/session', () => ({ accountToday: () => '2026-10-11' }));
vi.mock('../../../components/screen-activity', () => ({ useScreenActive: () => true }));
vi.mock('../../../components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
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
    accessibilityState?: { checked?: boolean; expanded?: boolean; disabled?: boolean };
  }) =>
    createElement(
      'button',
      {
        onClick: onPress,
        disabled: disabled || accessibilityState?.disabled,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-checked': accessibilityState?.checked,
        'aria-expanded': accessibilityState?.expanded,
      },
      children,
    ),
  TextInput: ({
    value,
    onChangeText,
    accessibilityLabel,
    multiline,
    maxLength,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    multiline?: boolean;
    maxLength?: number;
  }) =>
    createElement(multiline ? 'textarea' : 'input', {
      value,
      'aria-label': accessibilityLabel,
      maxLength,
      onChange: (event: { target: { value: string } }) => onChangeText(event.target.value),
    }),
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    createElement('div', { role: 'status', 'aria-label': accessibilityLabel }),
  Switch: () => null,
  Image: () => null,
  Modal: ({ visible, children }: { visible?: boolean; children: ReactNode }) =>
    visible ? createElement('div', {}, children) : null,
  useWindowDimensions: () => ({ width: 1024, height: 768 }),
  BackHandler: { addEventListener: () => ({ remove: () => {} }) },
  Keyboard: { dismiss: vi.fn() },
  StyleSheet: { create: <T>(styles: T) => styles },
}));
import { FoodsScreen } from '../foods-screen';

function library(foods: SavedFood[] = []) {
  queries.useFoods.mockImplementation((petId: string) => ({
    data: {
      foods: foods.filter((item) => item.petId === petId),
      catalog: [...defaultIngredientCatalog],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: queries.refetch,
  }));
}
function mount(pet = dog) {
  return render(foodScreen({ pet }));
}
const input = (name: string) => screen.getByRole('textbox', { name });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  queries.useFoods.mockReset();
  queries.mutate.mockReset();
  queries.reset.mockReset();
  queries.refetch.mockReset();
  queries.addMutate.mockReset();
  queries.addReset.mockReset();
  queries.randomUUID.mockReset();
  queries.randomUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174000');
  library();
});
afterEach(cleanup);

export { queries, library, mount, input, click };
export function foodScreen(props: Parameters<typeof FoodsScreen>[0]) {
  return createElement(FoodsScreen, props);
}
