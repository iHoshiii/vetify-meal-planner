import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { fail, failReason } from '../utils/response.js';

export function notFoundHandler(req: Request, res: Response) {
  fail(res, 404, `Route not found: ${req.method} ${req.path}`);
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) {
    if (err.reason) failReason(res, err.statusCode, err.message, err.reason);
    else fail(res, err.statusCode, err.message);
    return;
  }
  if (err instanceof ZodError) {
    fail(res, 400, 'Validation failed.', err.flatten().fieldErrors);
    return;
  }
  if (err instanceof MongoServerError && err.code === 11000) {
    failReason(res, 409, 'That value is already taken.', 'duplicate');
    return;
  }
  if (err instanceof Error && err.name === 'BSONError') {
    fail(res, 400, 'Invalid id.');
    return;
  }
  if (
    err instanceof Error &&
    ['MongoNetworkError', 'MongoServerSelectionError', 'MongoNetworkTimeoutError'].includes(
      err.name,
    )
  ) {
    failReason(res, 503, 'Planner storage is unavailable. Please retry.', 'db-unavailable');
    return;
  }
  failReason(res, 500, 'Internal server error.', 'internal-error');
}
