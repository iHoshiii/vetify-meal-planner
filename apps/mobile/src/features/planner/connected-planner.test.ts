// @vitest-environment jsdom
import { createElement, useState, type ChangeEvent, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  pets: [] as Pet[],
  ownerId: 'owner-a',
  mutations: 0,
  storage: new Map<string, string>(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  dismiss: vi.fn(),
  focus: vi.fn(),
  online: vi.fn(),
  back: new Set<() => boolean>(),
  keyboard: new Map<string, Set<() => void>>(),
  appState: new Set<(state: string) => void>(),
  network: new Set<(state: { isConnected: boolean; isInternetReachable: boolean }) => void>(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: runtime.getItem, setItem: runtime.setItem },
}));
vi.mock('react-native', () => ({
  View: ({ children, style }: { children: ReactNode; style?: { display?: string } }) =>
    createElement('div', { style: { display: style?.display } }, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    createElement('div', { role: 'status', 'aria-label': accessibilityLabel }),
  BackHandler: {
    addEventListener: (_event: string, listener: () => boolean) => {
      runtime.back.add(listener);
      return { remove: () => runtime.back.delete(listener) };
    },
  },
  Keyboard: {
    dismiss: runtime.dismiss,
    addListener: (event: string, listener: () => void) => {
      const listeners = runtime.keyboard.get(event) ?? new Set<() => void>();
      listeners.add(listener);
      runtime.keyboard.set(event, listeners);
      return { remove: () => listeners.delete(listener) };
    },
  },
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      runtime.appState.add(listener);
      return { remove: () => runtime.appState.delete(listener) };
    },
  },
}));
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: (
      listener: (state: { isConnected: boolean; isInternetReachable: boolean }) => void,
    ) => {
      runtime.network.add(listener);
      return () => runtime.network.delete(listener);
    },
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useIsMutating: () => runtime.mutations,
  focusManager: { setFocused: runtime.focus },
  onlineManager: { setOnline: runtime.online },
}));
vi.mock('../../auth/session', () => ({ getSession: () => ({ user: { id: runtime.ownerId } }) }));
vi.mock('../../auth/auth-boundary', () => ({
  usePrincipal: () => ({ region: { timeZone: 'Asia/Manila' } }),
}));
vi.mock('../../services/pet-queries', () => ({
  usePets: () => ({ data: runtime.pets, isPending: false, error: null, refetch: vi.fn() }),
}));
vi.mock('./use-planner-today', () => ({ usePlannerToday: () => '2026-10-10' }));
vi.mock('../../components/ui', () => ({
  colors: { primary: '#007c72' },
  Notice: ({ children }: { children: ReactNode }) =>
    createElement('div', { role: 'alert' }, children),
}));
vi.mock('../../components/app-header', () => ({
  AppHeader: ({
    pet,
    switchingDisabled,
    onSwitchPet,
    onOpenAccount,
  }: {
    pet?: Pet;
    switchingDisabled: boolean;
    onSwitchPet: () => void;
    onOpenAccount: () => void;
  }) =>
    createElement(
      'header',
      {},
      createElement(
        'button',
        { onClick: onSwitchPet, disabled: switchingDisabled },
        `Switch ${pet?.name ?? 'pet'}`,
      ),
      createElement('button', { onClick: onOpenAccount }, 'Open account'),
    ),
}));
vi.mock('../../components/app-tab-bar', () => ({
  AppTabBar: ({
    value,
    disabled,
    onChange,
  }: {
    value: string;
    disabled: boolean;
    onChange: (tab: string) => void;
  }) =>
    createElement(
      'nav',
      { role: 'tablist' },
      ...['foods', 'tracker', 'progress'].map((tab) =>
        createElement(
          'button',
          {
            key: tab,
            role: 'tab',
            'aria-selected': tab === value,
            disabled,
            onClick: () => onChange(tab),
          },
          tab[0].toUpperCase() + tab.slice(1),
        ),
      ),
    ),
}));
vi.mock('../pets/pet-switcher', () => ({
  PetSwitcher: ({
    visible,
    pets,
    selectedId,
    onClose,
    onManagePets,
    onSelect,
  }: {
    visible: boolean;
    pets: Pet[];
    selectedId?: string;
    onClose: () => void;
    onManagePets: () => void;
    onSelect: (pet: Pet) => void;
  }) =>
    visible
      ? createElement(
          'div',
          { role: 'dialog', 'aria-label': 'Choose a pet' },
          ...pets.map((pet) =>
            createElement(
              'button',
              {
                key: pet.id,
                onClick: () => onSelect(pet),
                'aria-pressed': selectedId === pet.id,
              },
              `Select ${pet.name}`,
            ),
          ),
          createElement('button', { onClick: onClose }, 'Close switcher'),
          createElement('button', { onClick: onManagePets }, 'Manage pets in switcher'),
        )
      : null,
}));
vi.mock('../account/account-screen', () => ({
  AccountScreen: ({
    onOpenPets,
    navigationDisabled,
  }: {
    onOpenPets: () => void;
    navigationDisabled: boolean;
  }) =>
    createElement(
      'section',
      { role: 'region', 'aria-label': 'Account' },
      createElement('button', { onClick: onOpenPets, disabled: navigationDisabled }, 'Manage pets'),
    ),
}));
vi.mock('../pets/pets-screen', () => ({
  PetsScreen: ({ onOpenPet }: { onOpenPet: (pet: Pet) => void }) =>
    createElement(
      'section',
      { role: 'region', 'aria-label': 'Pets' },
      ...runtime.pets.map((pet) =>
        createElement(
          'button',
          {
            key: pet.id,
            onClick: () => onOpenPet(pet),
          },
          `Open ${pet.name}`,
        ),
      ),
    ),
}));
vi.mock('./planner-page', () => ({
  default: function TestPlannerPage({ pet, tab }: { pet: Pet; tab: string }) {
    const [draft, setDraft] = useState('');
    return createElement(
      'section',
      { role: 'region', 'aria-label': `Workspace ${pet.name}` },
      createElement('span', {}, `${pet.name} ${tab}`),
      createElement('input', {
        'aria-label': 'Planner draft',
        value: draft,
        onChange: (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
      }),
    );
  },
}));
import { ConnectedPlanner } from './connected-planner';

function pet(id: string, name: string): Pet {
  return {
    id,
    name,
    species: 'dog',
    otherSpecies: '',
    breed: '',
    birthMonth: null,
    ageYearsAtReference: 3,
    ageMonthsAtReference: 0,
    registeredOn: '2026-10-10',
    ageReferenceOn: '2026-10-10',
    sex: 'male',
    neuterStatus: 'yes',
    weightKg: 6,
    allergies: [],
    healthConditions: [],
    foodPreferences: '',
    currentFood: '',
    activityLevel: 'moderate',
    bodyConditionScore: null,
    feedingGoal: 'maintain',
    pregnantOrNursing: 'no',
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
  };
}
const milo = pet('pet-a', 'Milo');
const luna = pet('pet-b', 'Luna');

beforeEach(() => {
  runtime.ownerId = 'owner-a';
  runtime.pets = [milo, luna];
  runtime.mutations = 0;
  runtime.storage.clear();
  runtime.getItem
    .mockReset()
    .mockImplementation(async (key: string) => runtime.storage.get(key) ?? null);
  runtime.setItem.mockReset().mockImplementation(async (key: string, value: string) => {
    runtime.storage.set(key, value);
  });
  runtime.dismiss.mockClear();
  runtime.focus.mockClear();
  runtime.online.mockClear();
});
afterEach(() => {
  cleanup();
  runtime.back.clear();
  runtime.keyboard.clear();
  runtime.appState.clear();
  runtime.network.clear();
});

async function mount() {
  const mounted = render(createElement(ConnectedPlanner));
  await waitFor(() => expect(screen.getByRole('region', { name: 'Workspace Milo' })).toBeTruthy());
  return mounted;
}
function back() {
  let handled = false;
  act(() =>
    runtime.back.forEach((listener) => {
      handled = listener() || handled;
    }),
  );
  return handled;
}

describe('mobile pet workspace navigation', () => {
  it('changes every workspace context when switching pets without carrying the previous pet draft', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Planner draft'), { target: { value: 'Milo amount' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Foods' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch Milo' }));
    expect(screen.getByRole('button', { name: 'Select Milo' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Luna' }));
    expect(screen.getByRole('region', { name: 'Workspace Luna' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Workspace Milo' })).toBeNull();
    expect(screen.getByText('Luna foods')).toBeTruthy();
    expect((screen.getByLabelText('Planner draft') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(runtime.storage.get('selected-pet:owner-a')).toBe(luna.id));
    expect(screen.getByRole('button', { name: 'Switch Luna' })).toBeTruthy();
  });

  it('opens Account and returns with Android Back without discarding the current workspace draft', async () => {
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    fireEvent.change(screen.getByLabelText('Planner draft'), {
      target: { value: 'Unsaved Milo draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open account' }));
    expect(screen.getByRole('region', { name: 'Account' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Workspace Milo' })).toBeNull();
    expect(back()).toBe(true);
    expect(screen.queryByRole('region', { name: 'Account' })).toBeNull();
    expect(screen.getByText('Milo progress')).toBeTruthy();
    expect((screen.getByLabelText('Planner draft') as HTMLInputElement).value).toBe(
      'Unsaved Milo draft',
    );
    expect(runtime.dismiss).toHaveBeenCalled();
  });

  it('opens pet management from Account and starts the chosen pet on Tracker', async () => {
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage pets' }));
    expect(screen.getByRole('region', { name: 'Pets' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Luna' }));
    expect(screen.getByRole('region', { name: 'Workspace Luna' })).toBeTruthy();
    expect(screen.getByText('Luna tracker')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Tracker' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('region', { name: 'Pets' })).toBeNull();
  });

  it('prevents pet, tab and back navigation from interrupting an active save', async () => {
    const { rerender } = await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Open account' }));
    runtime.mutations = 1;
    rerender(createElement(ConnectedPlanner));
    expect(screen.getByRole('button', { name: 'Switch Milo' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Manage pets' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('tab', { name: 'Foods' }).hasAttribute('disabled')).toBe(true);
    expect(back()).toBe(true);
    expect(screen.getByRole('region', { name: 'Account' })).toBeTruthy();
    runtime.mutations = 0;
    rerender(createElement(ConnectedPlanner));
    expect(back()).toBe(true);
    expect(screen.getByRole('region', { name: 'Workspace Milo' })).toBeTruthy();
  });

  it('hides the tab bar for the keyboard and restores the selected tab afterward', async () => {
    await mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Foods' }));
    act(() => runtime.keyboard.get('keyboardDidShow')?.forEach((listener) => listener()));
    expect(screen.queryByRole('tablist')).toBeNull();
    act(() => runtime.keyboard.get('keyboardDidHide')?.forEach((listener) => listener()));
    expect(screen.getByRole('tab', { name: 'Foods' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Milo foods')).toBeTruthy();
  });

  it('updates connectivity and focus without replacing the selected pet or its draft', async () => {
    const { unmount } = await mount();
    fireEvent.change(screen.getByLabelText('Planner draft'), {
      target: { value: 'Current pet amount' },
    });
    act(() =>
      runtime.network.forEach((listener) =>
        listener({ isConnected: false, isInternetReachable: false }),
      ),
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'You are offline. Reconnect to save changes.',
    );
    expect(runtime.online).toHaveBeenLastCalledWith(false);
    act(() => runtime.appState.forEach((listener) => listener('background')));
    expect(runtime.focus).toHaveBeenLastCalledWith(false);
    act(() => runtime.appState.forEach((listener) => listener('active')));
    expect(runtime.focus).toHaveBeenLastCalledWith(true);
    expect((screen.getByLabelText('Planner draft') as HTMLInputElement).value).toBe(
      'Current pet amount',
    );
    unmount();
    expect(runtime.network.size).toBe(0);
    expect(runtime.appState.size).toBe(0);
    expect(runtime.keyboard.get('keyboardDidShow')?.size).toBe(0);
  });
});
