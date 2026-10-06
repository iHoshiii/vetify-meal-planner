import { execFile, spawn } from 'node:child_process';
import path from 'node:path';

const services = [
  { name: 'web', cwd: 'apps/web', args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'] },
  {
    name: 'api',
    cwd: '.',
    args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'apps/api/src/index.ts'],
  },
  {
    name: 'auth',
    cwd: '.',
    args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'tools/mock-main/index.ts'],
  },
];
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
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.push(child);
  child.stdout.on('data', (chunk) => process.stdout.write(`[${service.name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${service.name}] ${chunk}`));
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
