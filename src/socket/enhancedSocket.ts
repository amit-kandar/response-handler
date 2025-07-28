import { Socket, Server } from 'socket.io';
import { ResponseHandlerConfig, SocketResponse, ApiResponse, ErrorInfo } from '../types';
import Logger from '../core/logger';

export class EnhancedSocketHandler {
  private config: ResponseHandlerConfig;
  private logger: Logger;
  private socket: Socket;
  private event: string;
  private targetRoom?: string;
  private targetSocket?: string;

  constructor(config: ResponseHandlerConfig, logger: Logger, socket: Socket, event: string) {
    this.config = config;
    this.logger = logger;
    this.socket = socket;
    this.event = event;
  }

  private generateMeta(): Record<string, unknown> {
    const meta: Record<string, unknown> = {};

    if (this.config.responses?.includeTimestamp) {
      meta.timestamp = new Date().toISOString();
    }

    if (this.config.mode === 'development') {
      meta.environment = 'development';
      meta.socketId = this.socket.id;
    }

    return meta;
  }

  private sanitizeError(error: unknown): ErrorInfo {
    const isDevelopment = this.config.mode === 'development';
    const allowedFields = this.config.security?.allowedErrorFields || ['message', 'type', 'code'];

    const errorInfo: ErrorInfo = {};

    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;

      if (allowedFields.includes('message')) {
        errorInfo.message =
          typeof errorObj.message === 'string' ? errorObj.message : 'An error occurred';
      }

      if (allowedFields.includes('type')) {
        errorInfo.type =
          typeof errorObj.type === 'string'
            ? errorObj.type
            : typeof errorObj.name === 'string'
              ? errorObj.name
              : 'SocketError';
      }

      if (allowedFields.includes('code')) {
        errorInfo.code = typeof errorObj.code === 'string' ? errorObj.code : 'SOCKET_ERROR';
      }

      if (
        isDevelopment &&
        this.config.logging?.includeStack &&
        typeof errorObj.stack === 'string'
      ) {
        errorInfo.stack = errorObj.stack;
      }

      if (this.config.responses?.includeTimestamp) {
        errorInfo.timestamp = new Date().toISOString();
      }
    }

    return errorInfo;
  }

  private buildResponse(
    success: boolean,
    data?: unknown,
    message?: string,
    error?: unknown,
  ): ApiResponse {
    const response: ApiResponse = { success };

    if (success) {
      if (data !== undefined) response.data = data;
      if (message) response.message = message;
    } else {
      if (error) response.error = this.sanitizeError(error);
      if (message) response.message = message;
    }

    const meta = this.generateMeta();
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return response;
  }

  private emit(responseData: ApiResponse, statusCode?: number): void {
    // Log the emission
    this.logger.logEvent({
      type: responseData.success ? 'success' : 'error',
      statusCode: statusCode || (responseData.success ? 200 : 400),
      requestId: this.socket.id,
      data: responseData.data,
      error: responseData.error,
      timestamp: new Date().toISOString(),
    });

    if (!this.socket || typeof this.socket.emit !== 'function') {
      this.logger.error('Socket is not properly initialized', {
        event: this.event,
        data: responseData,
      });
      return;
    }

    if (this.targetSocket) {
      this.socket.to(this.targetSocket).emit(this.event, responseData);
    } else if (this.targetRoom) {
      this.socket.to(this.targetRoom).emit(this.event, responseData);
    } else {
      this.socket.emit(this.event, responseData);
    }
  }

  // Targeting methods
  public toRoom(room: string): SocketResponse {
    const handler = new EnhancedSocketHandler(this.config, this.logger, this.socket, this.event);
    handler.targetRoom = room;
    return handler.createSocketResponse(handler);
  }

  public toSocket(socketId: string): SocketResponse {
    const handler = new EnhancedSocketHandler(this.config, this.logger, this.socket, this.event);
    handler.targetSocket = socketId;
    return handler.createSocketResponse(handler);
  }

  public createSocketResponse(handler: EnhancedSocketHandler): SocketResponse {
    return {
      ok: (data?: unknown, message?: string) => handler.ok(data, message),
      created: (data?: unknown, message?: string) => handler.created(data, message),
      error: (error: unknown, code?: string) => handler.error(error, code),
      badRequest: (error?: unknown, message?: string) => handler.badRequest(error, message),
      unauthorized: (error?: unknown, message?: string) => handler.unauthorized(error, message),
      forbidden: (error?: unknown, message?: string) => handler.forbidden(error, message),
      notFound: (error?: unknown, message?: string) => handler.notFound(error, message),
      emit: (event: string, data?: unknown, statusCode?: number) =>
        handler.customEmit(event, data, statusCode),
      toRoom: (room: string) => handler.toRoom(room),
      toSocket: (socketId: string) => handler.toSocket(socketId),
    };
  }

  // Success methods
  public ok(data?: unknown, message?: string): void {
    const response = this.buildResponse(true, data, message || 'Success');
    this.emit(response, 200);
  }

  public created(data?: unknown, message?: string): void {
    const response = this.buildResponse(true, data, message || 'Created successfully');
    this.emit(response, 201);
  }

  // Error methods
  public error(error: unknown, code?: string): void {
    if (this.config.logging?.logErrors) {
      this.logger.error('Socket error occurred', error, {
        socketId: this.socket.id,
        event: this.event,
        room: this.targetRoom,
      });
    }

    const errorObj =
      error && typeof error === 'object'
        ? { ...(error as Record<string, unknown>), code: code || (error as any).code }
        : { message: String(error), code };
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? (error as any).message
        : 'An error occurred';
    const response = this.buildResponse(false, undefined, errorMessage, errorObj);
    this.emit(response, 400);
  }

  public badRequest(error?: unknown, message?: string): void {
    const response = this.buildResponse(false, undefined, message || 'Bad request', error);
    this.emit(response, 400);
  }

  public unauthorized(error?: any, message?: string): void {
    const response = this.buildResponse(false, undefined, message || 'Unauthorized', error);
    this.emit(response, 401);
  }

  public forbidden(error?: any, message?: string): void {
    const response = this.buildResponse(false, undefined, message || 'Forbidden', error);
    this.emit(response, 403);
  }

  public notFound(error?: any, message?: string): void {
    const response = this.buildResponse(false, undefined, message || 'Not found', error);
    this.emit(response, 404);
  }

  // Custom emit method
  public customEmit(event: string, data?: any, statusCode?: number): void {
    const oldEvent = this.event;
    this.event = event;

    const response = this.buildResponse(true, data, 'Data emitted');
    this.emit(response, statusCode);

    this.event = oldEvent;
  }
}

export class SocketResponseHandler {
  private config: ResponseHandlerConfig;
  private logger: Logger;

  constructor(config: ResponseHandlerConfig = {}) {
    this.config = config;
    this.logger = new Logger(this.config.logging);
  }

  public enhance(socket: Socket, event: string): SocketResponse {
    const handler = new EnhancedSocketHandler(this.config, this.logger, socket, event);
    return handler.createSocketResponse(handler);
  }

  public wrapper<T extends readonly unknown[]>(
    handler: (socket: Socket, response: SocketResponse, ...args: T) => Promise<void> | void,
  ) {
    return async (socket: Socket, event: string, ...args: T) => {
      const response = this.enhance(socket, event);

      try {
        await handler(socket, response, ...args);
      } catch (error) {
        this.logger.error('Socket handler error', error, {
          socketId: socket.id,
          event,
        });

        response.error(error);
      }
    };
  }

  public setupServer(io: Server): void {
    io.on('connection', (socket) => {
      this.logger.info(`Socket connected: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        this.logger.info(`Socket disconnected: ${socket.id}`, { reason });
      });

      socket.on('error', (error) => {
        this.logger.error(`Socket error: ${socket.id}`, error);
      });
    });
  }

  public updateConfig(newConfig: Partial<ResponseHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.updateConfig(this.config.logging || {});
  }

  public getLogger(): Logger {
    return this.logger;
  }
}

export function createSocketHandler(config?: ResponseHandlerConfig): SocketResponseHandler {
  return new SocketResponseHandler(config);
}

export default SocketResponseHandler;
