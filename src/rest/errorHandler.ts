import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  sendError(res, err);
}

export default errorHandler;
