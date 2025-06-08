import { Socket } from 'socket.io';
import { emitError } from './emitter';

interface SocketData {
  event?: string;
  [key: string]: any;
}

type SocketHandler = (socket: Socket, data: SocketData) => Promise<void>;

function socketWrapper(handler: SocketHandler) {
  return async (socket: Socket, data: SocketData): Promise<void> => {
    try {
      await handler(socket, data);
    } catch (error) {
      emitError({ 
        socket, 
        event: data?.event || 'error', 
        error: error as Error 
      });
    }
  };
}

export default socketWrapper;
