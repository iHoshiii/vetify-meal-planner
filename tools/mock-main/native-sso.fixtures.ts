import { createHash } from 'node:crypto';
import request from 'supertest';
import { nativeClientId, nativeRedirectUri } from '@vetify/planner-shared/native-auth';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';

export const verifier = 'a'.repeat(43);
export const authorization = {
  client_id: nativeClientId,
  redirect_uri: nativeRedirectUri,
  response_type: 'code',
  state: 'state-bound-to-this-device',
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
};
export const exchangeBody = (code: string) => ({
  code,
  codeVerifier: verifier,
  redirectUri: nativeRedirectUri,
  clientId: nativeClientId,
});
export async function signedInMain(now = Date.now) {
  const app = createMockMain(now);
  const browser = request.agent(app);
  const login = await browser
    .post('/api/v1/auth/login')
    .send({ userId: demoUsers[0].id })
    .expect(200);
  const authorize = () =>
    browser.get('/api/v1/auth/native/authorize').query(authorization).expect(302);
  const issueCode = async () =>
    new URL((await authorize()).headers.location).searchParams.get('code')!;
  const exchange = (code: string) =>
    request(app).post('/api/v1/auth/native/exchange').send(exchangeBody(code));
  return { app, browser, login, authorize, issueCode, exchange };
}
