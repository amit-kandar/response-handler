import { Socket } from 'socket.io';
import formatResponse from '../utils/formatter';

interface BaseEmitParams {
  socket: Socket;
  event: string;
  room?: string;
  socketId?: string;
}

interface EmitSuccessParams extends BaseEmitParams {
  data?: any;
  message?: string;
}

interface EmitErrorPayload {
  message?: string;
  type?: string;
  code?: string | number;
  details?: any;
}

interface EmitErrorParams extends BaseEmitParams {
  error: EmitErrorPayload | Error | unknown;
}

function emitToTarget({ socket, event, room, socketId }: BaseEmitParams, payload: any): void {
  if (socketId) {
    socket.to(socketId).emit(event, payload);
    return;
  }

  if (room) {
    socket.to(room).emit(event, payload);
    return;
  }

  socket.emit(event, payload);
}

function normalizeError(error: EmitErrorParams['error']): EmitErrorPayload {
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      message:
        typeof errorObj.message === 'string' ? errorObj.message : 'An error occurred',
      type:
        typeof errorObj.type === 'string'
          ? errorObj.type
          : typeof errorObj.name === 'string'
            ? errorObj.name
            : 'AppError',
      code:
        typeof errorObj.code === 'string' || typeof errorObj.code === 'number'
          ? (errorObj.code as string | number)
          : undefined,
      details: errorObj.details,
    };
  }

  return {
    message: String(error || 'An error occurred'),
    type: 'AppError',
  };
}

function emitSuccess({
  socket,
  event,
  data = {},
  message = 'Success',
  room,
  socketId,
}: EmitSuccessParams): void {
  const payload = formatResponse(true, data, message);
  emitToTarget({ socket, event, room, socketId }, payload);
}

function emitError({ socket, event, error, room, socketId }: EmitErrorParams): void {
  const normalizedError = normalizeError(error);
  const payload = formatResponse(false, null, normalizedError.message || 'Error', {
    type: normalizedError.type || 'AppError',
    code: normalizedError.code,
    details: normalizedError.details || null,
  });

  emitToTarget({ socket, event, room, socketId }, payload);
}

export { emitSuccess, emitError };
