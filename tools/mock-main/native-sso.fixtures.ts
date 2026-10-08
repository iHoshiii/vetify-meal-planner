import request from 'supertest';
import { nativeClientId, nativeRedirectUri } from '@vetify/planner-shared/native-auth';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';

export const handoffBody = {
  clientId: nativeClientId,
  redirectUri: nativeRedirectUri,
};
export const exchangeBody = (code: string) => ({
  code,
  ...handoffBody,
});
export async function signedInMain(now = Date.now) {
  const app = createMockMain(now);
  const browser = request.agent(app);
  const login = await browser
    .post('/api/v1/auth/login')
    .send({ userId: demoUsers[0].id })
    .expect(200);
  const handoff = () => browser.post('/api/v1/auth/native/handoff').send(handoffBody).expect(200);
  const issueCode = async () => new URL((await handoff()).body.url).searchParams.get('code')!;
  const exchange = (code: string) =>
    request(app).post('/api/v1/auth/native/exchange').send(exchangeBody(code));
  return { app, browser, login, handoff, issueCode, exchange };
}
