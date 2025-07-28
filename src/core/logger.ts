import { LoggingConfig, ResponseEvent } from '../types';

export class Logger {
  private config: LoggingConfig;

  constructor(config: LoggingConfig = {}) {
    this.config = {
      enabled: true,
      level: 'info',
      logErrors: true,
      logRequests: false,
      logResponses: false,
      includeStack: false,
      includeRequest: true,
      ...config,
    };
  }

  private shouldLog(level: string): boolean {
    if (!this.config.enabled) return false;

    const levels = ['error', 'warn', 'info', 'debug'];
    const configLevel = levels.indexOf(this.config.level || 'info');
    const messageLevel = levels.indexOf(level);

    return messageLevel <= configLevel;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (meta) {
      try {
        return `${prefix} ${message} ${JSON.stringify(meta, null, 2)}`;
      } catch (error) {
        // Handle circular references
        return `${prefix} ${message} [Object with circular reference]`;
      }
    }

    return `${prefix} ${message}`;
  }

  private log(level: string, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    if (this.config.customLogger) {
      this.config.customLogger(level, formattedMessage, meta);
    } else {
      // Default console logging
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }
  }

  public error(message: string, error?: any, meta?: any): void {
    const errorMeta = { ...meta };

    if (error) {
      errorMeta.error = {
        message: error.message,
        name: error.name,
        ...(this.config.includeStack && { stack: error.stack }),
        ...error,
      };
    }

    this.log('error', message, errorMeta);
  }

  public warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  public logRequest(req: any): void {
    if (!this.config.logRequests) return;

    const meta = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.requestId,
      ...(this.config.includeRequest && {
        headers: req.headers,
        query: req.query,
        params: req.params,
      }),
    };

    this.info(`Incoming ${req.method} request to ${req.url}`, meta);
  }

  public logResponse(req: any, res: any, responseData: any, executionTime?: number): void {
    if (!this.config.logResponses) return;

    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      requestId: req.requestId,
      executionTime: executionTime ? `${executionTime}ms` : undefined,
      responseSize: JSON.stringify(responseData).length,
    };

    this.info(`Response sent with status ${res.statusCode}`, meta);
  }

  public logEvent(event: ResponseEvent): void {
    const message = `${event.type.toUpperCase()} event`;

    const meta = {
      type: event.type,
      statusCode: event.statusCode,
      method: event.method,
      path: event.path,
      requestId: event.requestId,
      executionTime: event.executionTime,
      timestamp: event.timestamp,
    };

    switch (event.type) {
      case 'error':
        this.error(message, event.error, meta);
        break;
      case 'success':
        this.info(message, meta);
        break;
      default:
        this.debug(message, meta);
    }
  }

  public updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export default Logger;
