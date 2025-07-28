# Response Builder API Reference

The ResponseBuilder class provides the core response building functionality.

## ResponseBuilder Class

```typescript
import { ResponseBuilder } from '@amitkandar/response-handler';

const builder = new ResponseBuilder(config, logger, req, res);
```

## Constructor Parameters

- `config` - ResponseHandlerConfig object
- `logger` - Logger instance
- `req` - Express request object
- `res` - Express response object

## Success Methods

### `ok(data, message)`
Creates a 200 OK response:

```typescript
builder.ok({ users: [...] }, 'Users retrieved successfully');
// Returns: { success: true, data: {...}, message: '...' }
```

### `created(data, message)`
Creates a 201 Created response:

```typescript
builder.created(newUser, 'User created successfully');
// Returns: { success: true, data: {...}, message: '...' }
```

### `accepted(data, message)`
Creates a 202 Accepted response:

```typescript
builder.accepted({ jobId: 123 }, 'Job queued for processing');
// Returns: { success: true, data: {...}, message: '...' }
```

### `noContent(message)`
Creates a 204 No Content response:

```typescript
builder.noContent('User deleted successfully');
// Returns: { success: true, message: '...' }
```

## Error Methods

### `badRequest(error, message)`
Creates a 400 Bad Request response:

```typescript
builder.badRequest({ field: 'email' }, 'Invalid email format');
// Returns: { success: false, error: {...}, message: '...' }
```

### `unauthorized(error, message)`
Creates a 401 Unauthorized response:

```typescript
builder.unauthorized({ reason: 'invalid_token' }, 'Authentication required');
// Returns: { success: false, error: {...}, message: '...' }
```

### `forbidden(error, message)`
Creates a 403 Forbidden response:

```typescript
builder.forbidden({ role: 'user' }, 'Admin access required');
// Returns: { success: false, error: {...}, message: '...' }
```

### `notFound(error, message)`
Creates a 404 Not Found response:

```typescript
builder.notFound({ id: 123 }, 'User not found');
// Returns: { success: false, error: {...}, message: '...' }
```

### `conflict(error, message)`
Creates a 409 Conflict response:

```typescript
builder.conflict({ email: 'john@example.com' }, 'Email already exists');
// Returns: { success: false, error: {...}, message: '...' }
```

### `unprocessableEntity(error, message)`
Creates a 422 Unprocessable Entity response:

```typescript
builder.unprocessableEntity({ field: 'age' }, 'Age must be a number');
// Returns: { success: false, error: {...}, message: '...' }
```

### `tooManyRequests(error, message)`
Creates a 429 Too Many Requests response:

```typescript
builder.tooManyRequests({ limit: 100 }, 'Rate limit exceeded');
// Returns: { success: false, error: {...}, message: '...' }
```

### `internalServerError(error, message)`
Creates a 500 Internal Server Error response:

```typescript
builder.internalServerError(error, 'Database connection failed');
// Returns: { success: false, error: {...}, message: '...' }
```

## Generic Methods

### `respond(statusCode, data, message)`
Creates a custom response with any status code:

```typescript
builder.respond(418, { teapot: true }, "I'm a teapot");
// Returns custom response with status 418
```

### `error(error, statusCode)`
Creates an error response with automatic status detection:

```typescript
const error = new Error('Something went wrong');
error.statusCode = 422;

builder.error(error);
// Automatically uses status 422 from error object
```

### `paginate(data, pagination, message)`
Creates a paginated response:

```typescript
const pagination = {
  page: 1,
  limit: 10,
  total: 100,
  totalPages: 10,
  hasNext: true,
  hasPrev: false
};

builder.paginate(users, pagination, 'Users retrieved');
// Returns: { success: true, data: [...], meta: { pagination: {...} } }
```

## Response Building Process

### 1. Data Processing
The ResponseBuilder processes input data and applies transformations:

```typescript
// Input
const userData = { id: 1, name: 'John', password: 'secret' };

// Processing (removes sensitive fields, applies formatting)
const processedData = builder.processData(userData);
```

### 2. Error Sanitization
Errors are sanitized based on environment and security settings:

```typescript
// Development mode - full error details
{
  error: {
    message: 'Database connection failed',
    type: 'DatabaseError',
    code: 'CONN_FAILED',
    stack: '...',
    details: {...}
  }
}

// Production mode - sanitized errors
{
  error: {
    message: 'An internal error occurred',
    type: 'Error',
    code: 'INTERNAL_ERROR'
  }
}
```

### 3. Metadata Generation
Metadata is automatically added based on configuration:

```typescript
{
  success: true,
  data: {...},
  message: '...',
  meta: {
    requestId: 'req-123-456',
    timestamp: '2023-01-01T12:00:00.000Z',
    executionTime: 150,
    environment: 'development',
    version: '1.0.0'
  }
}
```

## Private Methods

The ResponseBuilder uses several private methods internally:

### `buildResponse(success, data, message, error)`
Core method that builds the response object:

```typescript
private buildResponse(success: boolean, data?: any, message?: string, error?: any): ApiResponse
```

### `sanitizeError(error)`
Sanitizes error objects based on security settings:

```typescript
private sanitizeError(error: any): ErrorInfo
```

### `generateMeta()`
Generates metadata for responses:

```typescript
private generateMeta(): ResponseMeta
```

### `logResponse(statusCode, responseData, error?)`
Logs response information:

```typescript
private logResponse(statusCode: number, responseData: any, error?: any): void
```

### `sendResponse(statusCode, data?, message?, error?)`
Sends the final response with headers and logging:

```typescript
private sendResponse(statusCode: number, data?: any, message?: string, error?: any): Response
```

## Configuration Impact

Different configuration options affect the ResponseBuilder behavior:

### Mode Configuration
```typescript
// Development mode
{
  mode: 'development'
  // Includes full error details, stack traces, debug info
}

// Production mode  
{
  mode: 'production'
  // Sanitizes errors, hides internal details
}
```

### Security Configuration
```typescript
{
  security: {
    sanitizeErrors: true,           // Remove sensitive error data
    hideInternalErrors: true,       // Hide internal error details
    allowedErrorFields: [           // Which error fields to include
      'message', 'type', 'code'
    ]
  }
}
```

### Response Configuration
```typescript
{
  responses: {
    includeRequestId: true,         // Add request ID to responses
    includeTimestamp: true,         // Add timestamp to responses
    includeExecutionTime: true,     // Add execution time tracking
    customFields: {                 // Add custom metadata fields
      version: '1.0.0',
      environment: 'production'
    }
  }
}
```

## Error Types

The ResponseBuilder handles different error types:

### Standard Errors
```typescript
const error = new Error('Something went wrong');
builder.error(error);
// Uses default status 500
```

### Custom Errors with Status
```typescript
const error = new Error('Validation failed');
error.statusCode = 422;
builder.error(error);
// Uses status 422 from error
```

### Validation Errors
```typescript
const error = {
  message: 'Validation failed',
  field: 'email',
  value: 'invalid-email'
};
builder.badRequest(error, 'Invalid input');
```

## Headers and Additional Processing

The ResponseBuilder automatically handles:

### Security Headers
```typescript
// When security.corsHeaders is enabled
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
```

### Request ID Headers
```typescript
// When responses.includeRequestId is enabled
'X-Request-ID': 'req-123-456-789'
```

### Cache Headers
```typescript
// When performance.enableCaching is enabled
'Cache-Control': 'public, max-age=300'
'ETag': '"abc123"'
```

## Usage in Middleware

The ResponseBuilder is used internally by the response handler middleware:

```typescript
// In middleware
const builder = new ResponseBuilder(config, logger, req, res);

// Enhance response object
res.ok = (data, message) => builder.ok(data, message);
res.error = (error, statusCode) => builder.error(error, statusCode);
// ... other methods
```

## Testing ResponseBuilder

```typescript
import { ResponseBuilder } from '@amitkandar/response-handler';

describe('ResponseBuilder', () => {
  let builder, mockReq, mockRes, mockLogger, config;
  
  beforeEach(() => {
    mockReq = { requestId: 'test-123', startTime: Date.now() };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockLogger = { logResponse: jest.fn(), logEvent: jest.fn() };
    config = { mode: 'test', responses: {}, security: {} };
    
    builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);
  });
  
  it('should create ok response', () => {
    builder.ok({ test: 'data' }, 'Success');
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { test: 'data' },
      message: 'Success'
    });
  });
});
```
