import { spawn } from 'node:child_process';
import { expect, it } from 'vitest';

const modulePath = './dev-cleanup.mjs';
const { stopChild } = await import(modulePath);

it('waits for its own running service to terminate before cleanup continues', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  await new Promise<void>((resolve) => child.once('spawn', resolve));
  try {
    await stopChild(child);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    await expect(stopChild(child)).resolves.toBeUndefined();
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
});
