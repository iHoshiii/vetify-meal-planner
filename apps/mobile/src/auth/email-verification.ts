import { z } from 'zod';
import { ApiError } from '../services/api-error';
import { accountUserSchema, emailDeliverySchema } from './account-contract';
import { requestNativeAccount } from './native-session-request';
import { getSession, writeSession } from './session';

export async function confirmEmail(code: string) {
  if (!/^[0-9]{6}$/.test(code))
    throw new ApiError(400, 'Enter the six-digit code from your email.');
  const session = getSession();
  if (!session) throw new ApiError(401, 'Log in to confirm your email.');
  const value = await requestNativeAccount('email/verify', { code }, session.accessToken);
  const parsed = z.object({ user: accountUserSchema }).safeParse(value);
  if (!parsed.success || parsed.data.user.id !== session.user.id || !parsed.data.user.emailVerified)
    throw new ApiError(503, 'The account service returned an invalid confirmation.');
  if (getSession() !== session) throw new ApiError(401, 'The account session changed.');
  writeSession({ ...session, user: parsed.data.user, emailVerification: undefined });
}
export async function resendEmail() {
  const session = getSession();
  if (!session) throw new ApiError(401, 'Log in to confirm your email.');
  const parsed = emailDeliverySchema.safeParse(
    await requestNativeAccount('email/resend', {}, session.accessToken),
  );
  if (!parsed.success) throw new ApiError(503, 'The account service returned invalid code timing.');
  if (getSession() !== session) throw new ApiError(401, 'The account session changed.');
  writeSession({ ...session, emailVerification: parsed.data });
  return parsed.data;
}
