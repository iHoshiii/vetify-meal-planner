import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import type { Request } from 'express';
import { AppError } from '../../utils/AppError.js';

export function accountTimeZone(req: Request): string {
  if (!req.currentPrincipal) throw AppError.unauthorized();
  return req.currentPrincipal.region.timeZone;
}

export function accountToday(req: Request): string {
  return todayInTimeZone(accountTimeZone(req));
}
