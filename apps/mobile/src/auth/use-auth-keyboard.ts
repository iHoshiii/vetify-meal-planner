import { useEffect, useRef, type RefObject } from 'react';
import { Keyboard, Platform, ScrollView, type TextInput } from 'react-native';

export function useAuthKeyboard() {
  const scroll = useRef<ScrollView>(null);
  const nameInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);
  const focusedInput = useRef<RefObject<TextInput | null> | null>(null);
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

  function resetFocus() {
    focusedInput.current = null;
  }
  return {
    scroll,
    nameInput,
    emailInput,
    passwordInput,
    confirmInput,
    keepVisible,
    clearFocus,
    resetFocus,
  };
}
export type AuthKeyboard = ReturnType<typeof useAuthKeyboard>;
