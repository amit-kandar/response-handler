import { gzip } from 'zlib';
import { Response } from 'express';
import { ResponseHandlerConfig, ApiResponse, ResponseMeta, ErrorInfo } from '../types';
import Logger from './logger';

export class ResponseBuilder {
  private config: ResponseHandlerConfig;
  private logger: Logger;
  private req: any;
  private res: Response;

  constructor(config: ResponseHandlerConfig, logger: Logger, req: any, res: Response) {
    this.config = config;
    this.logger = logger;
    this.req = req;
    this.res = res;
  }

  private generateMeta(): ResponseMeta {
    const meta: ResponseMeta = {};

    if (this.config.responses?.includeRequestId && this.req.requestId) {
      meta.requestId = this.req.requestId;
    }

    if (this.config.responses?.includeTimestamp) {
      meta.timestamp = new Date().toISOString();
    }

    if (this.config.responses?.includeExecutionTime && this.req.startTime) {
      meta.executionTime = Date.now() - this.req.startTime;
    }

    if (this.config.responses?.customFields) {
      Object.assign(meta, this.config.responses.customFields);
    }

    if (this.config.mode === 'development') {
      meta.environment = 'development';
      meta.version = process.env.npm_package_version || '1.0.0';
    }

    return meta;
  }

  private sanitizeError(error: any): ErrorInfo {
    const isDevelopment = this.config.mode === 'development';
    const sanitizeErrors = this.config.security?.sanitizeErrors !== false;
    const hideInternal = this.config.security?.hideInternalErrors && !isDevelopment;
    const allowedFields = this.config.security?.allowedErrorFields || ['message', 'type', 'code'];

    const errorInfo: ErrorInfo = {};

    if (error) {
      if (!sanitizeErrors) {
        errorInfo.message =
          typeof error.message === 'string' ? error.message : String(error || 'An error occurred');
        errorInfo.type = error.type || error.name || 'Error';
        errorInfo.code = error.code || error.statusCode || error.status;
        errorInfo.details =
          error.details || (typeof error === 'object' && !(error instanceof Error) ? error : null);

        if (isDevelopment && this.config.logging?.includeStack) {
          errorInfo.stack = error.stack;
        }

        if (this.config.responses?.includeTimestamp) {
          errorInfo.timestamp = new Date().toISOString();
        }

        return errorInfo;
      }

      if (allowedFields.includes('message')) {
        errorInfo.message = typeof error.message === 'string' ? error.message : 'An error occurred';
      }

      if (allowedFields.includes('type')) {
        errorInfo.type = error.type || error.name || 'Error';
      }

      if (allowedFields.includes('code')) {
        errorInfo.code = error.code || error.statusCode;
      }

      if (!hideInternal && allowedFields.includes('details')) {
        errorInfo.details = error.details;
      }

      if (isDevelopment && this.config.logging?.includeStack) {
        errorInfo.stack = error.stack;
      }

      if (this.config.responses?.includeTimestamp) {
        errorInfo.timestamp = new Date().toISOString();
      }

      if (hideInternal && this.isInternalError(error)) {
        errorInfo.message = 'An internal error occurred';
        delete errorInfo.details;
        delete errorInfo.stack;
      }
    }

    return errorInfo;
  }

  private isInternalError(error: any): boolean {
    if (!error || typeof error !== 'object') {
      return true;
    }

    const internalErrors = ['ReferenceError', 'TypeError', 'SyntaxError', 'InternalError'];
    return (
      internalErrors.includes(error.name) ||
      (error.statusCode && error.statusCode >= 500) ||
      (error.status && error.status >= 500) ||
      !error.statusCode
    );
  }

  private buildResponse(success: boolean, data?: any, message?: string, error?: any): ApiResponse {
    const response: ApiResponse = { success };

    if (success) {
      if (data !== undefined) response.data = data;
      if (message) response.message = message;
    } else {
      response.error = this.sanitizeError(error || {});
      if (message) response.message = message;
    }

    const meta = this.generateMeta();
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return response;
  }

  private logResponse(statusCode: number, responseData: any, error?: any): void {
    const executionTime = this.req.startTime ? Date.now() - this.req.startTime : undefined;

    this.logger.logResponse(this.req, { statusCode }, responseData, executionTime);
    this.logger.logEvent({
      type: statusCode >= 400 ? 'error' : 'success',
      statusCode,
      method: this.req.method,
      path: this.req.path,
      requestId: this.req.requestId,
      executionTime,
      data: statusCode < 400 ? responseData.data : undefined,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  private applyCommonHeaders(statusCode: number): void {
    if (this.config.responses?.includeRequestId && this.req.requestId) {
      this.res.setHeader('X-Request-ID', this.req.requestId);
    }

    if (this.config.security?.corsHeaders) {
      this.res.setHeader('X-Content-Type-Options', 'nosniff');
      this.res.setHeader('X-Frame-Options', 'DENY');
      this.res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    if (this.config.performance?.enableCaching && statusCode < 400) {
      const { cacheControl, cacheTTL: ttl } = this.config.performance;

      if (cacheControl) {
        this.res.setHeader('Cache-Control', cacheControl);
      } else if (typeof ttl === 'number') {
        this.res.setHeader('Cache-Control', `public, max-age=${Math.max(0, ttl)}`);
      }
    }
  }

  private shouldCompress(payload: string): boolean {
    const compressionEnabled =
      this.config.responses?.compression || this.config.performance?.compression;

    if (!compressionEnabled) {
      return false;
    }

    const acceptEncoding = String(this.req.get?.('accept-encoding') || '').toLowerCase();
    if (!acceptEncoding.includes('gzip')) {
      return false;
    }

    const threshold =
      this.config.responses?.compressionThreshold ?? this.config.performance?.compressionThreshold ?? 1024;

    return Buffer.byteLength(payload) >= threshold;
  }

  private sendJson(statusCode: number, responseData: ApiResponse): Response {
    const serialized = JSON.stringify(responseData);

    if (this.shouldCompress(serialized)) {
      this.res.status(statusCode);
      gzip(serialized, (compressionError, compressed) => {
        if (compressionError) {
          this.logger.warn('Failed to gzip response payload; falling back to plain JSON', {
            message: compressionError.message,
          });
          this.res.setHeader('Content-Type', 'application/json; charset=utf-8');
          this.res.send(serialized);
          return;
        }

        this.res.setHeader('Content-Type', 'application/json; charset=utf-8');
        this.res.setHeader('Content-Encoding', 'gzip');
        this.res.setHeader('Vary', 'Accept-Encoding');
        this.res.send(compressed);
      });
      return this.res;
    }

    return this.res.status(statusCode).json(responseData);
  }

  private sendResponse(statusCode: number, data?: any, message?: string, error?: any): Response {
    this.applyCommonHeaders(statusCode);

    if (statusCode === 204) {
      this.logResponse(statusCode, { success: true, message: message || 'No content' }, error);
      return this.res.status(204).send();
    }

    const isSuccess = statusCode < 400;
    const responseData = this.buildResponse(isSuccess, data, message, error);

    this.logResponse(statusCode, responseData, error);
    return this.sendJson(statusCode, responseData);
  }

  public ok(data?: any, message?: string): Response {
    return this.sendResponse(200, data, message || 'Success');
  }

  public created(data?: any, message?: string): Response {
    return this.sendResponse(201, data, message || 'Created successfully');
  }

  public accepted(data?: any, message?: string): Response {
    return this.sendResponse(202, data, message || 'Accepted');
  }

  public noContent(message?: string): Response {
    return this.sendResponse(204, undefined, message || 'No content');
  }

  public badRequest(error?: any, message?: string): Response {
    return this.sendResponse(400, undefined, message || 'Bad request', error);
  }

  public unauthorized(error?: any, message?: string): Response {
    return this.sendResponse(401, undefined, message || 'Unauthorized', error);
  }

  public forbidden(error?: any, message?: string): Response {
    return this.sendResponse(403, undefined, message || 'Forbidden', error);
  }

  public notFound(error?: any, message?: string): Response {
    return this.sendResponse(404, undefined, message || 'Not found', error);
  }

  public conflict(error?: any, message?: string): Response {
    return this.sendResponse(409, undefined, message || 'Conflict', error);
  }

  public unprocessableEntity(error?: any, message?: string): Response {
    return this.sendResponse(422, undefined, message || 'Unprocessable entity', error);
  }

  public tooManyRequests(error?: any, message?: string): Response {
    return this.sendResponse(429, undefined, message || 'Too many requests', error);
  }

  public internalServerError(error?: any, message?: string): Response {
    if (error && this.config.logging?.logErrors) {
      this.logger.error('Internal server error occurred', error, {
        method: this.req.method,
        url: this.req.url,
        requestId: this.req.requestId,
      });
    }

    const isDevelopment = this.config.mode === 'development';
    const hideInternal = this.config.security?.hideInternalErrors && !isDevelopment;

    let responseMessage = message || 'Internal server error';
    if (hideInternal && error && this.isInternalError(error)) {
      responseMessage = 'An internal error occurred';
    }

    return this.sendResponse(500, undefined, responseMessage, error);
  }

  public respond(statusCode: number, data?: any, message?: string): Response {
    const isSuccess = statusCode < 400;
    if (isSuccess) {
      return this.sendResponse(statusCode, data, message);
    }

    const responseMessage = message || 'Request failed';
    const inferredError =
      typeof data === 'object' && data !== null
        ? data
        : { message: typeof data === 'string' ? data : responseMessage };

    return this.sendResponse(statusCode, undefined, responseMessage, inferredError);
  }

  public error(error: any, statusCode?: number): Response {
    const status = statusCode || error?.statusCode || error?.status || 500;
    let message = error?.message || 'An error occurred';

    const isDevelopment = this.config.mode === 'development';
    const hideInternal = this.config.security?.hideInternalErrors && !isDevelopment;

    if (hideInternal && this.isInternalError(error)) {
      message = 'An internal error occurred';
    }

    return this.sendResponse(status, undefined, message, error);
  }

  public paginate(data: any[], pagination: any, message?: string): Response {
    const response = this.buildResponse(true, data, message || 'Data retrieved successfully');

    if (response.meta) {
      response.meta.pagination = pagination;
    } else {
      response.meta = { pagination };
    }

    this.applyCommonHeaders(200);
    this.logResponse(200, response);
    return this.sendJson(200, response);
  }
}

export default ResponseBuilder;
