import { Response } from 'express';
import formatResponse from '../utils/formatter';

interface AppError extends Error {
  type?: string;
  details?: any;
  statusCode?: number;
  status?: number;
  code?: string | number;
}

function sendSuccess(res: Response, data: any = {}, message = 'Success'): Response {
  return res.status(200).json(formatResponse(true, data, message));
}

function sendError(res: Response, error: AppError | unknown): Response {
  const normalizedError =
    error && typeof error === 'object'
      ? (error as AppError)
      : ({ message: String(error || 'An error occurred') } as AppError);

  const payload = formatResponse(false, null, normalizedError.message || 'An error occurred', {
    type: normalizedError.type || normalizedError.name || 'AppError',
    code: normalizedError.code || normalizedError.statusCode || normalizedError.status,
    details: normalizedError.details || null,
  });

  const statusCode = normalizedError.statusCode || normalizedError.status || 500;
  return res.status(statusCode).json(payload);
}

export { sendSuccess, sendError };
