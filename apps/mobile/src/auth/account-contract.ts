import { z } from 'zod';

export const accountUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string(),
  role: z.enum(['user', 'professional', 'admin']),
  provider: z.enum(['local', 'google', 'facebook', 'tiktok']),
  emailVerified: z.boolean(),
});
export const emailDeliverySchema = z.object({
  sent: z.boolean(),
  expiresAt: z.iso.datetime({ offset: true }),
  resendAvailableAt: z.iso.datetime({ offset: true }),
});
export type EmailDelivery = z.infer<typeof emailDeliverySchema>;
export const needsEmailVerification = (user: { provider?: string; emailVerified?: boolean }) =>
  user.provider === 'local' && user.emailVerified !== true;
