import { createMockMain } from './app';

const port = Number(process.env.MOCK_MAIN_PORT ?? 8002);
const server = createMockMain().listen(port, '127.0.0.1', () => {
  console.log(`Local mock main: http://127.0.0.1:${port}/login`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
