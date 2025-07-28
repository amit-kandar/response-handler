# API Reference

Complete API documentation for the Enhanced Response Handler.

## Table of Contents

- [Quick Setup Functions](#quick-setup-functions)
- [Express Response Methods](#express-response-methods)
- [Socket.IO Response Methods](#socketio-response-methods)
- [Configuration Options](#configuration-options)
- [TypeScript Types](#typescript-types)

## Quick Setup Functions

### `quickSetup(config?)`

Sets up Express middleware with response handler capabilities.

```typescript
import { quickSetup } from '@amitkandar/response-handler';

const { middleware, errorHandler, logger } = quickSetup({
  mode: 'development',
  logging: { enabled: true }
});
```

**Parameters:**
- `config` (optional): `ResponseHandlerConfig` - Configuration object

**Returns:**
```typescript
{
  middleware: Function,     // Express middleware function
  errorHandler: Function,   // Express error handler
  logger: Logger,          // Logger instance
  updateConfig: Function   // Function to update configuration
}
```

### `quickSocketSetup(config?)`

Sets up Socket.IO response handler capabilities.

```typescript
import { quickSocketSetup } from '@amitkandar/response-handler';

const { enhance, wrapper, setupServer, logger } = quickSocketSetup({
  mode: 'development'
});
```

**Parameters:**
- `config` (optional): `ResponseHandlerConfig` - Configuration object

**Returns:**
```typescript
{
  enhance: Function,       // Socket response enhancer
  wrapper: Function,       // Error wrapper for handlers
  setupServer: Function,   // Server setup utility
  logger: Logger          // Logger instance
}
```

## Express Response Methods

After applying the middleware, the Express response object is enhanced with these methods:

### Success Responses

#### `res.ok(data?, message?)`
Sends a 200 OK response.

```typescript
res.ok({ users: [...] }, 'Users retrieved successfully');
```

#### `res.created(data?, message?)`
Sends a 201 Created response.

```typescript
res.created(newUser, 'User created successfully');
```

#### `res.accepted(data?, message?)`
Sends a 202 Accepted response.

```typescript
res.accepted(null, 'Request accepted for processing');
```

#### `res.noContent(message?)`
Sends a 204 No Content response.

```typescript
res.noContent('User deleted successfully');
```

### Error Responses

#### `res.badRequest(error?, message?)`
Sends a 400 Bad Request response.

```typescript
res.badRequest({ field: 'email' }, 'Invalid email format');
```

#### `res.unauthorized(error?, message?)`
Sends a 401 Unauthorized response.

```typescript
res.unauthorized(null, 'Authentication required');
```

#### `res.forbidden(error?, message?)`
Sends a 403 Forbidden response.

```typescript
res.forbidden(null, 'Access denied');
```

#### `res.notFound(error?, message?)`
Sends a 404 Not Found response.

```typescript
res.notFound({ resource: 'user', id: 123 }, 'User not found');
```

#### `res.conflict(error?, message?)`
Sends a 409 Conflict response.

```typescript
res.conflict({ email: 'john@example.com' }, 'User already exists');
```

#### `res.unprocessableEntity(error?, message?)`
Sends a 422 Unprocessable Entity response.

```typescript
res.unprocessableEntity(validationErrors, 'Validation failed');
```

#### `res.tooManyRequests(error?, message?)`
Sends a 429 Too Many Requests response.

```typescript
res.tooManyRequests(null, 'Rate limit exceeded');
```

#### `res.internalServerError(error?, message?)`
Sends a 500 Internal Server Error response.

```typescript
res.internalServerError(error, 'Something went wrong');
```

### Generic Responses

#### `res.respond(statusCode, data?, message?)`
Sends a response with custom status code.

```typescript
res.respond(418, { teapot: true }, "I'm a teapot");
```

#### `res.error(error, statusCode?)`
Sends an error response with auto-detected or specified status code.

```typescript
res.error(new Error('Custom error'), 422);
```

#### `res.paginate(data, pagination, message?)`
Sends a paginated response.

```typescript
res.paginate(posts, {
  page: 1,
  limit: 10,
  total: 100,
  totalPages: 10,
  hasNext: true,
  hasPrev: false
}, 'Posts retrieved');
```

### File Responses

#### `res.downloadFile(filePath, filename?)`
Initiates file download with logging.

```typescript
res.downloadFile('/path/to/file.pdf', 'document.pdf');
```

#### `res.streamResponse(stream, contentType?)`
Streams data with optional content type.

```typescript
res.streamResponse(fileStream, 'application/pdf');
```

## Socket.IO Response Methods

### Basic Usage

```typescript
const response = enhance(socket, 'event-name');
```

### Success Methods

#### `response.ok(data?, message?)`
Emits a success response.

```typescript
response.ok(userData, 'User data retrieved');
```

#### `response.created(data?, message?)`
Emits a creation success response.

```typescript
response.created(newPost, 'Post created successfully');
```

### Error Methods

#### `response.error(error, code?)`
Emits an error response.

```typescript
response.error(new Error('Something went wrong'), 'ERR_001');
```

#### `response.badRequest(error?, message?)`
Emits a bad request error.

```typescript
response.badRequest({ field: 'userId' }, 'User ID is required');
```

#### `response.unauthorized(error?, message?)`
Emits an unauthorized error.

```typescript
response.unauthorized(null, 'Invalid token');
```

#### `response.forbidden(error?, message?)`
Emits a forbidden error.

```typescript
response.forbidden(null, 'Access denied');
```

#### `response.notFound(error?, message?)`
Emits a not found error.

```typescript
response.notFound({ userId: 123 }, 'User not found');
```

### Targeting Methods

#### `response.toRoom(roomId)`
Targets a specific room.

```typescript
response.toRoom('room-123').ok(message, 'New message');
```

#### `response.toSocket(socketId)`
Targets a specific socket.

```typescript
response.toSocket('socket-456').error(error);
```

### Error Wrapper

#### `wrapper(handler)`
Wraps socket handlers with automatic error handling.

```typescript
socket.on('event', wrapper(async (socket, response, data) => {
  // Handler code - errors are automatically caught
  const result = await someAsyncOperation(data);
  response.ok(result);
}));
```

## Configuration Options

### `ResponseHandlerConfig`

```typescript
interface ResponseHandlerConfig {
  mode?: 'development' | 'production';
  logging?: LoggingConfig;
  responses?: ResponseConfig;
  security?: SecurityConfig;
  performance?: PerformanceConfig;
}
```

### `LoggingConfig`

```typescript
interface LoggingConfig {
  enabled?: boolean;                    // Enable/disable logging
  level?: 'error' | 'warn' | 'info' | 'debug';  // Log level
  logErrors?: boolean;                  // Log error events
  logRequests?: boolean;                // Log incoming requests
  logResponses?: boolean;               // Log outgoing responses
  includeStack?: boolean;               // Include stack traces
  includeRequest?: boolean;             // Include request details
  customLogger?: (level, message, meta?) => void;  // Custom logger
}
```

### `ResponseConfig`

```typescript
interface ResponseConfig {
  includeTimestamp?: boolean;           // Include timestamp in responses
  includeRequestId?: boolean;           // Include request ID in responses
  includeExecutionTime?: boolean;       // Include execution time
  customFields?: Record<string, any>;   // Custom fields in meta
  pagination?: boolean;                 // Enable pagination helpers
  compression?: boolean;                // Enable response compression
}
```

### `SecurityConfig`

```typescript
interface SecurityConfig {
  sanitizeErrors?: boolean;             // Sanitize error messages
  hideInternalErrors?: boolean;         // Hide internal error details
  allowedErrorFields?: string[];        // Allowed error fields
  rateLimiting?: boolean;               // Enable rate limiting
  corsHeaders?: boolean;                // Set CORS security headers
}
```

### `PerformanceConfig`

```typescript
interface PerformanceConfig {
  enableCaching?: boolean;              // Enable response caching
  cacheHeaders?: boolean;               // Set cache control headers
  etag?: boolean;                       // Enable ETag headers
  compression?: boolean;                // Enable response compression
}
```

## TypeScript Types

### Request Enhancement

```typescript
interface EnhancedRequest extends Request {
  requestId?: string;      // Auto-generated request ID
  startTime?: number;      // Request start timestamp
  context?: Record<string, any>;  // Request context object
}
```

### Response Enhancement

```typescript
interface EnhancedResponse extends Response {
  // Success methods
  ok: (data?: any, message?: string) => Response;
  created: (data?: any, message?: string) => Response;
  // ... other methods
}
```

### Socket Response

```typescript
interface SocketResponse {
  ok: (data?: any, message?: string) => void;
  created: (data?: any, message?: string) => void;
  error: (error: any, code?: string) => void;
  toRoom: (room: string) => SocketResponse;
  toSocket: (socketId: string) => SocketResponse;
}
```

### Response Format

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ErrorInfo;
  meta?: ResponseMeta;
}
```

### Error Information

```typescript
interface ErrorInfo {
  message?: string;
  type?: string;
  code?: string | number;
  details?: any;
  stack?: string;
  timestamp?: string;
}
```

### Response Metadata

```typescript
interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  executionTime?: number;
  pagination?: PaginationInfo;
  version?: string;
  environment?: string;
}
```

### Pagination Information

```typescript
interface PaginationInfo {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}
```

## Response Examples

### Success Response (Development Mode)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "message": "User retrieved successfully",
  "meta": {
    "requestId": "req-abc123",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "executionTime": 150,
    "environment": "development",
    "version": "1.0.0"
  }
}
```

### Error Response (Development Mode)

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "message": "Validation failed",
    "type": "ValidationError",
    "code": "VALIDATION_FAILED",
    "details": {
      "email": "Invalid email format",
      "password": "Password too short"
    },
    "stack": "Error: Validation failed\n    at...",
    "timestamp": "2024-01-01T10:00:00.000Z"
  },
  "meta": {
    "requestId": "req-def456",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "executionTime": 75
  }
}
```

### Error Response (Production Mode)

```json
{
  "success": false,
  "message": "An internal error occurred",
  "error": {
    "type": "InternalError",
    "code": "ERR_INTERNAL"
  },
  "meta": {
    "requestId": "req-ghi789",
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "Post 1" },
    { "id": 2, "title": "Post 2" }
  ],
  "message": "Posts retrieved successfully",
  "meta": {
    "requestId": "req-jkl012",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "executionTime": 95,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Logger API

### Methods

```typescript
logger.info(message: string, meta?: any): void
logger.error(message: string, error?: any, meta?: any): void
logger.warn(message: string, meta?: any): void
logger.debug(message: string, meta?: any): void
logger.logRequest(req: any): void
logger.logResponse(req: any, res: any, responseData: any, executionTime?: number): void
logger.logEvent(event: ResponseEvent): void
logger.updateConfig(newConfig: Partial<LoggingConfig>): void
```

### Usage

```typescript
const { logger } = quickSetup();

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', error, { retryAttempt: 3 });
```

This API reference provides comprehensive documentation for all available methods and configuration options in the Enhanced Response Handler.
