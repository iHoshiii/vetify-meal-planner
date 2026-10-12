import { execFile } from 'node:child_process';

export async function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    let reportExit;
    const exited = new Promise((resolve) => {
      reportExit = resolve;
      child.once('exit', reportExit);
    });
    try {
      await new Promise((resolve, reject) => {
        execFile(
          'taskkill',
          ['/pid', String(child.pid), '/t', '/f'],
          { windowsHide: true, timeout: 5000 },
          (error) => {
            if (error && child.exitCode === null && child.signalCode === null)
              reject(
                new Error(
                  'Could not stop a development service. Close its terminal before restarting.',
                ),
              );
            else resolve();
          },
        );
      });
      await exited;
    } finally {
      child.removeListener('exit', reportExit);
    }
    return;
  }
  await new Promise((resolve) => {
    const deadline = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => {
      clearTimeout(deadline);
      resolve();
    });
    child.kill('SIGTERM');
  });
}
