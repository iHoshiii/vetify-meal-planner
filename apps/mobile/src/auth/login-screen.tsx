import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { useLoginForm } from './use-login-form';
import { useAuthKeyboard } from './use-auth-keyboard';
import { LoginFields } from './login-fields';
import { LoginActions } from './login-actions';
import { styles } from './login-styles';
export function LoginScreen({
  onSignedIn,
  initialError = '',
}: {
  onSignedIn: () => void;
  initialError?: string;
}) {
  const { height } = useWindowDimensions();
  const form = useLoginForm(onSignedIn, initialError);
  const keyboard = useAuthKeyboard();
  const { scroll } = keyboard;
  const { registering } = form;
  const compact = registering || height < 700;
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
        <LoginFields form={form} keyboard={keyboard} compact={compact} />
        <LoginActions form={form} compact={compact} keyboard={keyboard} />
      </View>
    </ScrollView>
  );
}
