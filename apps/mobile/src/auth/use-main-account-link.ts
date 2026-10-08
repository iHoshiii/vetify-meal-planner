import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { parseMainAccountLink } from './native-auth-link';

export function useMainAccountLink() {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const seenCodes = useRef(new Set<string>());
  const clearCode = useCallback(
    (expected: string | null) => setCode((current) => (current === expected ? null : current)),
    [],
  );
  useEffect(() => {
    let active = true;
    let receivedLiveLink = false;
    const accept = (url: string | null) => {
      if (!active) return false;
      const next = parseMainAccountLink(url);
      if (!next) return false;
      if (!seenCodes.current.has(next)) {
        seenCodes.current.add(next);
        setCode(next);
      }
      setReady(true);
      return true;
    };
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (accept(url)) receivedLiveLink = true;
    });
    void Linking.getInitialURL().then(
      (url) => {
        if (!active) return;
        if (!receivedLiveLink) accept(url);
        setReady(true);
      },
      () => {
        if (active) setReady(true);
      },
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return { ready, code, clearCode };
}
