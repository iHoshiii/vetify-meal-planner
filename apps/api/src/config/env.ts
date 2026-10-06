import { z } from 'zod';

const settings = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8001),
  PLANNER_MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27018/vetify_meal_planner'),
  MAIN_API_URL: z.string().url().default('http://127.0.0.1:8002/api/v1'),
  ALLOWED_ORIGINS: z.string().default('http://127.0.0.1:5174'),
  AUTH_MODE: z.enum(['main', 'mock']).default('mock'),
  INTROSPECTION_TIMEOUT_MS: z.coerce.number().int().min(1).max(30000).default(5000),
  AUTH_CACHE_TTL_SECONDS: z.coerce.number().min(0).max(30).default(30),
});

export type ApiConfig = z.infer<typeof settings>;

export function loadConfig(input: Record<string, unknown> = process.env): ApiConfig {
  const config = settings.parse(input);
  const main = new URL(config.MAIN_API_URL);
  const host = main.hostname.toLowerCase().replace(/\.$/, '');
  const loopback =
    /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?)$/i.test(host) ||
    host.endsWith('.localhost') ||
    host.startsWith('[::ffff:7f');
  if (main.username || main.password || main.search || main.hash) {
    throw new Error('MAIN_API_URL must be a versioned API base without credentials or query');
  }
  if (!main.pathname.replace(/\/$/, '').endsWith('/api/v1')) {
    throw new Error('MAIN_API_URL must end with /api/v1');
  }
  if (
    config.NODE_ENV === 'production' &&
    (config.AUTH_MODE === 'mock' || loopback || main.protocol !== 'https:')
  ) {
    throw new Error('Production requires real main authentication over HTTPS');
  }
  if (config.AUTH_MODE === 'mock' && !loopback) {
    throw new Error('Mock main must use a loopback URL');
  }
  return config;
}
