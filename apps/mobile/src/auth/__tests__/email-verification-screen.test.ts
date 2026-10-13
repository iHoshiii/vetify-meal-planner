// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ confirm: vi.fn(), resend: vi.fn(), logout: vi.fn() }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Text: ({ children }: { children: ReactNode }) => createElement('span', {}, children),
}));
vi.mock('../../components/ui', () => ({
  Button: ({
    label,
    disabled,
    onPress,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }) => createElement('button', { disabled, onClick: onPress }, label),
  ErrorMessage: ({ message }: { message: string }) =>
    message ? createElement('div', { role: 'alert' }, message) : null,
}));
vi.mock('../auth-field', () => ({
  AuthField: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
  }) =>
    createElement('input', {
      'aria-label': label,
      value,
      onChange: (event) => onChangeText(event.target.value),
    }),
}));
vi.mock('../email-verification', () => ({
  confirmEmail: mocks.confirm,
  resendEmail: mocks.resend,
}));
vi.mock('../main-auth', () => ({ logout: mocks.logout }));
import { EmailVerificationScreen } from '../email-verification-screen';
const at = Date.parse('2026-10-13T15:00:00Z');
const session = {
  accessToken: 'main-token',
  user: { id: 'id', name: 'Name', email: 'owner@example.test', role: 'user' },
  emailVerification: {
    sent: true,
    expiresAt: new Date(at + 300000).toISOString(),
    resendAvailableAt: new Date(at + 60000).toISOString(),
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(at);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('enforces the 60-second resend delay and clears the previous input after resending', async () => {
  const onConfirmed = vi.fn();
  mocks.resend.mockResolvedValue({
    sent: true,
    expiresAt: new Date(at + 360000).toISOString(),
    resendAvailableAt: new Date(at + 120000).toISOString(),
  });
  render(createElement(EmailVerificationScreen, { session, onConfirmed }));
  expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toHaveProperty(
    'disabled',
    true,
  );
  fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '123456' } });
  act(() => {
    vi.advanceTimersByTime(60000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
  });
  expect(mocks.resend).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Confirmation code')).toHaveProperty('value', '');
  expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toHaveProperty(
    'disabled',
    true,
  );
  expect(onConfirmed).not.toHaveBeenCalled();
});
it('blocks expired-code submission at five minutes', () => {
  render(createElement(EmailVerificationScreen, { session, onConfirmed: vi.fn() }));
  fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '123456' } });
  act(() => {
    vi.advanceTimersByTime(300000);
  });
  expect(screen.getByText('This code expired. Request a new code.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirm email' })).toHaveProperty('disabled', true);
});
it('keeps protected navigation pending until main confirms the code', async () => {
  const onConfirmed = vi.fn();
  mocks.confirm.mockRejectedValueOnce(new Error('The confirmation code is invalid or expired.'));
  render(createElement(EmailVerificationScreen, { session, onConfirmed }));
  fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '012345' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
  });
  expect(screen.getByRole('alert').textContent).toContain('invalid or expired');
  expect(onConfirmed).not.toHaveBeenCalled();
  mocks.confirm.mockResolvedValueOnce(undefined);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
  });
  expect(mocks.confirm).toHaveBeenLastCalledWith('012345');
  expect(onConfirmed).toHaveBeenCalledOnce();
});
