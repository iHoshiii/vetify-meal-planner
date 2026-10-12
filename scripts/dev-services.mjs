import { networkInterfaces } from 'node:os';
import { localMainApiUrl } from './dev-main.ts';
const web = process.argv.includes('--web');
const devClient = process.argv.includes('--dev-client');
if (devClient && process.argv.includes('--go')) {
  console.error('Use either --go or --dev-client, not both.');
  process.exit(1);
}
const mainApiUrl = process.env.MAIN_API_URL ?? localMainApiUrl;
const address =
  process.env.PLANNER_DEV_HOST ??
  Object.values(networkInterfaces())
    .flat()
    .find(
      (entry) =>
        entry?.family === 'IPv4' &&
        !entry.internal &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
    )?.address ??
  '127.0.0.1';
const nativeEnv = web
  ? {}
  : {
      REACT_NATIVE_PACKAGER_HOSTNAME: address,
      EXPO_PUBLIC_PLANNER_API_URL:
        process.env.EXPO_PUBLIC_PLANNER_API_URL ?? `http://${address}:8001/api/v1`,
      EXPO_PUBLIC_MAIN_API_URL:
        process.env.EXPO_PUBLIC_MAIN_API_URL ?? `http://${address}:8000/api/v1`,
    };
const services = [
  ...(web
    ? [
        {
          name: 'auth',
          cwd: '.',
          args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'tools/mock-main/index.ts'],
        },
      ]
    : []),
  {
    name: 'api',
    cwd: '.',
    args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'apps/api/src/index.ts'],
    env: {
      ...(web ? {} : { HOST: '0.0.0.0', AUTH_MODE: 'main', MAIN_API_URL: mainApiUrl }),
      ...(process.argv.includes('--local-db')
        ? { PLANNER_MONGODB_URI: 'mongodb://127.0.0.1:27018/vetify_meal_planner' }
        : {}),
    },
    waitForPlanner: true,
  },
  web
    ? {
        name: 'web',
        cwd: 'apps/web',
        args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'],
      }
    : {
        name: 'mobile',
        cwd: 'apps/mobile',
        args: [
          'node_modules/expo/bin/cli',
          'start',
          process.argv.includes('--tunnel') ? '--tunnel' : '--lan',
          devClient ? '--dev-client' : '--go',
        ],
        env: {
          ...nativeEnv,
          ...(devClient
            ? {}
            : {
                EXPO_NO_REDIRECT_PAGE: '1',
                EXPO_PUBLIC_USE_RN_FETCH: process.env.EXPO_PUBLIC_USE_RN_FETCH ?? '1',
              }),
        },
        interactive: true,
      },
];
if (!web) {
  console.log(`Mobile API: ${nativeEnv.EXPO_PUBLIC_PLANNER_API_URL}`);
  console.log(`Vetify account API: ${nativeEnv.EXPO_PUBLIC_MAIN_API_URL}`);
  console.log(
    devClient
      ? 'Keep your phone and computer on the same Wi-Fi. Open the QR code in the installed Vetify development app.'
      : 'Keep your phone and computer on the same Wi-Fi. Scan the Expo QR code to open the app.',
  );
  if (address === '127.0.0.1')
    console.log('No LAN address found. Set PLANNER_DEV_HOST to your computer Wi-Fi IPv4 address.');
}
export { web, mainApiUrl, services };
