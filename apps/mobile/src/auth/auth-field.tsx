import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { authColors } from './auth-theme';

export function AuthField({
  label,
  compact = false,
  inputRef,
  ...input
}: TextInputProps & { label: string; compact?: boolean; inputRef?: Ref<TextInput> }) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.frame,
          compact && styles.compactFrame,
          focused && styles.focused,
          input.editable === false && styles.disabled,
        ]}
      >
        <TextInput
          ref={inputRef}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
          secureTextEntry={input.secureTextEntry && !revealed}
          accessibilityLabel={label}
          placeholderTextColor={authColors.muted}
          onFocus={(event) => {
            setFocused(true);
            input.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
          style={[styles.input, compact && styles.compactInput]}
        />
        {input.secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
            accessibilityState={{ checked: revealed, disabled: input.editable === false }}
            disabled={input.editable === false}
            onPress={() => setRevealed((current) => !current)}
            style={[styles.visibility, compact && styles.compactVisibility]}
          >
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke={authColors.muted}
              strokeWidth={1.8}
              accessible={false}
            >
              <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <Circle cx={12} cy={12} r={3} />
              {revealed ? <Path d="M3 3l18 18" /> : null}
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  compactField: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: authColors.text },
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 8,
    backgroundColor: authColors.surface,
  },
  focused: { borderColor: authColors.primary },
  compactFrame: { minHeight: 46 },
  disabled: { opacity: 0.6 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: authColors.heading,
    fontSize: 16,
  },
  visibility: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  compactInput: { minHeight: 44, paddingVertical: 10 },
  compactVisibility: { minHeight: 44 },
});
