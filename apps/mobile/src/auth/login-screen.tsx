import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextInput,
} from 'react-native';
import { ErrorMessage } from '../components/ui';
import { AppIcon } from '../components/app-icon';
import { ApiError } from '../services/api-error';
import { AuthButton } from './auth-button';
import { AuthField } from './auth-field';
import { authColors } from './auth-theme';
import { login, signup } from './main-auth';
import { loginWithSocial } from './social-auth';
import { SocialProviderIcon } from './social-provider-icon';

const providers = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
] as const;
const accountErrors: Record<string, string> = {
  'account-not-found': 'Create an account first to use the app.',
  'account-exists': 'Account already exist. Please login',
};

export function LoginScreen({
  onSignedIn,
  initialError = '',
}: {
  onSignedIn: () => void;
  initialError?: string;
}) {
  const { height } = useWindowDimensions();
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
  const compact = registering || height < 700;
  const scroll = useRef<ScrollView>(null);
  const nameInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);
  const focusedInput = useRef<RefObject<TextInput | null> | null>(null);
  useEffect(() => setError(initialError), [initialError]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let frame: number | undefined;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const input = focusedInput.current?.current;
        if (input) scroll.current?.scrollResponderScrollNativeHandleToKeyboard?.(input, 12, true);
      });
    });
    return () => {
      subscription.remove();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);

  function keepVisible(input: RefObject<TextInput | null>) {
    focusedInput.current = input;
    if (Platform.OS !== 'web' && input.current) {
      scroll.current?.scrollResponderScrollNativeHandleToKeyboard?.(input.current, 12, true);
    }
  }

  function clearFocus(input: RefObject<TextInput | null>) {
    if (focusedInput.current === input) focusedInput.current = null;
  }

  function changeMode() {
    focusedInput.current = null;
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

  return (
    <ScrollView
      ref={scroll}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        compact && styles.compactContent,
        registering && styles.signupContent,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.form, compact && styles.compactForm]}>
        <Text
          accessibilityRole="header"
          style={[
            styles.heading,
            compact && styles.compactHeading,
            registering && styles.signupHeading,
          ]}
        >
          {registering ? 'Sign up' : 'Log in'}
        </Text>
        <View
          style={[
            styles.fields,
            compact && styles.compactFields,
            registering && styles.signupFields,
          ]}
        >
          {registering ? (
            <AuthField
              compact={compact}
              inputRef={nameInput}
              onFocus={() => keepVisible(nameInput)}
              onBlur={() => clearFocus(nameInput)}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailInput.current?.focus()}
              label="Name"
              value={name}
              onChangeText={setName}
              editable={!pending}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
          ) : null}
          <AuthField
            compact={compact}
            inputRef={emailInput}
            onFocus={() => keepVisible(emailInput)}
            onBlur={() => clearFocus(emailInput)}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordInput.current?.focus()}
            label="Email"
            value={email}
            onChangeText={setEmail}
            editable={!pending}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="name@example.com"
          />
          <AuthField
            compact={compact}
            inputRef={passwordInput}
            onFocus={() => keepVisible(passwordInput)}
            onBlur={() => clearFocus(passwordInput)}
            returnKeyType={registering ? 'next' : 'done'}
            submitBehavior={registering ? 'submit' : 'blurAndSubmit'}
            onSubmitEditing={registering ? () => confirmInput.current?.focus() : submit}
            key={mode}
            label="Password"
            value={password}
            onChangeText={setPassword}
            editable={!pending}
            secureTextEntry
            autoComplete={registering ? 'new-password' : 'current-password'}
            textContentType={registering ? 'newPassword' : 'password'}
            placeholder="••••••••"
          />
          {registering ? (
            <AuthField
              compact={compact}
              inputRef={confirmInput}
              onFocus={() => keepVisible(confirmInput)}
              onBlur={() => clearFocus(confirmInput)}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={submit}
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!pending}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="••••••••"
            />
          ) : null}
          <ErrorMessage message={error} />
        </View>
        {!registering && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Remember me"
            accessibilityState={{ checked: rememberMe, disabled: pending }}
            disabled={pending}
            onPress={() => setRememberMe((value) => !value)}
            style={styles.remember}
          >
            <View style={[styles.checkbox, rememberMe && styles.checked]}>
              {rememberMe && <AppIcon name="check" size={14} color={authColors.surface} />}
            </View>
            <Text style={styles.rememberLabel}>Remember me</Text>
          </Pressable>
        )}
        <View
          style={[
            styles.submit,
            compact && styles.compactSubmit,
            registering && styles.signupSubmit,
          ]}
        >
          <AuthButton
            compact={compact}
            label={
              pending
                ? registering
                  ? 'Creating account...'
                  : 'Logging in...'
                : registering
                  ? 'Sign up'
                  : 'Log in'
            }
            disabled={pending}
            onPress={submit}
          />
        </View>
        <View
          style={[
            styles.divider,
            compact && styles.compactDivider,
            registering && styles.signupDivider,
          ]}
        >
          <View style={styles.line} />
          <Text style={styles.separator}>or</Text>
          <View style={styles.line} />
        </View>
        <View style={[styles.social, compact && styles.compactSocial]}>
          {providers.map((provider) => (
            <View
              key={provider.id}
              style={provider.id === 'tiktok' ? styles.wideProvider : styles.provider}
            >
              <AuthButton
                compact={compact}
                label={provider.label}
                variant="social"
                icon={<SocialProviderIcon provider={provider.id} />}
                disabled={pending}
                onPress={() =>
                  void authenticate(() => loginWithSocial(provider.id, { rememberMe }))
                }
              />
            </View>
          ))}
        </View>
        <View
          style={[
            styles.footer,
            compact && styles.compactFooter,
            registering && styles.signupFooter,
          ]}
        >
          <AuthButton
            label={registering ? 'Log in' : 'Sign up'}
            variant="link"
            disabled={pending}
            onPress={changeMode}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 32 },
  form: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    padding: 24,
    backgroundColor: authColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    boxShadow: '0px 12px 32px rgba(15, 23, 42, 0.08)',
  },
  heading: {
    color: authColors.heading,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 28,
  },
  fields: { gap: 16 },
  remember: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: authColors.primary, borderColor: authColors.primary },
  rememberLabel: { fontSize: 14, color: authColors.text },
  submit: { marginTop: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: authColors.border },
  separator: { color: authColors.muted, fontSize: 12 },
  social: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  provider: { flexBasis: 0, flexGrow: 1, minWidth: 0 },
  wideProvider: { width: '100%' },
  footer: { marginTop: 20 },
  compactContent: { paddingVertical: 12 },
  compactForm: { padding: 16 },
  compactHeading: { fontSize: 26, marginBottom: 16 },
  compactFields: { gap: 12 },
  compactSubmit: { marginTop: 16 },
  compactDivider: { marginTop: 16, marginBottom: 16 },
  compactSocial: { gap: 8 },
  compactFooter: { marginTop: 8 },
  signupContent: { paddingVertical: 8 },
  signupHeading: { marginBottom: 12 },
  signupFields: { gap: 8 },
  signupSubmit: { marginTop: 12 },
  signupDivider: { marginTop: 12, marginBottom: 12 },
  signupFooter: { marginTop: 4 },
});
