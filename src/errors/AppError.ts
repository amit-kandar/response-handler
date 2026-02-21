export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly details?: any;

  constructor(
    message: string,
    options: { statusCode?: number; type?: string; details?: any } = {},
  ) {
    super(message);
    this.statusCode = options.statusCode ?? 400;
    this.type = options.type ?? 'AppError';
    this.details = options.details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, { statusCode: 400, type: 'ValidationError', details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: 404, type: 'NotFoundError' });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { statusCode: 401, type: 'UnauthorizedError' });
  }
}
