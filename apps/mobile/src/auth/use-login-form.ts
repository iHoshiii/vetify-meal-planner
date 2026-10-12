import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../services/api-error';

import { login, signup } from './main-auth';

const accountErrors: Record<string, string> = {
  'account-not-found': 'Create an account first to use the app.',
  'account-exists': 'Account already exist. Please login',
};

export function useLoginForm(onSignedIn: () => void, initialError: string) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const submitting = useRef(false);
  const registering = mode === 'signup';
  useEffect(() => setError(initialError), [initialError]);
  function changeMode() {
    setMode(registering ? 'login' : 'signup');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setError('');
  }

  function submit() {
    if (submitting.current) return;
    if (!email.trim() || !password || (registering && !name.trim())) {
      setError(
        registering ? 'Enter your name, email, and password.' : 'Enter your email and password.',
      );
      return;
    }
    if (registering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    void authenticate(() =>
      registering
        ? signup({ name: name.trim(), email: email.trim(), password, confirmPassword })
        : login({ email: email.trim(), password }, { rememberMe }),
    );
  }

  async function authenticate(action: () => Promise<unknown>) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      if ((await action()) !== false) onSignedIn();
    } catch (cause) {
      const validation =
        cause instanceof ApiError
          ? Object.values(cause.issues ?? {}).flatMap((messages) => messages?.slice(0, 1) ?? [])
          : [];
      setError(
        validation.join('\n') ||
          (cause instanceof ApiError && accountErrors[cause.reason ?? '']) ||
          (cause instanceof Error ? cause.message : 'Could not sign in. Please try again.'),
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return {
    mode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    pending,
    error,
    registering,
    submit,
    authenticate,
    changeMode,
  };
}
export type LoginForm = ReturnType<typeof useLoginForm>;
