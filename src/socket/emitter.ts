import { Socket } from 'socket.io';
import formatResponse from '../utils/formatter';

interface EmitSuccessParams {
  socket: Socket;
  event: string;
  data?: any;
  message?: string;
  room?: string;
  socketId?: string;
}

interface EmitErrorParams {
  socket: Socket;
  event: string;
  error: {
    message?: string;
    type?: string;
    details?: any;
  };
  room?: string;
  socketId?: string;
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

  if (socketId) {
    socket.to(socketId).emit(event, payload);
  } else if (room) {
    socket.to(room).emit(event, payload);
  } else {
    socket.emit(event, payload);
  }
}

function emitError({ socket, event, error, room, socketId }: EmitErrorParams): void {
  const payload = formatResponse(false, null, error.message || 'Error', {
    type: error.type || 'AppError',
    details: error.details || null,
  });

  if (socketId) {
    socket.to(socketId).emit(event, payload);
  } else if (room) {
    socket.to(room).emit(event, payload);
  } else {
    socket.emit(event, payload);
  }
}

export { emitSuccess, emitError };
