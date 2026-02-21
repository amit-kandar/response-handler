import { randomUUID } from 'crypto';
import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import {
  ResponseHandlerConfig,
  EnhancedRequest,
  EnhancedResponse,
  RateLimitConfig,
} from '../types';
import Logger from '../core/logger';
import ResponseBuilder from '../core/responseBuilder';

interface RateLimitState {
  count: number;
  resetAt: number;
}

const DEFAULT_RATE_LIMIT: Required<RateLimitConfig> = {
  windowMs: 60_000,
  maxRequests: 100,
  statusCode: 429,
  message: 'Too many requests',
};

function getDefaultConfig(): ResponseHandlerConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    mode: isProduction ? 'production' : 'development',
    logging: {
      enabled: true,
      level: 'info',
      logErrors: true,
      logRequests: false,
      logResponses: false,
      includeStack: !isProduction,
      includeRequest: false,
    },
    responses: {
      includeTimestamp: true,
      includeRequestId: true,
      includeExecutionTime: true,
      pagination: true,
      compression: false,
      compressionThreshold: 1024,
    },
    security: {
      sanitizeErrors: true,
      hideInternalErrors: isProduction,
      allowedErrorFields: ['message', 'type', 'code'],
      corsHeaders: false,
      rateLimiting: false,
    },
    performance: {
      enableCaching: false,
      cacheHeaders: false,
      cacheControl: '',
      cacheTTL: 0,
      etag: true,
      compression: false,
      compressionThreshold: 1024,
    },
  };
}

export class ResponseHandler {
  private config: ResponseHandlerConfig;
  private logger: Logger;
  private rateLimitStore: Map<string, RateLimitState>;
  private lastRateLimitCleanup: number;

  constructor(config: ResponseHandlerConfig = {}) {
    this.config = this.deepMerge(getDefaultConfig(), config);
    this.logger = new Logger(this.config.logging);
    this.rateLimitStore = new Map();
    this.lastRateLimitCleanup = 0;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    if (!source || typeof source !== 'object') {
      return result;
    }

    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });

    return result;
  }

  private getRateLimitConfig(): Required<RateLimitConfig> | null {
    const rateLimiting = this.config.security?.rateLimiting;
    if (!rateLimiting) {
      return null;
    }

    if (rateLimiting === true) {
      return DEFAULT_RATE_LIMIT;
    }

    return {
      ...DEFAULT_RATE_LIMIT,
      ...rateLimiting,
      windowMs: rateLimiting.windowMs ?? DEFAULT_RATE_LIMIT.windowMs,
      maxRequests: rateLimiting.maxRequests ?? DEFAULT_RATE_LIMIT.maxRequests,
      statusCode: rateLimiting.statusCode ?? DEFAULT_RATE_LIMIT.statusCode,
      message: rateLimiting.message ?? DEFAULT_RATE_LIMIT.message,
    };
  }

  private handleRateLimit(req: EnhancedRequest, res: EnhancedResponse): boolean {
    const rateLimitConfig = this.getRateLimitConfig();
    if (!rateLimitConfig) {
      return true;
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    this.cleanupExpiredRateLimits(now);
    const current = this.rateLimitStore.get(ip);

    if (!current || current.resetAt <= now) {
      const state = { count: 1, resetAt: now + rateLimitConfig.windowMs };
      this.rateLimitStore.set(ip, state);
      this.setRateLimitHeaders(res, rateLimitConfig, state, now);
      return true;
    }

    current.count += 1;
    this.rateLimitStore.set(ip, current);

    this.setRateLimitHeaders(res, rateLimitConfig, current, now);

    if (current.count <= rateLimitConfig.maxRequests) {
      return true;
    }

    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(0, retryAfterSeconds)));
    res.status(rateLimitConfig.statusCode).json({
      success: false,
      message: rateLimitConfig.message,
      error: {
        message: rateLimitConfig.message,
        type: 'RateLimitError',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
    return false;
  }

  private setRateLimitHeaders(
    res: EnhancedResponse,
    config: Required<RateLimitConfig>,
    state: RateLimitState,
    now: number,
  ): void {
    const remaining = Math.max(0, config.maxRequests - state.count);
    res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));

    if (remaining <= 0) {
      const retryAfterSeconds = Math.ceil((state.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(0, retryAfterSeconds)));
    }
  }

  private cleanupExpiredRateLimits(now: number): void {
    if (now - this.lastRateLimitCleanup < 30_000) {
      return;
    }

    this.lastRateLimitCleanup = now;
    this.rateLimitStore.forEach((state, key) => {
      if (state.resetAt <= now) {
        this.rateLimitStore.delete(key);
      }
    });
  }

  private enhanceRequest(req: EnhancedRequest): void {
    req.requestId = req.get('X-Request-ID') || randomUUID();
    req.startTime = Date.now();
    req.context = {};

    this.logger.logRequest(req);
  }

  private enhanceResponse(req: EnhancedRequest, res: EnhancedResponse): void {
    const builder = new ResponseBuilder(this.config, this.logger, req, res);

    res.ok = (data?: any, message?: string) => builder.ok(data, message);
    res.created = (data?: any, message?: string) => builder.created(data, message);
    res.accepted = (data?: any, message?: string) => builder.accepted(data, message);
    res.noContent = (message?: string) => builder.noContent(message);

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

    res.respond = (statusCode: number, data?: any, message?: string) =>
      builder.respond(statusCode, data, message);
    res.error = (error: any, statusCode?: number) => builder.error(error, statusCode);
    res.paginate = (data: any[], pagination: any, message?: string) =>
      builder.paginate(data, pagination, message);

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

    res.streamResponse = (stream: NodeJS.ReadableStream, contentType?: string) => {
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      stream.pipe(res);
      return res;
    };
  }

  public middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const enhancedReq = req as EnhancedRequest;
      const enhancedRes = res as EnhancedResponse;

      this.enhanceRequest(enhancedReq);
      this.enhanceResponse(enhancedReq, enhancedRes);

      if (!this.handleRateLimit(enhancedReq, enhancedRes)) {
        return;
      }

      if (this.config.performance?.cacheHeaders) {
        enhancedRes.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        enhancedRes.setHeader('Pragma', 'no-cache');
        enhancedRes.setHeader('Expires', '0');
      }

      if (this.config.performance?.etag) {
        enhancedRes.setHeader('ETag', `"${enhancedReq.requestId}"`);
      }

      if (this.config.security?.corsHeaders) {
        enhancedRes.setHeader('X-Content-Type-Options', 'nosniff');
        enhancedRes.setHeader('X-Frame-Options', 'DENY');
        enhancedRes.setHeader('X-XSS-Protection', '1; mode=block');
      }

      next();
    };
  }

  public errorHandler(): ErrorRequestHandler {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      const enhancedReq = req as EnhancedRequest;
      const enhancedRes = res as EnhancedResponse;

      this.logger.error('Unhandled error caught by error handler', err, {
        method: enhancedReq.method,
        url: enhancedReq.url,
        requestId: enhancedReq.requestId,
        userAgent: enhancedReq.get('User-Agent'),
      });

      if (enhancedRes.headersSent) {
        next(err);
        return;
      }

      enhancedRes.error(err);
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

export function createResponseHandler(config?: ResponseHandlerConfig): ResponseHandler {
  return new ResponseHandler(config);
}

export const defaultResponseHandler = createResponseHandler();
export const responseHandler = defaultResponseHandler;

export default ResponseHandler;
