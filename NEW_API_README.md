# 🚀 Enhanced Response Handler - Modern API

The next-generation response handler with middleware-based configuration, developer-friendly API, and comprehensive features.

## ✨ Key Features

- **🎯 One-line responses**: Just use `res.ok(data)` or `res.error(error)`
- **🔧 Middleware-based setup**: Configure once, use everywhere
- **🌍 Environment-aware**: Different behaviors for development vs production
- **📊 Built-in logging**: Comprehensive request/response/error logging
- **🔒 Security-first**: Automatic error sanitization in production
- **⚡ Performance optimized**: Built-in caching, compression, ETag support
- **🎭 Dual response modes**: Developer-friendly vs client-friendly responses
- **📡 Enhanced Socket.IO**: Modern API for real-time applications
- **📈 Request tracking**: Automatic request IDs and execution timing

## 🚀 Quick Start

### Installation

```bash
npm install @amitkandar/response-handler uuid
```

### Express Setup (Modern API)

```javascript
const express = require('express');
const { quickSetup } = require('@amitkandar/response-handler');

const app = express();
app.use(express.json());

// 🎉 One-line setup with powerful configuration
const { middleware, errorHandler } = quickSetup({
  mode: 'development', // 'production' for live apps
  logging: {
    enabled: true,
    logErrors: true,
    logRequests: true,
  },
  responses: {
    includeRequestId: true,
    includeExecutionTime: true,
  },
});

app.use(middleware);

// ✨ Modern, clean API
app.get('/users', async (req, res) => {
  const users = await getUsersFromDB();
  return res.ok(users, 'Users retrieved successfully');
});

app.post('/users', async (req, res) => {
  if (!req.body.email) {
    return res.badRequest({ field: 'email' }, 'Email is required');
  }

  const user = await createUser(req.body);
  return res.created(user);
});

app.use(errorHandler); // Must be last!
```

### Socket.IO Setup (Modern API)

```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');

const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true },
});

io.on('connection', (socket) => {
  // Simple event handling
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');

    if (!data.userId) {
      return response.badRequest('User ID required');
    }

    const user = getUserById(data.userId);
    response.ok(user);
  });

  // Automatic error handling with wrapper
  socket.on(
    'create-post',
    wrapper(async (socket, response, data) => {
      const post = await createPost(data);
      response.created(post);
      // Errors are automatically caught and emitted!
    }),
  );
});
```

## 📚 Complete API Reference

### Express Response Methods

```javascript
// ✅ Success Responses
res.ok(data, message); // 200 OK
res.created(data, message); // 201 Created
res.accepted(data, message); // 202 Accepted
res.noContent(message); // 204 No Content

// ❌ Error Responses
res.badRequest(error, message); // 400 Bad Request
res.unauthorized(error, message); // 401 Unauthorized
res.forbidden(error, message); // 403 Forbidden
res.notFound(error, message); // 404 Not Found
res.conflict(error, message); // 409 Conflict
res.unprocessableEntity(error, message); // 422 Unprocessable Entity
res.tooManyRequests(error, message); // 429 Too Many Requests
res.internalServerError(error, message); // 500 Internal Server Error

// 🔧 Generic Methods
res.respond(statusCode, data, message); // Custom status code
res.error(error, statusCode); // Auto-determine from error
res.paginate(data, pagination, message); // Paginated responses
```

### Socket.IO Response Methods

```javascript
const response = enhance(socket, 'event-name');

// Success responses
response.ok(data, message);
response.created(data, message);

// Error responses
response.error(error, code);
response.badRequest(error, message);
response.unauthorized(error, message);
response.forbidden(error, message);
response.notFound(error, message);

// Targeting
response.toRoom('room-name').ok(data);
response.toSocket('socket-id').error(error);
```

## ⚙️ Configuration Options

### Full Configuration Example

```javascript
const config = {
  // 🌍 Environment mode
  mode: 'development', // or 'production'

  // 📊 Logging configuration
  logging: {
    enabled: true,
    level: 'info', // 'error', 'warn', 'info', 'debug'
    logErrors: true,
    logRequests: true,
    logResponses: true,
    includeStack: true, // Include stack traces
    includeRequest: true, // Include request details
    customLogger: (level, message, meta) => {
      // Use your preferred logger (Winston, Bunyan, etc.)
    },
  },

  // 📝 Response configuration
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: { version: '1.0.0' },
    pagination: true,
  },

  // 🔒 Security configuration
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true, // true in production
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true,
  },

  // ⚡ Performance configuration
  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
    compression: true,
  },
};
```

## 🌟 Advanced Features

### 1. Response Modes

**Development Mode** (Detailed errors, full stack traces):

```json
{
  "success": false,
  "message": "Database connection failed",
  "error": {
    "type": "DatabaseError",
    "code": "CONN_FAILED",
    "details": { "host": "localhost", "port": 5432 },
    "stack": "Error: Database connection failed\n    at..."
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T10:00:00Z",
    "executionTime": 1250,
    "environment": "development"
  }
}
```

**Production Mode** (Sanitized, secure):

```json
{
  "success": false,
  "message": "An internal error occurred",
  "error": {
    "type": "InternalError",
    "code": "ERR_INTERNAL"
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

### 2. Automatic Request Tracking

Every request gets:

- Unique request ID
- Execution time tracking
- Comprehensive logging
- Error correlation

```javascript
app.get('/users', (req, res) => {
  console.log(req.requestId); // Auto-generated UUID
  console.log(req.startTime); // Request start timestamp
  // Response automatically includes execution time
});
```

### 3. Pagination Helper

```javascript
app.get('/posts', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const posts = await getPostsPaginated(page, limit);

  return res.paginate(posts, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: await getTotalPosts(),
    totalPages: Math.ceil((await getTotalPosts()) / limit),
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });
});
```

Response:

```json
{
  "success": true,
  "data": [...],
  "message": "Posts retrieved successfully",
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 4. Enhanced Socket.IO Features

#### Room Broadcasting

```javascript
socket.on('announcement', (data) => {
  const response = enhance(socket, 'announcement-sent');

  // Broadcast to all users in a room
  response.toRoom(data.roomId).ok(
    {
      message: data.message,
      from: socket.id,
      timestamp: new Date().toISOString(),
    },
    'New announcement',
  );

  // Confirm to sender
  response.ok({ messageId: Date.now() }, 'Announcement sent');
});
```

#### Private Messaging

```javascript
socket.on('private-message', (data) => {
  const response = enhance(socket, 'message-received');

  // Send to specific socket
  response.toSocket(data.targetId).ok({
    from: socket.id,
    message: data.message,
    private: true,
  });
});
```

#### Auto Error Handling

```javascript
socket.on(
  'risky-operation',
  wrapper(async (socket, response, data) => {
    // Any error thrown here is automatically caught and emitted
    const result = await riskyAsyncOperation(data);
    response.ok(result);
  }),
);
```

### 5. Custom Error Mapping

```javascript
const { createResponseHandler } = require('@amitkandar/response-handler');

const handler = createResponseHandler({
  errorMapping: {
    ValidationError: { statusCode: 422, clientMessage: 'Invalid input' },
    AuthError: { statusCode: 401, clientMessage: 'Authentication required' },
    RateLimitError: { statusCode: 429, clientMessage: 'Too many requests' },
  },
});
```

### 6. Middleware Integration

Works seamlessly with other Express middleware:

```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Other middleware first
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Then response handler
app.use(middleware);

// Your routes
app.get('/api/data', (req, res) => {
  res.ok({ message: 'All middleware working together!' });
});

// Error handler last
app.use(errorHandler);
```

## 📋 Migration Guide

### From Old API to New API

**Old way:**

```javascript
const { sendSuccess, sendError, errorHandler } = require('@amitkandar/response-handler');

app.get('/users', (req, res) => {
  try {
    const users = getUsers();
    sendSuccess(res, users, 'Users retrieved');
  } catch (error) {
    sendError(res, error);
  }
});

app.use(errorHandler);
```

**New way:**

```javascript
const { quickSetup } = require('@amitkandar/response-handler');
const { middleware, errorHandler } = quickSetup();

app.use(middleware);

app.get('/users', async (req, res) => {
  const users = await getUsers(); // Errors auto-caught by errorHandler
  return res.ok(users, 'Users retrieved');
});

app.use(errorHandler);
```

### Socket.IO Migration

**Old way:**

```javascript
const { emitSuccess, emitError } = require('@amitkandar/response-handler');

socket.on('get-user', (data) => {
  try {
    const user = getUser(data.id);
    emitSuccess({ socket, event: 'user-data', data: user });
  } catch (error) {
    emitError({ socket, event: 'user-data', error });
  }
});
```

**New way:**

```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');
const { enhance } = quickSocketSetup();

socket.on('get-user', (data) => {
  const response = enhance(socket, 'user-data');

  try {
    const user = getUser(data.id);
    response.ok(user);
  } catch (error) {
    response.error(error);
  }
});
```

## 🔧 Development vs Production

### Development Features

- Detailed error messages with stack traces
- Full request/response logging
- Performance metrics
- Debug information in responses
- Unfiltered error details

### Production Features

- Sanitized error messages
- Internal error hiding
- Minimal logging (errors only by default)
- Security headers
- Optimized performance
- Client-safe error responses

### Environment Detection

The library automatically detects the environment:

```javascript
// Automatic detection
const config = {}; // Uses NODE_ENV

// Manual override
const config = { mode: 'production' };
```

## 📊 Logging Examples

### Request Logging

```
[2024-01-01T10:00:00.000Z] [INFO] Incoming GET request to /api/users {
  "method": "GET",
  "url": "/api/users",
  "userAgent": "Mozilla/5.0...",
  "ip": "127.0.0.1",
  "requestId": "req-abc123"
}
```

### Response Logging

```
[2024-01-01T10:00:00.500Z] [INFO] Response sent with status 200 {
  "method": "GET",
  "url": "/api/users",
  "statusCode": 200,
  "requestId": "req-abc123",
  "executionTime": "500ms",
  "responseSize": 1024
}
```

### Error Logging

```
[2024-01-01T10:00:01.000Z] [ERROR] Database connection failed {
  "error": {
    "message": "Connection refused",
    "name": "ConnectionError",
    "stack": "Error: Connection refused\n    at..."
  },
  "method": "GET",
  "url": "/api/users",
  "requestId": "req-abc123"
}
```

## 🎯 Best Practices

### 1. Error Handling

```javascript
// ✅ Good: Let error handler catch everything
app.get('/users', async (req, res) => {
  const users = await getUsers(); // May throw
  return res.ok(users);
});

// ❌ Avoid: Manual try-catch unless needed
app.get('/users', async (req, res) => {
  try {
    const users = await getUsers();
    return res.ok(users);
  } catch (error) {
    return res.error(error); // Unnecessary
  }
});
```

### 2. Response Messages

```javascript
// ✅ Good: Descriptive messages
res.ok(users, 'Successfully retrieved 15 users');
res.notFound(null, 'User with ID 123 not found');

// ❌ Avoid: Generic messages
res.ok(users, 'Success');
res.notFound(null, 'Not found');
```

### 3. Error Objects

```javascript
// ✅ Good: Structured error info
return res.badRequest(
  {
    field: 'email',
    code: 'INVALID_FORMAT',
    provided: req.body.email,
  },
  'Invalid email format',
);

// ❌ Avoid: String-only errors
return res.badRequest('Bad email');
```

## 🚀 Performance Tips

1. **Enable Caching**: Set `performance.enableCaching: true`
2. **Use ETags**: Default enabled, helps with 304 responses
3. **Compression**: Enable for large responses
4. **Minimal Logging**: In production, log errors only
5. **Request ID Reuse**: Use existing headers when available

## 🔒 Security Features

- Automatic error sanitization in production
- Internal error hiding
- CORS headers support
- Request ID tracking
- Rate limiting integration
- Input validation helpers

## 📈 Monitoring Integration

Works with popular monitoring tools:

```javascript
// Custom logger integration
const winston = require('winston');

const { quickSetup } = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup({
  logging: {
    customLogger: (level, message, meta) => {
      winston.log(level, message, meta);
    },
  },
});
```

The enhanced Response Handler transforms your API development experience with minimal setup and maximum features. Start building better APIs today! 🚀
