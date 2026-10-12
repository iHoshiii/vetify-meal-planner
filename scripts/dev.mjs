import { spawn } from 'node:child_process';
import path from 'node:path';

import { startLocalDatabase } from './dev-database.mjs';
import { resolveMainService, waitForMain } from './dev-main.ts';
import { waitForPlanner } from './dev-readiness.ts';
import { stopChild } from './dev-cleanup.mjs';

import { web, mainApiUrl, services } from './dev-services.mjs';
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
