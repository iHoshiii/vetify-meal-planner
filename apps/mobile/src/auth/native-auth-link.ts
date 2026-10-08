import { nativeRedirectUri } from '@vetify/planner-shared/native-auth';

export function parseMainAccountLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const callback = new URL(nativeRedirectUri);
    if (
      url.protocol !== callback.protocol ||
      url.host !== callback.host ||
      url.pathname !== callback.pathname ||
      url.username ||
      url.password ||
      url.hash ||
      [...url.searchParams.keys()].some((key) => key !== 'code') ||
      url.searchParams.getAll('code').length !== 1
    )
      return null;
    const code = url.searchParams.get('code');
    return code && /^[A-Za-z0-9_-]{1,128}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
