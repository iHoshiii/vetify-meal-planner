import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, ErrorMessage, Notice } from '../components/ui';
import { login } from './main-auth';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function signIn(userId: string) {
    setPending(true);
    setError('');
    try {
      await login(userId);
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Vetify</Text>
      <Text style={styles.title}>A little care, every meal.</Text>
      <Text style={styles.subtitle}>
        Plan balanced portions and keep your pet's feeding history in one place.
      </Text>
      <Card>
        <Text style={styles.heading}>
          {__DEV__ ? 'Choose a demo account' : 'Sign in to Vetify'}
        </Text>
        {__DEV__ ? (
          <>
            <Text style={styles.detail}>These accounts keep separate pet and meal data.</Text>
            <Button
              label={pending ? 'Connecting...' : 'Demo Owner'}
              disabled={pending}
              onPress={() => void signIn('000000000000000000000001')}
            />
            <Button
              label="Second Owner"
              disabled={pending}
              variant="secondary"
              onPress={() => void signIn('000000000000000000000002')}
            />
          </>
        ) : (
          <Notice tone="warning">
            Sign-in is currently unavailable. Please contact Vetify support.
          </Notice>
        )}
        <ErrorMessage message={error} />
      </Card>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', gap: 24, padding: 24 },
  brand: { color: colors.primary, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 38, lineHeight: 44, color: colors.ink, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  heading: { color: colors.ink, fontSize: 19, fontWeight: '600' },
  detail: { color: colors.muted, lineHeight: 21 },
});
