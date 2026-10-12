import { View } from 'react-native';
import { ErrorMessage } from '../components/ui';

import { AuthField } from './auth-field';

import type { LoginForm } from './use-login-form';
import type { AuthKeyboard } from './use-auth-keyboard';
import { styles } from './login-styles';
export function LoginFields({
  form,
  keyboard,
  compact,
}: {
  form: LoginForm;
  keyboard: AuthKeyboard;
  compact: boolean;
}) {
  const {
    mode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    pending,
    error,
    registering,
    submit,
  } = form;
  const { nameInput, emailInput, passwordInput, confirmInput, keepVisible, clearFocus } = keyboard;
  return (
    <View
      style={[styles.fields, compact && styles.compactFields, registering && styles.signupFields]}
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
  );
}
