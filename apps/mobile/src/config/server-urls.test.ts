import { describe, expect, it } from 'vitest';
import { resolveServerUrls } from './server-urls';

describe('native server addresses', () => {
  it('uses the Expo computer LAN address rather than phone localhost', () => {
    expect(
      resolveServerUrls({ hostUri: '192.168.1.17:8081', platform: 'ios', development: true }),
    ).toEqual({
      planner: 'http://192.168.1.17:8001/api/v1',
      main: 'http://192.168.1.17:8000/api/v1',
    });
  });
  it('uses the Android emulator host when no Expo address is available', () => {
    expect(resolveServerUrls({ platform: 'android', development: true }).planner).toBe(
      'http://10.0.2.2:8001/api/v1',
    );
  });
  it('keeps independent configured API bases', () => {
    expect(
      resolveServerUrls({
        platform: 'ios',
        development: false,
        plannerUrl: 'https://planner.example/api/v1/',
        mainUrl: 'https://main.example/api/v1',
      }),
    ).toEqual({ planner: 'https://planner.example/api/v1', main: 'https://main.example/api/v1' });
  });
  it('rejects missing or unencrypted release URLs and credentials in a URL', () => {
    expect(() => resolveServerUrls({ platform: 'ios', development: false })).toThrow('Configure');
    expect(() =>
      resolveServerUrls({
        platform: 'ios',
        development: false,
        plannerUrl: 'http://192.168.1.17/api/v1',
        mainUrl: 'https://main.example/api/v1',
      }),
    ).toThrow('HTTPS');
    expect(() =>
      resolveServerUrls({
        platform: 'android',
        development: true,
        plannerUrl: 'https://secret:password@planner.example/api/v1',
      }),
    ).toThrow('credentials');
  });
});
