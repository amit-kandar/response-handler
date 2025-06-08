import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): any {
  return sendError(res, err);
}

export default errorHandler;
