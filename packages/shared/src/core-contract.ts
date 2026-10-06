import { z } from 'zod';

const timestamp = z.iso.datetime({ offset: true });
const timeZone = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone');

export const introspectionSchema = z
  .object({
    version: z.literal(1),
    user: z.object({
      id: z.string().min(1).max(128),
      role: z.enum(['user', 'professional', 'admin']),
      status: z.enum(['active', 'suspended', 'banned', 'deactivated']),
    }),
    region: z.object({ timeZone: timeZone.default('Asia/Manila') }),
    subscription: z.object({
      plan: z.enum(['free', 'pro']),
      status: z.enum(['active', 'expired', 'cancelled']).nullable(),
      expiresAt: timestamp.nullable(),
    }),
    entitlements: z.array(z.string().min(1).max(128)).max(100),
    tokenExpiresAt: timestamp,
    validUntil: timestamp,
  })
  .superRefine((value, ctx) => {
    const boundary = Math.min(
      Date.parse(value.tokenExpiresAt),
      value.subscription.status === 'active' && value.subscription.expiresAt
        ? Date.parse(value.subscription.expiresAt)
        : Infinity,
    );
    if (Date.parse(value.validUntil) > boundary) {
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'Authorization exceeds validity boundary',
      });
    }
  });

export type Introspection = z.infer<typeof introspectionSchema>;
