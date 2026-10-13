import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../components/app-icon';

import { AuthButton } from './auth-button';

import { authColors } from './auth-theme';

import { loginWithSocial } from './social-auth';
import { SocialProviderIcon } from './social-provider-icon';

const providers = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
] as const;
import type { LoginForm } from './use-login-form';
import type { AuthKeyboard } from './use-auth-keyboard';
import { styles } from './login-styles';
export function LoginActions({
  form,
  compact,
  keyboard,
}: {
  form: LoginForm;
  compact: boolean;
  keyboard: AuthKeyboard;
}) {
  const { rememberMe, setRememberMe, pending, registering, submit, authenticate, changeMode } =
    form;
  return (
    <>
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
        style={[styles.submit, compact && styles.compactSubmit, registering && styles.signupSubmit]}
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
                void authenticate(() =>
                  loginWithSocial(provider.id, {
                    rememberMe,
                    intent: registering ? 'signup' : 'login',
                  }),
                )
              }
            />
          </View>
        ))}
      </View>
      <View
        style={[styles.footer, compact && styles.compactFooter, registering && styles.signupFooter]}
      >
        <AuthButton
          label={registering ? 'Log in' : 'Sign up'}
          variant="link"
          disabled={pending}
          onPress={() => {
            keyboard.resetFocus();
            changeMode();
          }}
        />
      </View>
    </>
  );
}
