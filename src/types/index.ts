import { Request, Response } from 'express';
import { Socket } from 'socket.io';

// Configuration Types
export interface ResponseHandlerConfig {
  mode?: 'development' | 'production';
  logging?: LoggingConfig;
  responses?: ResponseConfig;
  security?: SecurityConfig;
  performance?: PerformanceConfig;
}

export interface LoggingConfig {
  enabled?: boolean;
  level?: 'error' | 'warn' | 'info' | 'debug';
  logErrors?: boolean;
  logRequests?: boolean;
  logResponses?: boolean;
  customLogger?: (level: string, message: string, meta?: any) => void;
  includeStack?: boolean;
  includeRequest?: boolean;
}

export interface ResponseConfig {
  includeTimestamp?: boolean;
  includeRequestId?: boolean;
  includeExecutionTime?: boolean;
  customFields?: Record<string, any>;
  pagination?: boolean;
  compression?: boolean;
}

export interface SecurityConfig {
  sanitizeErrors?: boolean;
  hideInternalErrors?: boolean;
  allowedErrorFields?: string[];
  rateLimiting?: boolean;
  corsHeaders?: boolean;
}

export interface PerformanceConfig {
  enableCaching?: boolean;
  cacheHeaders?: boolean;
  etag?: boolean;
  compression?: boolean;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ErrorInfo;
  meta?: ResponseMeta;
}

export interface ErrorInfo {
  message?: string;
  type?: string;
  code?: string | number;
  details?: any;
  stack?: string;
  timestamp?: string;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  executionTime?: number;
  pagination?: PaginationInfo;
  version?: string;
  environment?: string;
}

export interface PaginationInfo {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Extended Express Types
export interface EnhancedResponse extends Response {
  // Success responses
  ok: (data?: any, message?: string) => Response;
  created: (data?: any, message?: string) => Response;
  accepted: (data?: any, message?: string) => Response;
  noContent: (message?: string) => Response;
  
  // Error responses
  badRequest: (error?: any, message?: string) => Response;
  unauthorized: (error?: any, message?: string) => Response;
  forbidden: (error?: any, message?: string) => Response;
  notFound: (error?: any, message?: string) => Response;
  conflict: (error?: any, message?: string) => Response;
  unprocessableEntity: (error?: any, message?: string) => Response;
  tooManyRequests: (error?: any, message?: string) => Response;
  internalServerError: (error?: any, message?: string) => Response;
  
  // Generic responses
  respond: (statusCode: number, data?: any, message?: string) => Response;
  error: (error: any, statusCode?: number) => Response;
  
  // Pagination helper
  paginate: (data: any[], pagination: PaginationInfo, message?: string) => Response;
  
  // File responses (these will override the original methods)
  downloadFile: (filePath: string, filename?: string) => Response;
  streamResponse: (stream: NodeJS.ReadableStream, contentType?: string) => Response;
}

export interface EnhancedRequest extends Request {
  requestId?: string;
  startTime?: number;
  context?: Record<string, any>;
}

// Socket Types
export interface SocketResponse {
  // Success emissions
  ok: (data?: unknown, message?: string) => void;
  created: (data?: unknown, message?: string) => void;
  
  // Error emissions
  error: (error: unknown, code?: string) => void;
  badRequest: (error?: unknown, message?: string) => void;
  unauthorized: (error?: unknown, message?: string) => void;
  forbidden: (error?: unknown, message?: string) => void;
  notFound: (error?: unknown, message?: string) => void;
  
  // Generic emission
  emit: (event: string, data?: unknown, statusCode?: number) => void;
  
  // Room/targeting helpers
  toRoom: (room: string) => SocketResponse;
  toSocket: (socketId: string) => SocketResponse;
}

// Event Types
export interface ResponseEvent {
  type: 'success' | 'error' | 'request' | 'response';
  statusCode: number;
  method?: string;
  path?: string;
  requestId?: string;
  executionTime?: number;
  data?: any;
  error?: any;
  timestamp: string;
}

// Middleware Types
export type ResponseHandlerMiddleware = (req: EnhancedRequest, res: EnhancedResponse, next: any) => void;
export type ErrorHandlerMiddleware = (err: any, req: EnhancedRequest, res: EnhancedResponse, next: any) => void;

// Utility Types
export interface HttpStatusMessages {
  [key: number]: string;
}

export interface ErrorMapping {
  [errorType: string]: {
    statusCode: number;
    message: string;
    clientMessage?: string;
  };
}

// Plugin Types
export interface ResponsePlugin {
  name: string;
  version?: string;
  init?: (config: ResponseHandlerConfig) => void;
  beforeResponse?: (req: EnhancedRequest, res: EnhancedResponse, data: any) => any;
  afterResponse?: (req: EnhancedRequest, res: EnhancedResponse, responseData: any) => void;
  onError?: (req: EnhancedRequest, res: EnhancedResponse, error: any) => any;
}

// Builder Pattern Types
export interface ResponseBuilder {
  data(data: any): ResponseBuilder;
  message(message: string): ResponseBuilder;
  meta(meta: Partial<ResponseMeta>): ResponseBuilder;
  status(statusCode: number): ResponseBuilder;
  header(key: string, value: string): ResponseBuilder;
  cache(ttl: number): ResponseBuilder;
  send(): Response;
}
