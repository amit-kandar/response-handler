# Response Interfaces

This page documents the TypeScript interfaces and types for response handling.

## Base Response Interface

```typescript
interface BaseResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  requestId?: string;
}
```

## Success Response Interface

```typescript
interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

interface ResponseMeta {
  pagination?: PaginationMeta;
  performance?: PerformanceMeta;
  cache?: CacheMeta;
}
```

## Error Response Interface

```typescript
interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    field?: string;
    value?: any;
  };
}
```

## Pagination Meta Interface

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}
```

## Performance Meta Interface

```typescript
interface PerformanceMeta {
  responseTime: number;
  queryTime?: number;
  cacheHit?: boolean;
  totalQueries?: number;
}
```

## Cache Meta Interface

```typescript
interface CacheMeta {
  cached: boolean;
  cacheKey?: string;
  ttl?: number;
  createdAt?: string;
  expiresAt?: string;
}
```

## Socket.IO Response Interfaces

```typescript
interface SocketResponse<T = any> {
  event: string;
  data: T;
  success: boolean;
  timestamp: string;
  room?: string;
  namespace?: string;
}

interface SocketErrorResponse {
  event: 'error';
  error: {
    code: string;
    message: string;
    details?: any;
  };
  success: false;
  timestamp: string;
}
```

## Request Enhancement Interface

```typescript
interface EnhancedRequest extends Request {
  sendSuccess<T>(data: T, message?: string, meta?: ResponseMeta): void;
  sendError(code: string, message: string, details?: any): void;
  sendPaginated<T>(data: T[], pagination: PaginationMeta, message?: string): void;
  sendCreated<T>(data: T, message?: string): void;
  sendUpdated<T>(data: T, message?: string): void;
  sendDeleted(message?: string): void;
  sendNotFound(message?: string): void;
  sendValidationError(errors: ValidationError[]): void;
}
```

## Response Enhancement Interface

```typescript
interface EnhancedResponse extends Response {
  success<T>(data: T, message?: string, meta?: ResponseMeta): this;
  error(code: string, message: string, details?: any): this;
  paginated<T>(data: T[], pagination: PaginationMeta, message?: string): this;
  created<T>(data: T, message?: string): this;
  updated<T>(data: T, message?: string): this;
  deleted(message?: string): this;
  notFound(message?: string): this;
  validationError(errors: ValidationError[]): this;
}
```

## Validation Error Interface

```typescript
interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}
```

## Socket Enhancement Interface

```typescript
interface EnhancedSocket extends Socket {
  sendSuccess<T>(event: string, data: T, message?: string, room?: string): void;
  sendError(code: string, message: string, details?: any, room?: string): void;
  sendToRoom<T>(room: string, event: string, data: T, message?: string): void;
  broadcastSuccess<T>(event: string, data: T, message?: string, excludeRooms?: string[]): void;
  broadcastError(code: string, message: string, details?: any, excludeRooms?: string[]): void;
}
```

## HTTP Status Code Types

```typescript
type SuccessStatusCode = 200 | 201 | 202 | 204;
type ErrorStatusCode = 400 | 401 | 403 | 404 | 422 | 500 | 502 | 503;
type StatusCode = SuccessStatusCode | ErrorStatusCode;
```

## Response Builder Options

```typescript
interface ResponseBuilderOptions {
  includeTimestamp?: boolean;
  includeRequestId?: boolean;
  timestampFormat?: string;
  defaultSuccessMessage?: string;
  defaultErrorMessage?: string;
  enableCompression?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
}
```

## Example Usage

```typescript
// Success response
const userResponse: SuccessResponse<User> = {
  success: true,
  data: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  message: 'User retrieved successfully',
  timestamp: '2025-01-20T10:30:00Z',
  requestId: 'req-123',
  meta: {
    performance: {
      responseTime: 45,
      queryTime: 12,
      cacheHit: false,
    },
  },
};

// Error response
const errorResponse: ErrorResponse = {
  success: false,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'User with ID 123 not found',
    details: { userId: 123 },
  },
  message: 'Failed to retrieve user',
  timestamp: '2025-01-20T10:30:00Z',
  requestId: 'req-124',
};

// Paginated response
const paginatedResponse: SuccessResponse<User[]> = {
  success: true,
  data: [
    /* users array */
  ],
  message: 'Users retrieved successfully',
  timestamp: '2025-01-20T10:30:00Z',
  meta: {
    pagination: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8,
      hasNext: true,
      hasPrev: false,
      nextPage: 2,
    },
  },
};
```

## Type Guards

```typescript
function isSuccessResponse<T>(
  response: SuccessResponse<T> | ErrorResponse,
): response is SuccessResponse<T> {
  return response.success === true;
}

function isErrorResponse(
  response: SuccessResponse<any> | ErrorResponse,
): response is ErrorResponse {
  return response.success === false;
}

function hasPagination(meta?: ResponseMeta): meta is Required<Pick<ResponseMeta, 'pagination'>> {
  return meta?.pagination !== undefined;
}
```
