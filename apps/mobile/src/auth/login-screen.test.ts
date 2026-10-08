// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: 'div',
  Text: 'span',
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock('../components/ui', () => ({
  Button: 'button',
  Card: 'div',
  colors: {},
  ErrorMessage: ({ message }: { message: string }) =>
    createElement('p', { role: 'alert' }, message),
}));
vi.mock('./main-auth', () => ({ login: vi.fn() }));
import { LoginScreen } from './login-screen';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('shows the newest connection error when another QR fails on the open screen', () => {
  vi.stubGlobal('__DEV__', false);
  const onSignedIn = vi.fn();
  const { rerender } = render(
    createElement(LoginScreen, { onSignedIn, initialError: 'Connection code expired.' }),
  );
  expect(screen.getByRole('alert').textContent).toBe('Connection code expired.');
  rerender(createElement(LoginScreen, { onSignedIn, initialError: 'Account access blocked.' }));
  expect(screen.getByRole('alert').textContent).toBe('Account access blocked.');
  expect(screen.queryByRole('button')).toBeNull();
});
