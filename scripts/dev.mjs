import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { networkInterfaces } from 'node:os';

const web = process.argv.includes('--web');
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
        process.env.EXPO_PUBLIC_MAIN_API_URL ?? `http://${address}:8002/api/v1`,
    };
const services = [
  {
    name: 'api',
    cwd: '.',
    args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'apps/api/src/index.ts'],
    env: web ? {} : { HOST: '0.0.0.0' },
  },
  {
    name: 'auth',
    cwd: '.',
    args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'tools/mock-main/index.ts'],
    env: web ? {} : { MOCK_MAIN_HOST: '0.0.0.0' },
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
        args: ['node_modules/expo/bin/cli', 'start', '--lan'],
        env: nativeEnv,
        interactive: true,
      },
];
if (!web) {
  console.log(`Mobile API: ${nativeEnv.EXPO_PUBLIC_PLANNER_API_URL}`);
  console.log(
    'Keep your phone and computer on the same Wi-Fi. Scan the Expo QR code to open the app.',
  );
  if (address === '127.0.0.1')
    console.log('No LAN address found. Set PLANNER_DEV_HOST to your computer Wi-Fi IPv4 address.');
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32' && child.pid) {
      execFile('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    } else child.kill();
  }
  process.exitCode = code;
}
for (const service of services) {
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
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
