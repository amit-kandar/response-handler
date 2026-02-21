export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from './AppError';

export type AppErrorType =
  | 'AppError'
  | 'ValidationError'
  | 'NotFoundError'
  | 'UnauthorizedError';
