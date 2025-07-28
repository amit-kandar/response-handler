import { Request, Response, NextFunction } from 'express';
import { ResponseHandlerConfig, EnhancedRequest, EnhancedResponse } from '../types';
import Logger from '../core/logger';
import ResponseBuilder from '../core/responseBuilder';

// Simple UUID v4 implementation to avoid external dependencies
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ResponseHandler {
  private config: ResponseHandlerConfig;
  private logger: Logger;

  constructor(config: ResponseHandlerConfig = {}) {
    // Merge user config with defaults and initialize logger
    this.config = this.mergeConfig(config);
    this.logger = new Logger(this.config.logging);
  }

  private mergeConfig(userConfig: ResponseHandlerConfig): ResponseHandlerConfig {
    // Default configuration with environment-aware settings
    const defaultConfig: ResponseHandlerConfig = {
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      logging: {
        enabled: true,
        level: 'info',
        logErrors: true,
        logRequests: false,
        logResponses: false,
        includeStack: process.env.NODE_ENV !== 'production', // Only in dev
        includeRequest: false,
      },
      responses: {
        includeTimestamp: true,
        includeRequestId: true,
        includeExecutionTime: true,
        pagination: true,
        compression: false,
      },
      security: {
        sanitizeErrors: true,
        hideInternalErrors: process.env.NODE_ENV === 'production', // Hide in prod
        allowedErrorFields: ['message', 'type', 'code'],
        corsHeaders: false,
      },
      performance: {
        enableCaching: false,
        cacheHeaders: true,
        etag: true,
        compression: false,
      },
    };

    return this.deepMerge(defaultConfig, userConfig);
  }

  // Deep merge utility for configuration objects
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // Enhance request object with tracking and context
  private enhanceRequest(req: EnhancedRequest): void {
    // Add request ID (use existing header or generate new)
    req.requestId = req.get('X-Request-ID') || generateUUID();

    // Add start time for execution tracking
    req.startTime = Date.now();

    // Add context object for request-specific data
    req.context = {};

    // Log incoming request if enabled
    this.logger.logRequest(req);
  }

  // Enhance response object with modern API methods
  private enhanceResponse(req: EnhancedRequest, res: EnhancedResponse): void {
    const builder = new ResponseBuilder(this.config, this.logger, req, res);

    // Add HTTP success response methods
    res.ok = (data?: any, message?: string) => builder.ok(data, message);
    res.created = (data?: any, message?: string) => builder.created(data, message);
    res.accepted = (data?: any, message?: string) => builder.accepted(data, message);
    res.noContent = (message?: string) => builder.noContent(message);

    // Add HTTP error response methods
    res.badRequest = (error?: any, message?: string) => builder.badRequest(error, message);
    res.unauthorized = (error?: any, message?: string) => builder.unauthorized(error, message);
    res.forbidden = (error?: any, message?: string) => builder.forbidden(error, message);
    res.notFound = (error?: any, message?: string) => builder.notFound(error, message);
    res.conflict = (error?: any, message?: string) => builder.conflict(error, message);
    res.unprocessableEntity = (error?: any, message?: string) =>
      builder.unprocessableEntity(error, message);
    res.tooManyRequests = (error?: any, message?: string) =>
      builder.tooManyRequests(error, message);
    res.internalServerError = (error?: any, message?: string) =>
      builder.internalServerError(error, message);

    // Add generic response methods
    res.respond = (statusCode: number, data?: any, message?: string) =>
      builder.respond(statusCode, data, message);
    res.error = (error: any, statusCode?: number) => builder.error(error, statusCode);
    res.paginate = (data: any[], pagination: any, message?: string) =>
      builder.paginate(data, pagination, message);

    // Enhanced file response methods with logging
    const originalDownload = res.download.bind(res);
    res.downloadFile = (filePath: string, filename?: string) => {
      this.logger.info(`File download initiated: ${filePath}`, {
        requestId: req.requestId,
        filename,
      });
      if (filename) {
        originalDownload(filePath, filename);
      } else {
        originalDownload(filePath);
      }
      return res;
    };

    // Enhanced stream response method
    res.streamResponse = (stream: NodeJS.ReadableStream, contentType?: string) => {
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      stream.pipe(res);
      return res;
    };
  }

  // Main middleware function for Express integration
  public middleware() {
    return (req: EnhancedRequest, res: EnhancedResponse, next: NextFunction) => {
      // Enhance request and response objects with new capabilities
      this.enhanceRequest(req);
      this.enhanceResponse(req, res);

      // Set performance-related headers if enabled
      if (this.config.performance?.cacheHeaders) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      if (this.config.performance?.etag) {
        res.setHeader('ETag', `"${req.requestId}"`);
      }

      // Set security headers if enabled
      if (this.config.security?.corsHeaders) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }

      next();
    };
  }

  // Error handler middleware for catching unhandled errors
  public errorHandler() {
    return (err: any, req: EnhancedRequest, res: EnhancedResponse, next: NextFunction) => {
      // Log the error with context information
      this.logger.error('Unhandled error caught by error handler', err, {
        method: req.method,
        url: req.url,
        requestId: req.requestId,
        userAgent: req.get('User-Agent'),
      });

      // If response was already sent, delegate to default Express error handler
      if (res.headersSent) {
        return next(err);
      }

      // Use the enhanced error method for consistent error responses
      return res.error(err);
    };
  }

  public updateConfig(newConfig: Partial<ResponseHandlerConfig>): void {
    this.config = this.deepMerge(this.config, newConfig);
    this.logger.updateConfig(this.config.logging || {});
  }

  public getConfig(): ResponseHandlerConfig {
    return { ...this.config };
  }

  public getLogger(): Logger {
    return this.logger;
  }
}

// Factory function for easy usage
export function createResponseHandler(config?: ResponseHandlerConfig): ResponseHandler {
  return new ResponseHandler(config);
}

// Default instance for simple usage
export const responseHandler = createResponseHandler();

export default ResponseHandler;
