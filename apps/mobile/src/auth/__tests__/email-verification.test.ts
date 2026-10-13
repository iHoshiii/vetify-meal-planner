import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), getSession: vi.fn(), writeSession: vi.fn() }));
vi.mock('../native-session-request', () => ({ requestNativeAccount: mocks.request }));
vi.mock('../session', () => ({ getSession: mocks.getSession, writeSession: mocks.writeSession }));
import { confirmEmail, resendEmail } from '../email-verification';

const session = {
  accessToken: 'main-token',
  user: {
    id: 'shared-id',
    name: 'Professional Name',
    email: 'owner@example.test',
    provider: 'local',
    emailVerified: false,
    role: 'professional',
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockReturnValue(session);
});
it('uses the real main verification route and preserves the authoritative professional profile', async () => {
  mocks.request.mockResolvedValue({ user: { ...session.user, emailVerified: true } });
  await confirmEmail('012345');
  expect(mocks.request).toHaveBeenCalledWith('email/verify', { code: '012345' }, 'main-token');
  expect(mocks.writeSession).toHaveBeenCalledWith({
    ...session,
    user: { ...session.user, emailVerified: true },
    emailVerification: undefined,
  });
});
it('rejects a pending confirmation after switching accounts', async () => {
  let release!: (value: unknown) => void;
  mocks.request.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const pending = confirmEmail('012345');
  mocks.getSession.mockReturnValue({ ...session, user: { ...session.user, id: 'other-account' } });
  release({ user: { ...session.user, emailVerified: true } });
  await expect(pending).rejects.toMatchObject({ status: 401 });
  expect(mocks.writeSession).not.toHaveBeenCalled();
});
it.each(['12345', '1234567', 'abcdef', '１２３４５６'])(
  'rejects invalid six-digit input %s',
  async (code) => {
    await expect(confirmEmail(code)).rejects.toMatchObject({ status: 400 });
    expect(mocks.request).not.toHaveBeenCalled();
  },
);
it('rejects a main response for another subject or still-unverified account', async () => {
  mocks.request.mockResolvedValueOnce({
    user: { ...session.user, id: 'wrong', emailVerified: true },
  });
  await expect(confirmEmail('123456')).rejects.toMatchObject({ status: 503 });
  mocks.request.mockResolvedValueOnce({ user: session.user });
  await expect(confirmEmail('123456')).rejects.toMatchObject({ status: 503 });
  expect(mocks.writeSession).not.toHaveBeenCalled();
});
it('keeps server-issued expiry and resend timing and propagates cooldown refusal', async () => {
  const timing = {
    sent: true,
    expiresAt: '2026-10-13T15:05:00.000Z',
    resendAvailableAt: '2026-10-13T15:01:00.000Z',
  };
  mocks.request.mockResolvedValueOnce(timing);
  await expect(resendEmail()).resolves.toEqual(timing);
  expect(mocks.request).toHaveBeenCalledWith('email/resend', {}, 'main-token');
  mocks.request.mockRejectedValueOnce({ status: 429, reason: 'email-verification-cooldown' });
  await expect(resendEmail()).rejects.toMatchObject({ status: 429 });
});
