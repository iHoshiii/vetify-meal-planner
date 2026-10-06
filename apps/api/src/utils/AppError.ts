export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static unauthorized(message = 'You need to be signed in to do that.') {
    return new AppError(401, message, 'unauthenticated');
  }
}
