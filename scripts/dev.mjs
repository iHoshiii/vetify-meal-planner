import { spawn } from 'node:child_process';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { startLocalDatabase } from './dev-database.mjs';
import { localMainApiUrl, resolveMainService, waitForMain } from './dev-main.ts';
import { waitForPlanner } from './dev-readiness.ts';
import { stopChild } from './dev-cleanup.mjs';

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
const children = [];
let stopping = false;
let databaseStartup = Promise.resolve();
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  const childStops = await Promise.allSettled(children.map(stopChild));
  for (const result of childStops) {
    if (result.status === 'rejected') {
      console.error(result.reason.message);
      code = 1;
    }
  }
  try {
    const database = await databaseStartup.catch(() => undefined);
    await database?.stop({ doCleanup: false });
  } catch (error) {
    console.error(error.message);
    code = 1;
  }
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void stop());
if (!web) {
  try {
    const mainService = await resolveMainService(mainApiUrl);
    if (mainService) services.unshift(mainService);
  } catch (error) {
    console.error(error.message);
    await stop(1);
  }
}
if (!stopping && process.argv.includes('--local-db')) {
  databaseStartup = startLocalDatabase((error) => {
    console.error(`[db] ${error.message}`);
    void stop(1);
  });
  try {
    await databaseStartup;
  } catch (error) {
    console.error(error.message);
    await stop(1);
  }
}
for (const service of services) {
  if (stopping) break;
  const child = spawn(process.execPath, [path.resolve(service.args[0]), ...service.args.slice(1)], {
    cwd: path.resolve(service.cwd),
    env: { ...process.env, ...service.env },
    stdio: service.interactive ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.push(child);
  child.stdout?.on('data', (chunk) => process.stdout.write(`[${service.name}] ${chunk}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`[${service.name}] ${chunk}`));
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
  if (service.waitForMain) {
    try {
      await waitForMain(() => stopping, mainApiUrl);
    } catch (error) {
      console.error(error.message);
      await stop(1);
    }
  }
  if (!stopping && service.waitForPlanner) {
    try {
      await waitForPlanner(() => stopping);
    } catch (error) {
      console.error(error.message);
      await stop(1);
    }
  }
}
