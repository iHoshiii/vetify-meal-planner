import { z } from 'zod';

export const nativeClientId = 'vetify-meal-planner';
export const nativeRedirectUri = 'vetify-planner://auth/callback';
export const nativeSocialRedirectUri = 'vetify-planner://auth/social';
export const nativeHandoffRequestSchema = z
  .object({
    redirectUri: z.literal(nativeRedirectUri),
    clientId: z.literal(nativeClientId),
  })
  .strict();
export const nativeCodeExchangeSchema = nativeHandoffRequestSchema
  .extend({
    code: z.string().min(1).max(128),
  })
  .strict();
export type NativeCodeExchange = z.infer<typeof nativeCodeExchangeSchema>;
