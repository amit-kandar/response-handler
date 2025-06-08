import { Response } from 'express';
import formatResponse from '../utils/formatter';

interface AppError extends Error {
  type?: string;
  details?: any;
  statusCode?: number;
}

function sendSuccess(res: Response, data: any = {}, message: string = 'Success'): Response {
  return res.status(200).json(formatResponse(true, data, message));
}

function sendError(res: Response, error: AppError): Response {
  const payload = formatResponse(false, null, error.message, {
    type: error.type || 'AppError',
    details: error.details || null,
  });
  
  const statusCode = error.statusCode || 400;
  return res.status(statusCode).json(payload);
}

export { sendSuccess, sendError };
