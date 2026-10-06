import type { Request } from 'express';
import { AppError } from '../../utils/AppError.js';

export function actorOf(req: Request) {
  if (!req.currentPrincipal) throw AppError.unauthorized();
  return req.currentPrincipal.user;
}
