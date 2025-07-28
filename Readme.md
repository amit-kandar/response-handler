# 🚀 Enhanced Response Handler

Modern, developer-friendly response handler for Express.js and Socket.IO with middleware-based configuration, comprehensive logging, and environment-aware features.

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
- **🛡️ TypeScript support**: Full type safety with comprehensive interfaces

## 🚀 Quick Start

### Installation

```bash
npm install @amitkandar/response-handler
```

### Express Setup (30 seconds)

```javascript
const express = require('express');
const { quickSetup } = require('@amitkandar/response-handler');

const app = express();
app.use(express.json());

// 🎉 One-line setup with powerful configuration
const { middleware, errorHandler } = quickSetup({
  mode: 'development', // 'production' for live apps
  logging: { enabled: true, logErrors: true },
  security: { sanitizeErrors: true }
});

app.use(middleware);

// ✨ Modern, clean API - errors are auto-caught!
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
app.listen(3000);
```

### Socket.IO Setup

```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');
const { enhance, wrapper } = quickSocketSetup();

io.on('connection', (socket) => {
  // Simple approach
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');
    if (!data.userId) return response.badRequest('User ID required');
    
    const user = getUserById(data.userId);
    response.ok(user);
  });

  // Auto error handling
  socket.on('create-post', wrapper(async (socket, response, data) => {
    const post = await createPost(data);
    response.created(post);
    // All errors automatically caught and emitted!
  }));
});
```

## 📚 API Reference

### Express Response Methods

```javascript
// Success responses
res.ok(data, message)                    // 200 OK
res.created(data, message)               // 201 Created
res.accepted(data, message)              // 202 Accepted
res.noContent(message)                   // 204 No Content

// Error responses
res.badRequest(error, message)           // 400 Bad Request
res.unauthorized(error, message)         // 401 Unauthorized
res.forbidden(error, message)            // 403 Forbidden
res.notFound(error, message)             // 404 Not Found
res.conflict(error, message)             // 409 Conflict
res.unprocessableEntity(error, message)  // 422 Unprocessable Entity
res.tooManyRequests(error, message)      // 429 Too Many Requests
res.internalServerError(error, message)  // 500 Internal Server Error

// Generic & Special responses
res.respond(statusCode, data, message)   // Custom status code
res.error(error, statusCode)             // Auto-determine from error
res.paginate(data, pagination, message)  // Paginated responses
```

### Socket.IO Response Methods

```javascript
const response = enhance(socket, 'event-name');

response.ok(data, message)               // Success responses
response.created(data, message)
response.error(error, code)              // Error responses
response.badRequest(error, message)
response.unauthorized(error, message)
response.forbidden(error, message)
response.notFound(error, message)

// Targeting
response.toRoom('room-name').ok(data)    // Broadcast to room
response.toSocket('socket-id').error(err) // Send to specific socket
```

## ⚙️ Configuration

### Full Configuration Example

```javascript
const config = {
  mode: 'development', // or 'production'
  
  logging: {
    enabled: true,
    level: 'info', // 'error', 'warn', 'info', 'debug'
    logErrors: true,
    logRequests: true,
    logResponses: true,
    includeStack: true,
    customLogger: (level, message, meta) => {
      // Use your preferred logger
    }
  },
  
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: { version: '1.0.0' }
  },
  
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true, // true in production
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true
  },
  
  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
    compression: true
  }
};
```

## 🌟 Advanced Features

### Environment-Aware Responses

**Development Mode** (Detailed errors):
```json
{
  "success": false,
  "message": "Database connection failed",
  "error": {
    "type": "DatabaseError",
    "code": "CONN_FAILED",
    "details": { "host": "localhost", "port": 5432 },
    "stack": "Error: Database connection failed..."
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T10:00:00Z",
    "executionTime": 1250,
    "environment": "development"
  }
}
```

**Production Mode** (Sanitized):
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

### Pagination Helper

```javascript
app.get('/posts', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const posts = await getPostsPaginated(page, limit);
  
  return res.paginate(posts, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: await getTotalPosts(),
    totalPages: Math.ceil(await getTotalPosts() / limit),
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });
});
```

### Socket.IO Room Broadcasting

```javascript
// Broadcast to room
response.toRoom('room-123').ok({
  message: 'Hello everyone!',
  from: socket.id
}, 'New message in room');

// Send to specific socket
response.toSocket('socket-456').error(error);
```

## 📁 Project Structure

```
src/
├── types/index.ts              # TypeScript type definitions
├── core/
│   ├── logger.ts              # Comprehensive logging system
│   └── responseBuilder.ts     # Response building logic
├── middleware/
│   └── responseHandler.ts     # Main middleware implementation
├── socket/
│   └── enhancedSocket.ts      # Enhanced Socket.IO handlers
├── newIndex.ts                # Modern API exports
└── [legacy files...]          # Backward compatibility
```

## 🔄 Migration Guide

### From Legacy API

**Old:**
```javascript
const { sendSuccess, sendError } = require('@amitkandar/response-handler');

app.get('/users', (req, res) => {
  try {
    const users = getUsers();
    sendSuccess(res, users, 'Users retrieved');
  } catch (error) {
    sendError(res, error);
  }
});
```

**New:**
```javascript
const { quickSetup } = require('@amitkandar/response-handler');
const { middleware, errorHandler } = quickSetup();

app.use(middleware);
app.get('/users', async (req, res) => {
  const users = await getUsers(); // Errors auto-caught!
  return res.ok(users, 'Users retrieved');
});
app.use(errorHandler);
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📖 Documentation

- [Complete API Reference](./docs/API.md)
- [Configuration Guide](./docs/CONFIGURATION.md)
- [Examples](./docs/EXAMPLES.md)
- [Migration Guide](./docs/MIGRATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## 📜 License

ISC © Amit Kandar

---

**🚀 Ready to build better APIs? Get started in 30 seconds!**
