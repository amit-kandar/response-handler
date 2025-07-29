# TypeScript Types

Complete TypeScript type definitions for Response Handler.

## Core Types

### Configuration Types

```typescript
interface Config {
  enableLogging?: boolean;
  logLevel?: LogLevel;
  environment?: Environment;
  enablePerformanceTracking?: boolean;
  enableSecurity?: boolean;
  customLoggers?: CustomLoggers;
  responseHeaders?: Record<string, string>;
  rateLimiting?: RateLimitConfig;
  sanitization?: SanitizationConfig;
  cors?: CorsConfig;
}

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';
type Environment = 'development' | 'test' | 'production';

interface CustomLoggers {
  info?: (message: string, meta?: any) => void;
  error?: (message: string, meta?: any) => void;
  debug?: (message: string, meta?: any) => void;
  warn?: (message: string, meta?: any) => void;
}

interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  max: number;
  message?: string;
}

interface SanitizationConfig {
  enabled: boolean;
  options: {
    removeNullBytes?: boolean;
    trimWhitespace?: boolean;
    escapeHtml?: boolean;
  };
}

interface CorsConfig {
  origin: string | string[] | boolean;
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}
```

### Response Types

```typescript
interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: string;
  executionTime: string;
  requestId?: string;
}

interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  pagination?: PaginationInfo;
  performance?: PerformanceInfo;
  metadata?: ResponseMetadata;
}

interface ErrorResponse extends BaseResponse {
  success: false;
  error: ErrorInfo;
  stack?: string; // Only in development
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PerformanceInfo {
  executionTime: string;
  dbQueryTime?: string;
  cacheHit?: boolean;
  memoryUsage?: string;
}

interface ResponseMetadata {
  apiVersion?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface ErrorInfo {
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  validationErrors?: ValidationError[];
  stack?: string;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
  type?: string;
}
```

## Express Types

### Enhanced Request Type

```typescript
interface EnhancedRequest extends Request {
  requestId: string;
  startTime: number;
  userAgent: string;
  clientIP: string;
  correlationId?: string;
  sessionData?: any;
  metadata: RequestMetadata;
  user?: AuthenticatedUser;
  rateLimit?: RateLimitInfo;
  context?: RequestContext;
}

interface RequestMetadata {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  timestamp: string;
  source: string;
  customData?: Record<string, any>;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  startTime: number;
  [key: string]: any;
}
```

### Enhanced Response Type

```typescript
interface EnhancedResponse extends Response {
  // Success responses
  ok<T>(data: T, message?: string, options?: ResponseOptions): void;
  created<T>(data: T, message?: string, options?: ResponseOptions): void;
  accepted<T>(data: T, message?: string, options?: ResponseOptions): void;
  noContent(message?: string): void;
  
  // Client error responses
  badRequest(error: any, message?: string, options?: ResponseOptions): void;
  unauthorized(error: any, message?: string, options?: ResponseOptions): void;
  forbidden(error: any, message?: string, options?: ResponseOptions): void;
  notFound(error: any, message?: string, options?: ResponseOptions): void;
  methodNotAllowed(error: any, message?: string, options?: ResponseOptions): void;
  conflict(error: any, message?: string, options?: ResponseOptions): void;
  unprocessableEntity(error: any, message?: string, options?: ResponseOptions): void;
  tooManyRequests(error: any, message?: string, options?: ResponseOptions): void;
  
  // Server error responses
  error(error: any, message?: string, options?: ResponseOptions): void;
  notImplemented(error: any, message?: string, options?: ResponseOptions): void;
  badGateway(error: any, message?: string, options?: ResponseOptions): void;
  serviceUnavailable(error: any, message?: string, options?: ResponseOptions): void;
}

interface ResponseOptions {
  headers?: Record<string, string>;
  pagination?: PaginationInfo;
  performance?: PerformanceInfo;
  metadata?: ResponseMetadata;
  statusCode?: number;
}
```

## Socket.IO Types

### Enhanced Socket Type

```typescript
interface EnhancedSocket extends Socket {
  // Success responses
  ok<T>(data: T, message?: string, options?: SocketResponseOptions): void;
  created<T>(data: T, message?: string, options?: SocketResponseOptions): void;
  accepted<T>(data: T, message?: string, options?: SocketResponseOptions): void;
  
  // Client error responses
  badRequest(error: any, message?: string, options?: SocketResponseOptions): void;
  unauthorized(error: any, message?: string, options?: SocketResponseOptions): void;
  forbidden(error: any, message?: string, options?: SocketResponseOptions): void;
  notFound(error: any, message?: string, options?: SocketResponseOptions): void;
  conflict(error: any, message?: string, options?: SocketResponseOptions): void;
  
  // Server error responses
  error(error: any, message?: string, options?: SocketResponseOptions): void;
  
  // Socket-specific methods
  toRoom(room: string): EnhancedSocket;
  toUser(userId: string): EnhancedSocket;
  broadcast: EnhancedSocket;
}

interface SocketResponseOptions {
  event?: string;
  room?: string;
  userId?: string;
  broadcast?: boolean;
  metadata?: ResponseMetadata;
}
```

### Socket Event Types

```typescript
interface SocketEventHandler<T = any> {
  (socket: EnhancedSocket, data: T): Promise<void> | void;
}

interface SocketMiddleware {
  (socket: EnhancedSocket, next: (err?: Error) => void): void;
}

interface SocketConfig extends Config {
  namespace?: string;
  connectionTimeout?: number;
  maxConnections?: number;
  enableRooms?: boolean;
  enableBroadcast?: boolean;
}
```

## Middleware Types

### Middleware Functions

```typescript
interface ResponseHandlerMiddleware {
  (req: EnhancedRequest, res: EnhancedResponse, next: NextFunction): void;
}

interface ErrorHandlerMiddleware {
  (
    error: Error,
    req: EnhancedRequest,
    res: EnhancedResponse,
    next: NextFunction
  ): void;
}

interface AuthMiddleware {
  (req: EnhancedRequest, res: EnhancedResponse, next: NextFunction): void;
}

interface ValidationMiddleware<T = any> {
  (schema: ValidationSchema<T>): ResponseHandlerMiddleware;
}

interface ValidationSchema<T> {
  body?: SchemaDefinition<T>;
  query?: SchemaDefinition<any>;
  params?: SchemaDefinition<any>;
  headers?: SchemaDefinition<any>;
}

interface SchemaDefinition<T> {
  [K in keyof T]: FieldValidation;
}

interface FieldValidation {
  type: 'string' | 'number' | 'boolean' | 'email' | 'date' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  default?: any;
  transform?: (value: any) => any;
  validate?: (value: any) => boolean | string;
}
```

## Error Types

### Custom Error Classes

```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  details: Record<string, any>;
  timestamp: string;
  isOperational: boolean;
  
  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: Record<string, any>
  );
  
  toJSON(): ErrorInfo;
}

class ValidationError extends AppError {
  validationErrors: ValidationError[];
  
  constructor(message?: string, validationErrors?: ValidationError[]);
  
  static fromJoi(joiError: any): ValidationError;
  static fromExpressValidator(errors: any[]): ValidationError;
  
  addField(field: string, message: string, value?: any): ValidationError;
}

class BusinessError extends AppError {
  constructor(message: string, code: string, details?: Record<string, any>);
}

class AuthenticationError extends AppError {
  constructor(message?: string);
}

class AuthorizationError extends AppError {
  requiredRole: string;
  userRole: string;
  resource?: string;
  
  constructor(requiredRole: string, userRole: string, resource?: string);
}
```

## Logger Types

```typescript
interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  log(level: LogLevel, message: string, meta?: any): void;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  meta?: any;
}

interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text';
  transports: LogTransport[];
  filters?: LogFilter[];
}

interface LogTransport {
  type: 'console' | 'file' | 'database' | 'external';
  options: Record<string, any>;
}

interface LogFilter {
  (entry: LogEntry): boolean;
}
```

## Utility Types

### Helper Types

```typescript
type ResponseMethod = 
  | 'ok'
  | 'created'
  | 'accepted'
  | 'noContent'
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'error';

type HttpStatusCode = 
  | 200 | 201 | 202 | 204
  | 400 | 401 | 403 | 404 | 405 | 409 | 422 | 429
  | 500 | 501 | 502 | 503;

type ContentType = 
  | 'application/json'
  | 'application/xml'
  | 'text/html'
  | 'text/plain'
  | 'multipart/form-data';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: ResponseHandlerMiddleware;
  middleware?: ResponseHandlerMiddleware[];
  validation?: ValidationSchema<any>;
  auth?: boolean;
  roles?: string[];
  rateLimit?: RateLimitConfig;
}
```

## Module Exports

```typescript
// Main exports
export function quickSetup(config?: Config): ResponseHandlerMiddleware;
export function quickSocketSetup(config?: SocketConfig): SocketMiddleware;

// Core classes
export { AppError, ValidationError, BusinessError };
export { Logger };
export { ResponseBuilder };

// Types
export type {
  Config,
  EnhancedRequest,
  EnhancedResponse,
  EnhancedSocket,
  SuccessResponse,
  ErrorResponse,
  PaginationInfo,
  PerformanceInfo,
  ResponseMetadata,
  ErrorInfo,
  ValidationError as ValidationErrorType,
  AuthenticatedUser,
  RequestContext,
  ResponseOptions,
  SocketResponseOptions,
  LogLevel,
  Environment,
  CustomLoggers,
  ApiEndpoint
};

// Utility functions
export function createValidationMiddleware<T>(
  schema: ValidationSchema<T>
): ResponseHandlerMiddleware;

export function createAuthMiddleware(
  options: AuthMiddlewareOptions
): AuthMiddleware;

export function createRateLimitMiddleware(
  config: RateLimitConfig
): ResponseHandlerMiddleware;
```

## Usage Examples

### Express with TypeScript

```typescript
import express from 'express';
import { quickSetup, Config, EnhancedRequest, EnhancedResponse } from 'response-handler';

const app = express();

const config: Config = {
  enableLogging: true,
  logLevel: 'info',
  environment: 'development'
};

app.use(quickSetup(config));

interface User {
  id: string;
  email: string;
  name: string;
}

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

app.get('/api/users', (req: EnhancedRequest, res: EnhancedResponse) => {
  const users: User[] = getUsersFromDatabase();
  res.ok(users, 'Users retrieved successfully');
});

app.post('/api/users', (req: EnhancedRequest, res: EnhancedResponse) => {
  const userData: CreateUserRequest = req.body;
  
  if (!userData.email || !userData.password) {
    return res.badRequest(
      { missingFields: ['email', 'password'] },
      'Missing required fields'
    );
  }
  
  const user: User = createUser(userData);
  res.created(user, 'User created successfully');
});
```

### Socket.IO with TypeScript

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup, EnhancedSocket, SocketConfig } from 'response-handler';

const io = new Server(server);

const config: SocketConfig = {
  enableLogging: true,
  enableRooms: true
};

io.use(quickSocketSetup(config));

interface ChatMessage {
  roomId: string;
  content: string;
  userId: string;
}

io.on('connection', (socket: EnhancedSocket) => {
  socket.on('send-message', (data: ChatMessage) => {
    if (!data.content || !data.roomId) {
      return socket.badRequest(
        { missingFields: ['content', 'roomId'] },
        'Missing required message fields'
      );
    }
    
    const message = createMessage(data);
    socket.toRoom(data.roomId).ok(message, 'Message sent successfully');
  });
});
```

This comprehensive type system ensures full type safety when using Response Handler with TypeScript.
