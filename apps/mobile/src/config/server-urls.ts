type Settings = {
  hostUri?: string | null;
  platform: string;
  development: boolean;
  plannerUrl?: string;
  mainUrl?: string;
};
export function resolveServerUrls(settings: Settings) {
  const host = settings.hostUri?.replace(/^\w+:\/\//, '').split(/[/:]/)[0];
  const fallback = host || (settings.platform === 'android' ? '10.0.2.2' : '127.0.0.1');
  function resolve(value: string | undefined, port: number) {
    if (!value && !settings.development)
      throw new Error('Configure the mobile API URLs before building a release.');
    const url = new URL(value || `http://${fallback}:${port}/api/v1`);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error('Mobile API URLs must be HTTP API bases without credentials or queries.');
    if (!settings.development && url.protocol !== 'https:')
      throw new Error('Release mobile API URLs must use HTTPS.');
    if (!url.pathname.replace(/\/$/, '').endsWith('/api/v1'))
      throw new Error('Mobile API URLs must end with /api/v1.');
    return url.href.replace(/\/$/, '');
  }
  return { planner: resolve(settings.plannerUrl, 8001), main: resolve(settings.mainUrl, 8000) };
}
