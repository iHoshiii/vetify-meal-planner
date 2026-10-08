export type ApiErrorBody = {
  error?: string;
  message?: string;
  reason?: string;
  issues?: Record<string, string[] | undefined>;
};
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason?: string,
    readonly issues?: ApiErrorBody['issues'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body ?? {}) as ApiErrorBody;
    throw new ApiError(
      response.status,
      error.error ?? error.message ?? `Request failed (${response.status})`,
      error.reason,
      error.issues,
    );
  }
  return body as T;
}
