// @vitest-environment jsdom
import {
  createElement,
  useImperativeHandle,
  type ChangeEvent,
  type FocusEventHandler,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), social: vi.fn() }));
const keyboard = vi.hoisted(() => ({
  shownListeners: new Set<() => void>(),
  scrollInput: vi.fn(),
}));

vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Text: ({ children }: { children: ReactNode }) => createElement('span', {}, children),
  Pressable: ({
    accessibilityLabel,
    accessibilityState,
    disabled,
    onPress,
    children,
  }: {
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; checked?: boolean };
    disabled?: boolean;
    onPress: () => void;
    children: ReactNode;
  }) =>
    createElement(
      'button',
      {
        'aria-label': accessibilityLabel,
        'aria-pressed': accessibilityState?.checked,
        disabled: disabled || accessibilityState?.disabled,
        onClick: onPress,
      },
      children,
    ),
  KeyboardAvoidingView: ({ children }: { children: ReactNode }) =>
    createElement('div', {}, children),
  ScrollView: ({
    children,
    ref,
  }: {
    children: ReactNode;
    ref?: Ref<{ scrollResponderScrollNativeHandleToKeyboard: typeof keyboard.scrollInput }>;
  }) => {
    useImperativeHandle(ref, () => ({
      scrollResponderScrollNativeHandleToKeyboard: keyboard.scrollInput,
    }));
    return createElement('div', {}, children);
  },
  TextInput: ({
    ref,
    accessibilityLabel,
    value,
    onChangeText,
    secureTextEntry,
    editable,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    returnKeyType,
    submitBehavior,
    onFocus,
    onBlur,
    onSubmitEditing,
  }: {
    ref?: Ref<HTMLInputElement>;
    accessibilityLabel: string;
    value: string;
    onChangeText: (value: string) => void;
    secureTextEntry?: boolean;
    editable?: boolean;
    keyboardType?: string;
    autoCapitalize?: string;
    autoCorrect?: boolean;
    returnKeyType?: string;
    submitBehavior?: string;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onSubmitEditing?: () => void;
  }) =>
    createElement('input', {
      ref,
      'aria-label': accessibilityLabel,
      value,
      type: secureTextEntry ? 'password' : 'text',
      disabled: editable === false,
      'data-keyboard': keyboardType,
      'data-capitalize': autoCapitalize,
      'data-correct': String(autoCorrect),
      'data-return-key': returnKeyType,
      onFocus,
      onBlur,
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChangeText(event.currentTarget.value),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        if (submitBehavior === 'blurAndSubmit') event.currentTarget.blur();
        onSubmitEditing?.();
      },
    }),
  Keyboard: {
    addListener: (event: string, listener: () => void) => {
      if (event === 'keyboardDidShow') keyboard.shownListeners.add(listener);
      return { remove: () => keyboard.shownListeners.delete(listener) };
    },
  },
  Platform: { OS: 'android' },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock('react-native-svg', () => ({
  default: ({ children }: { children: ReactNode }) =>
    createElement('span', { 'aria-hidden': true }, children),
  Path: () => null,
  Circle: () => null,
}));
vi.mock('../components/ui', () => ({
  ErrorMessage: ({ message }: { message: string }) =>
    message ? createElement('p', { role: 'alert' }, message) : null,
}));
vi.mock('./main-auth', () => auth);
vi.mock('./social-auth', () => ({ loginWithSocial: auth.social }));
import { LoginScreen } from './login-screen';
import { ApiError } from '../services/api-error';

beforeEach(() => {
  auth.login.mockReset().mockResolvedValue({});
  auth.signup.mockReset().mockResolvedValue({});
  auth.social.mockReset().mockResolvedValue(true);
  keyboard.shownListeners.clear();
  keyboard.scrollInput.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function enter(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function pressKeyboardReturn(label: string) {
  fireEvent.keyDown(screen.getByLabelText(label), { key: 'Enter', code: 'Enter' });
}

it.each([true, false])(
  'offers login, signup and social buttons when development is %s',
  (development) => {
    vi.stubGlobal('__DEV__', development);
    render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
    expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeTruthy();
    expect(screen.queryByText('Demo Owner')).toBeNull();
    expect(screen.queryByText('Second Owner')).toBeNull();
    expect(screen.queryByText('A little care, every meal.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Facebook' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'TikTok' })).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('Email').getAttribute('data-keyboard')).toBe('email-address');
    expect(screen.getByLabelText('Email').getAttribute('data-capitalize')).toBe('none');
    expect(screen.getByLabelText('Email').getAttribute('data-correct')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  },
);

it('shows the newest connection error when another QR fails on the open screen', () => {
  const onSignedIn = vi.fn();
  const { rerender } = render(
    createElement(LoginScreen, { onSignedIn, initialError: 'Connection code expired.' }),
  );
  expect(screen.getByRole('alert').textContent).toBe('Connection code expired.');
  rerender(createElement(LoginScreen, { onSignedIn, initialError: 'Account access blocked.' }));
  expect(screen.getByRole('alert').textContent).toBe('Account access blocked.');
  expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
});

it('logs in with the entered credentials and reports success once', async () => {
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', ' owner@example.com ');
  enter('Password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(auth.login).toHaveBeenCalledExactlyOnceWith({
    email: 'owner@example.com',
    password: 'MyPassword1!',
  });
  expect(auth.signup).not.toHaveBeenCalled();
});

it('shows incorrect credential errors without treating the user as signed in', async () => {
  auth.login.mockRejectedValueOnce(new Error('Invalid email or password.'));
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'owner@example.com');
  enter('Password', 'WrongPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Invalid email or password.'),
  );
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Log in' }).hasAttribute('disabled')).toBe(false);
});

it('asks an unregistered user to create an account before logging in', async () => {
  auth.login.mockRejectedValueOnce(new ApiError(401, 'Invalid credentials', 'account-not-found'));
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'new@example.com');
  enter('Password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Create an account first to use the app.'),
  );
  expect(onSignedIn).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByLabelText('Name')).toBeTruthy();
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('new@example.com');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps connection failures readable and allows login to be retried', async () => {
  const message = 'Cannot connect to Vetify. Check your connection and try again.';
  auth.login.mockRejectedValueOnce(new ApiError(0, message, 'network-unreachable'));
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'owner@example.com');
  enter('Password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message));
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(screen.queryByText('Create an account first to use the app.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Log in' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledExactlyOnceWith());
  expect(auth.login).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('registers a shared account and clears passwords when switching forms', async () => {
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'new@example.com');
  enter('Password', 'OldPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('new@example.com');
  enter('Name', ' New Owner ');
  enter('Password', 'MyPassword1!');
  enter('Confirm password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(auth.signup).toHaveBeenCalledExactlyOnceWith({
    name: 'New Owner',
    email: 'new@example.com',
    password: 'MyPassword1!',
    confirmPassword: 'MyPassword1!',
  });
  expect(auth.login).not.toHaveBeenCalled();
});

it('moves through all signup fields with Next and submits once with Done', async () => {
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  enter('Name', 'New Owner');
  enter('Email', 'new@example.com');
  enter('Password', 'MyPassword1!');
  enter('Confirm password', 'MyPassword1!');

  act(() => (screen.getByLabelText('Name') as HTMLInputElement).focus());
  for (const [current, next] of [
    ['Name', 'Email'],
    ['Email', 'Password'],
    ['Password', 'Confirm password'],
  ]) {
    pressKeyboardReturn(current);
    expect(document.activeElement).toBe(screen.getByLabelText(next));
    expect(auth.signup).not.toHaveBeenCalled();
    expect(auth.login).not.toHaveBeenCalled();
  }

  pressKeyboardReturn('Confirm password');
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(auth.signup).toHaveBeenCalledExactlyOnceWith({
    name: 'New Owner',
    email: 'new@example.com',
    password: 'MyPassword1!',
    confirmPassword: 'MyPassword1!',
  });
  expect(auth.login).not.toHaveBeenCalled();
});

it('moves from email to password with Next and logs in once with Done', async () => {
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'owner@example.com');
  enter('Password', 'MyPassword1!');
  act(() => (screen.getByLabelText('Email') as HTMLInputElement).focus());
  pressKeyboardReturn('Email');
  expect(document.activeElement).toBe(screen.getByLabelText('Password'));
  expect(auth.login).not.toHaveBeenCalled();
  pressKeyboardReturn('Password');
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(auth.login).toHaveBeenCalledExactlyOnceWith({
    email: 'owner@example.com',
    password: 'MyPassword1!',
  });
});

it('validates signup confirmation when Done is pressed on the keyboard', () => {
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  enter('Name', 'New Owner');
  enter('Email', 'new@example.com');
  enter('Password', 'MyPassword1!');
  enter('Confirm password', 'AnotherPassword1!');
  pressKeyboardReturn('Confirm password');
  expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
  expect(auth.signup).not.toHaveBeenCalled();
});

it('keeps the focused confirmation field visible when the keyboard opens', async () => {
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  const confirmation = screen.getByLabelText('Confirm password');
  act(() => (confirmation as HTMLInputElement).focus());
  await waitFor(() => expect(keyboard.scrollInput).toHaveBeenCalled());
  keyboard.scrollInput.mockClear();
  act(() => {
    for (const listener of keyboard.shownListeners) listener();
  });
  await waitFor(() => expect(keyboard.scrollInput).toHaveBeenCalled());
  expect(keyboard.scrollInput.mock.calls.at(-1)?.[0]).toBe(confirmation);
});

it('allows revealing passwords and hides them again when switching forms', () => {
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  enter('Password', 'MyPassword1!');
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  expect(screen.getByLabelText('Confirm password').getAttribute('type')).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  expect(screen.queryByLabelText('Confirm password')).toBeNull();
});

it('rejects mismatched password confirmation before submitting registration', () => {
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  enter('Name', 'New Owner');
  enter('Email', 'new@example.com');
  enter('Password', 'MyPassword1!');
  enter('Confirm password', 'AnotherPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
  expect(auth.signup).not.toHaveBeenCalled();
});

it('shows registration errors and allows returning to login', async () => {
  auth.signup.mockRejectedValueOnce(
    new ApiError(409, 'User with that email already exists', 'account-exists'),
  );
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  enter('Name', 'New Owner');
  enter('Email', 'owner@example.com');
  enter('Password', 'MyPassword1!');
  enter('Confirm password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Account already exist. Please login'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(screen.queryByLabelText('Name')).toBeNull();
  expect(screen.queryByLabelText('Confirm password')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
});

it('blocks repeated submissions and editing while login is pending', async () => {
  let finish!: () => void;
  auth.login.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  enter('Email', 'owner@example.com');
  enter('Password', 'MyPassword1!');
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  const pending = screen.getByRole('button', { name: 'Logging in...' });
  expect(pending.hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Sign up' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Facebook' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Google' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'TikTok' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByLabelText('Email').hasAttribute('disabled')).toBe(true);
  fireEvent.click(pending);
  expect(auth.login).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(onSignedIn).toHaveBeenCalledTimes(1);
});

it('shows server field validation messages instead of a generic payload error', async () => {
  auth.signup.mockRejectedValueOnce(
    new ApiError(400, 'Invalid payload', undefined, {
      password: ['Password must include an uppercase letter.', 'Password is too weak.'],
      email: ['Enter a valid email address.'],
    }),
  );
  render(createElement(LoginScreen, { onSignedIn: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  enter('Name', 'New Owner');
  enter('Email', 'invalid');
  enter('Password', 'weakpassword');
  enter('Confirm password', 'weakpassword');
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe(
      'Password must include an uppercase letter.\nEnter a valid email address.',
    ),
  );
});

it.each([
  ['Facebook', 'facebook'],
  ['Google', 'google'],
  ['TikTok', 'tiktok'],
])('signs in with %s without requiring email fields', async (label, provider) => {
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  fireEvent.click(screen.getByRole('button', { name: label }));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(auth.social).toHaveBeenCalledExactlyOnceWith(provider);
  expect(auth.login).not.toHaveBeenCalled();
  expect(auth.signup).not.toHaveBeenCalled();
});

it('keeps the login screen open without an error when social login is cancelled', async () => {
  auth.social.mockResolvedValueOnce(false);
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  fireEvent.click(screen.getByRole('button', { name: 'Google' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Google' }).hasAttribute('disabled')).toBe(false),
  );
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('shows a social sign-in error only after selecting that provider', async () => {
  auth.social.mockRejectedValueOnce(new Error('Google sign in is unavailable.'));
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(auth.social).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Google' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Google sign in is unavailable.'),
  );
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Google' }).hasAttribute('disabled')).toBe(false);
});

it('blocks credentials, registration and other providers while social login is pending', async () => {
  let finish!: (success: boolean) => void;
  auth.social.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  const onSignedIn = vi.fn();
  render(createElement(LoginScreen, { onSignedIn }));
  fireEvent.click(screen.getByRole('button', { name: 'Facebook' }));
  for (const button of screen.getAllByRole('button')) {
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
  }
  expect(screen.getByLabelText('Email').hasAttribute('disabled')).toBe(true);
  expect(auth.social).toHaveBeenCalledTimes(1);
  expect(auth.login).not.toHaveBeenCalled();
  expect(auth.signup).not.toHaveBeenCalled();
  await act(async () => finish(true));
  expect(onSignedIn).toHaveBeenCalledTimes(1);
});
