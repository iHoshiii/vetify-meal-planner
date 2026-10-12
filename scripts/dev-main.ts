import { access } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

export const localMainApiUrl = 'http://127.0.0.1:8000/api/v1';

async function accountHealth(apiUrl: string) {
  let response;
  try {
    response = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(1500),
      redirect: 'error',
    });
  } catch {
    return null;
  }
  const value = await response.json().catch(() => null);
  return response.ok && value?.status === 'ok' && value.db === 'connected';
}

async function portAvailable() {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(8000, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

export async function resolveMainService(apiUrl = localMainApiUrl) {
  const healthy = await accountHealth(apiUrl);
  if (healthy) {
    console.log('[auth] Using the running Vetify account service.');
    return null;
  }
  if (healthy === false)
    throw new Error(
      'The Vetify account service is running without a ready database. Check its server.',
    );
  if (apiUrl !== localMainApiUrl)
    throw new Error(
      'The configured Vetify account service is unavailable. Start it before the planner.',
    );
  if (!(await portAvailable()))
    throw new Error('Port 8000 is occupied but the Vetify account service is unavailable.');
  const mainRoot = path.resolve(process.env.PLANNER_MAIN_ROOT ?? '../Vetify');
  const cli = path.join(mainRoot, 'node_modules/tsx/dist/cli.mjs');
  try {
    await access(cli);
    await access(path.join(mainRoot, 'src/server/planner-dev.ts'));
  } catch {
    throw new Error('Install the Vetify dependencies and set PLANNER_MAIN_ROOT to its folder.');
  }
  return {
    name: 'auth',
    cwd: mainRoot,
    args: [cli, 'watch', 'src/server/planner-dev.ts'],
    env: { NODE_ENV: 'development', PORT: '8000' },
    waitForMain: true,
  };
}

export async function waitForMain(stopped: () => boolean, apiUrl = localMainApiUrl) {
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline && !stopped()) {
    if (await accountHealth(apiUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vetify did not become ready. Check its database and server configuration.');
}
