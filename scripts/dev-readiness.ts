export async function waitForPlanner(
  stopped: () => boolean,
  apiUrl = 'http://127.0.0.1:8001/api/v1',
  timeoutMs = 35000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !stopped()) {
    try {
      const response = await fetch(`${apiUrl}/health`, {
        signal: AbortSignal.timeout(1500),
        redirect: 'error',
      });
      const value = await response.json();
      if (response.ok && value?.status === 'ok' && value.db === 'connected') return;
    } catch {
      // A watching process can remain alive after its API fails to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    'Planner API did not become ready. Check the [api] error and the planner database. Expo was not started.',
  );
}
