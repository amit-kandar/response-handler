# Express API Reference

Complete API reference for Express integration.

## Quick Setup

```typescript
import { quickSetup } from '@amitkandar/response-handler';

const { middleware, errorHandler } = quickSetup(config);
app.use(middleware);
app.use(errorHandler); // Must be last
```

## Enhanced Response Methods

All methods are available on the Express response object after applying middleware.

### Success Responses

#### `res.ok(data, message)`
```typescript
res.ok({ users: [1, 2, 3] }, 'Users retrieved successfully');
// Status: 200
```

#### `res.created(data, message)`
```typescript
res.created({ id: 123, name: 'John' }, 'User created');
// Status: 201
```

#### `res.accepted(data, message)`
```typescript
res.accepted({ jobId: 456 }, 'Job queued for processing');
// Status: 202
```

#### `res.noContent(message)`
```typescript
res.noContent('User deleted successfully');
// Status: 204
```

### Error Responses

#### `res.badRequest(error, message)`
```typescript
res.badRequest({ field: 'email' }, 'Invalid email format');
// Status: 400
```

#### `res.unauthorized(error, message)`
```typescript
res.unauthorized(null, 'Authentication required');
// Status: 401
```

#### `res.forbidden(error, message)`
```typescript
res.forbidden({ role: 'user' }, 'Admin access required');
// Status: 403
```

#### `res.notFound(error, message)`
```typescript
res.notFound({ id: 123 }, 'User not found');
// Status: 404
```

#### `res.conflict(error, message)`
```typescript
res.conflict({ email: 'john@example.com' }, 'Email already exists');
// Status: 409
```

#### `res.unprocessableEntity(error, message)`
```typescript
res.unprocessableEntity({ field: 'age' }, 'Age must be a number');
// Status: 422
```

#### `res.tooManyRequests(error, message)`
```typescript
res.tooManyRequests({ limit: 100 }, 'Rate limit exceeded');
// Status: 429
```

#### `res.internalServerError(error, message)`
```typescript
res.internalServerError(error, 'Database connection failed');
// Status: 500
```

### Generic Methods

#### `res.respond(statusCode, data, message)`
```typescript
res.respond(418, { teapot: true }, "I'm a teapot");
```

#### `res.error(error, statusCode)`
```typescript
res.error(new Error('Something went wrong'), 500);
```

#### `res.paginate(data, pagination, message)`
```typescript
res.paginate(users, {
  page: 1,
  limit: 10,
  total: 100,
  totalPages: 10
}, 'Users retrieved');
```

## Enhanced Request Properties

The middleware adds these properties to the request object:

```typescript
interface EnhancedRequest extends Request {
  requestId: string;    // Unique request identifier
  startTime: number;    // Request start timestamp
  context: any;         // Request-specific context
}
```

## Response Format

All responses follow this consistent format:

```typescript
interface ApiResponse {
  success: boolean;
  data?: any;           // For successful responses
  message?: string;     // Human-readable message
  error?: ErrorInfo;    // For error responses
  meta?: ResponseMeta;  // Metadata (request ID, timing, etc.)
}
```

## Error Handling

The error handler automatically catches and formats errors:

```typescript
app.use((req, res, next) => {
  throw new Error('Something went wrong');
  // Automatically becomes formatted error response
});
```

## File Downloads

Enhanced file download methods:

```typescript
res.downloadFile('/path/to/file.pdf', 'document.pdf');
```

## Middleware Options

```typescript
const { middleware } = quickSetup({
  // Adds request ID to response headers
  responses: { includeRequestId: true },
  
  // Enable CORS headers
  security: { corsHeaders: true },
  
  // Custom error field filtering
  security: { 
    allowedErrorFields: ['message', 'type', 'code'] 
  }
});
```
