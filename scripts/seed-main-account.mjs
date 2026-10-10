import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

if (process.env.NODE_ENV === 'production') {
  console.error('Dummy account seeding cannot run in production.');
  process.exitCode = 1;
} else {
  const mainRoot = path.resolve(process.env.PLANNER_MAIN_ROOT ?? '../Vetify');
  const cli = path.join(mainRoot, 'node_modules/tsx/dist/cli.mjs');
  const seed = path.join(mainRoot, 'src/server/scripts/seed-planner-account.ts');
  try {
    await Promise.all([access(cli), access(seed)]);
    const child = spawn(process.execPath, [cli, seed], {
      cwd: mainRoot,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => resolve(code ?? 1));
    });
  } catch {
    console.error(
      'Install the Vetify dependencies and set PLANNER_MAIN_ROOT to its folder with the planner account seed script.',
    );
    process.exitCode = 1;
  }
}
