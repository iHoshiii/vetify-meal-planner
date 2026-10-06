import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const database = await MongoMemoryServer.create();
const children: ChildProcess[] = [];
let stopping = false;
function launch(script: string, cwd: string, env: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, [path.resolve(script)], {
    cwd: path.resolve(cwd),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', ...env },
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => console.error(error.message));
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${script} stopped (${code})`);
      void stop(1);
    }
  });
  return child;
}
launch('tools/mock-main/dist/index.js', '.', { MOCK_MAIN_PORT: '8002' });
launch('apps/api/dist/index.js', '.', {
  PLANNER_MONGODB_URI: database.getUri('planner_e2e'),
  AUTH_MODE: 'mock',
  PORT: '8001',
  ALLOWED_ORIGINS: 'http://127.0.0.1:5174',
  MAIN_API_URL: 'http://127.0.0.1:8002/api/v1',
});
async function ready(url: string) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Retry until the bounded startup deadline.
    }
    await pause(250);
  }
  throw new Error(`Service did not become ready: ${url}`);
}
try {
  await Promise.all([
    ready('http://127.0.0.1:8002/api/v1/health'),
    ready('http://127.0.0.1:8001/api/v1/health'),
  ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not start browser-test services');
  await stop(1);
}
const web = spawn(
  process.execPath,
  [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'],
  {
    cwd: path.resolve('apps/web'),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_MAIN_API_URL: '/main-api/v1',
      VITE_PLANNER_API_URL: '/api/v1',
      VITE_MAIN_LOGIN_URL: 'http://127.0.0.1:8002/login',
    },
    windowsHide: true,
  },
);
children.push(web);
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  await database.stop();
  process.exit(code);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void stop());
