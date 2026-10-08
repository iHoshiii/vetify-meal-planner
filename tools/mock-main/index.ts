import { createMockMain } from './app';

const port = Number(process.env.MOCK_MAIN_PORT ?? 8002);
const host = process.env.MOCK_MAIN_HOST ?? '127.0.0.1';
const server = createMockMain().listen(port, host, () => {
  console.log(`Development account service: http://${host}:${port}/api/v1`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
