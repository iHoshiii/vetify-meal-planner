import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage } from '../components/ui';
import { AuthField } from './auth-field';
import { confirmEmail, resendEmail } from './email-verification';
import { logout } from './main-auth';
import type { AuthSession } from './session';

export function EmailVerificationScreen({
  session,
  onConfirmed,
}: {
  session: AuthSession;
  onConfirmed: () => void;
}) {
  const [code, setCode] = useState('');
  const [timing, setTiming] = useState(session.emailVerification);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendAt = Math.max(retryAt, timing ? Date.parse(timing.resendAvailableAt) : 0);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = timing && Date.parse(timing.expiresAt) <= now;
  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to Vetify.');
      if (cause && typeof cause === 'object' && 'status' in cause && cause.status === 429)
        setRetryAt(Date.now() + 60000);
    } finally {
      setPending(false);
    }
  }
  return (
    <View style={{ padding: 24, gap: 18 }}>
      <Text accessibilityRole="header">Confirm your email</Text>
      <Text>
        Enter the six-digit code sent to {session.user.email}. Codes expire after five minutes.
      </Text>
      {timing?.sent === false && (
        <Text>Email delivery is unavailable. Please try resending later.</Text>
      )}
      {expired && <Text>This code expired. Request a new code.</Text>}
      <AuthField
        label="Confirmation code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        editable={!pending}
      />
      <ErrorMessage message={error} />
      {!!error && <Button label="Try again" disabled={pending} onPress={onConfirmed} />}
      <Button
        label="Confirm email"
        disabled={pending || code.length !== 6 || !!expired}
        onPress={() =>
          void run(async () => {
            await confirmEmail(code);
            onConfirmed();
          })
        }
      />
      <Button
        label={remaining ? `Resend code in ${remaining}s` : 'Resend code'}
        disabled={pending || remaining > 0}
        onPress={() =>
          void run(async () => {
            setTiming(await resendEmail());
            setCode('');
            setNow(Date.now());
          })
        }
      />
      <Button
        label="Use another account"
        disabled={pending}
        onPress={() =>
          void run(async () => {
            try {
              await logout();
            } finally {
              onConfirmed();
            }
          })
        }
      />
    </View>
  );
}
