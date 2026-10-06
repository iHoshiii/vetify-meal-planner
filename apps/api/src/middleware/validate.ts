import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { fail } from '../utils/response.js';

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, 'Invalid request payload.', parsed.error.flatten().fieldErrors);
      return;
    }
    req.body = parsed.data;
    next();
  };
}
