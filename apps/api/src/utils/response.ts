import type { Response } from 'express';

export function ok<T>(res: Response, body: T, status = 200) {
  return res.status(status).json(body);
}

export function fail(
  res: Response,
  status: number,
  error: string,
  issues?: Record<string, string[] | undefined>,
) {
  return res.status(status).json({ error, ...(issues ? { issues } : {}) });
}

export function failReason(res: Response, status: number, error: string, reason: string) {
  return res.status(status).json({ error, reason });
}
