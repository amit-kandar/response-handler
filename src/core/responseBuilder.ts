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
      // Always include allowed fields
      if (allowedFields.includes('message')) {
        errorInfo.message = error.message;
      }

      if (allowedFields.includes('type')) {
        errorInfo.type = error.type || error.name || 'Error';
      }

      if (allowedFields.includes('code')) {
        errorInfo.code = error.code || error.statusCode;
      }

      // Include details based on configuration
      if (!hideInternal && allowedFields.includes('details')) {
        errorInfo.details = error.details;
      }

      // Include stack trace only in development
      if (isDevelopment && this.config.logging?.includeStack) {
        errorInfo.stack = error.stack;
      }

      // Include timestamp
      if (this.config.responses?.includeTimestamp) {
        errorInfo.timestamp = new Date().toISOString();
      }

      // In production, provide generic message for internal errors
      if (hideInternal && this.isInternalError(error)) {
        errorInfo.message = 'An internal error occurred';
        delete errorInfo.details;
        delete errorInfo.stack;
      }
    }

    return errorInfo;
  }

  private isInternalError(error: any): boolean {
    const internalErrors = ['ReferenceError', 'TypeError', 'SyntaxError', 'InternalError'];
    return (
      internalErrors.includes(error.name) ||
      (error.statusCode && error.statusCode >= 500) ||
      !error.statusCode
    );
  }

  private buildResponse(success: boolean, data?: any, message?: string, error?: any): ApiResponse {
    const response: ApiResponse = {
      success,
    };

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

  private logResponse(statusCode: number, responseData: any, error?: any): void {
    const executionTime = this.req.startTime ? Date.now() - this.req.startTime : undefined;

    // Log the response
    this.logger.logResponse(this.req, { statusCode }, responseData, executionTime);

    // Log as event
    this.logger.logEvent({
      type: statusCode >= 400 ? 'error' : 'success',
      statusCode,
      method: this.req.method,
      path: this.req.path,
      requestId: this.req.requestId,
      executionTime,
      data: statusCode < 400 ? responseData.data : undefined,
      error: error,
      timestamp: new Date().toISOString(),
    });
  }

  private sendResponse(statusCode: number, data?: any, message?: string, error?: any): Response {
    const isSuccess = statusCode < 400;
    const responseData = this.buildResponse(isSuccess, data, message, error);

    // Set additional headers
    if (this.config.responses?.includeRequestId && this.req.requestId) {
      this.res.setHeader('X-Request-ID', this.req.requestId);
    }

    if (this.config.security?.corsHeaders) {
      this.res.setHeader('X-Content-Type-Options', 'nosniff');
      this.res.setHeader('X-Frame-Options', 'DENY');
      this.res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Log the response
    this.logResponse(statusCode, responseData, error);

    return this.res.status(statusCode).json(responseData);
  }

  // Success responses
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

  // Error responses
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
    // Log internal server errors
    if (error && this.config.logging?.logErrors) {
      this.logger.error('Internal server error occurred', error, {
        method: this.req.method,
        url: this.req.url,
        requestId: this.req.requestId,
      });
    }

    // In production, provide generic message for internal errors
    const isDevelopment = this.config.mode === 'development';
    const hideInternal = this.config.security?.hideInternalErrors && !isDevelopment;

    let responseMessage = message || 'Internal server error';
    if (hideInternal && error && this.isInternalError(error)) {
      responseMessage = 'An internal error occurred';
    }

    return this.sendResponse(500, undefined, responseMessage, error);
  }

  // Generic responses
  public respond(statusCode: number, data?: any, message?: string): Response {
    // For generic responses, determine success based on data presence or status code
    const isSuccess = data !== undefined || statusCode < 400;
    const responseData = this.buildResponse(isSuccess, data, message);

    // Set additional headers
    if (this.config.responses?.includeRequestId && this.req.requestId) {
      this.res.setHeader('X-Request-ID', this.req.requestId);
    }

    if (this.config.security?.corsHeaders) {
      this.res.setHeader('X-Content-Type-Options', 'nosniff');
      this.res.setHeader('X-Frame-Options', 'DENY');
      this.res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Log the response
    this.logResponse(statusCode, responseData);

    return this.res.status(statusCode).json(responseData);
  }

  public error(error: any, statusCode?: number): Response {
    const status = statusCode || error.statusCode || error.status || 500;
    let message = error.message || 'An error occurred';

    // In production, provide generic message for internal errors
    const isDevelopment = this.config.mode === 'development';
    const hideInternal = this.config.security?.hideInternalErrors && !isDevelopment;

    if (hideInternal && this.isInternalError(error)) {
      message = 'An internal error occurred';
    }

    return this.sendResponse(status, undefined, message, error);
  }

  // Pagination helper
  public paginate(data: any[], pagination: any, message?: string): Response {
    const response = this.buildResponse(true, data, message || 'Data retrieved successfully');

    if (response.meta) {
      response.meta.pagination = pagination;
    } else {
      response.meta = { pagination };
    }

    this.logResponse(200, response);
    return this.res.status(200).json(response);
  }
}

export default ResponseBuilder;
