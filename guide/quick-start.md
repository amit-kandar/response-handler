# Quick Start

Get started with Response Handler in minutes.

## Installation

```bash
npm install @amitkandar/response-handler
```

## Express Setup

```typescript
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();

// One-line setup with sensible defaults
const { middleware, errorHandler } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logging: {
    enabled: true,
    logErrors: true,
    logRequests: true,
  },
});

// Apply middleware
app.use(middleware);

// Your routes with enhanced response methods
app.get('/api/users', (req, res) => {
  res.ok([{ id: 1, name: 'John Doe' }], 'Users retrieved successfully');
});

app.post('/api/users', (req, res) => {
  // Validation
  if (!req.body.name) {
    return res.badRequest({ field: 'name' }, 'Name is required');
  }

  const user = { id: Date.now(), ...req.body };
  res.created(user, 'User created successfully');
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Socket.IO Setup

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(server);

const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true },
});

io.on('connection', (socket) => {
  console.log('Client connected');

  // Manual enhancement
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');

    if (!data.userId) {
      return response.badRequest({ field: 'userId' }, 'User ID required');
    }

    const user = { id: data.userId, name: 'John Doe' };
    response.ok(user, 'User retrieved successfully');
  });

  // Automatic wrapper with error handling
  socket.on(
    'create-post',
    wrapper(async (socket, response, data) => {
      if (!data.title || !data.content) {
        return response.badRequest(
          { missingFields: ['title', 'content'] },
          'Title and content are required',
        );
      }

      const post = {
        id: Date.now(),
        title: data.title,
        content: data.content,
        createdAt: new Date().toISOString(),
      };

      response.ok(post, 'Post created successfully');
    }),
  );
});
```

## Response Methods

All response methods are available on both Express responses and Socket.IO responses:

### Success Responses

- `res.ok(data, message)` - 200 OK
- `res.created(data, message)` - 201 Created
- `res.accepted(data, message)` - 202 Accepted
- `res.noContent(message)` - 204 No Content

### Error Responses

- `res.badRequest(error, message)` - 400 Bad Request
- `res.unauthorized(error, message)` - 401 Unauthorized
- `res.forbidden(error, message)` - 403 Forbidden
- `res.notFound(error, message)` - 404 Not Found
- `res.conflict(error, message)` - 409 Conflict
- `res.unprocessableEntity(error, message)` - 422 Unprocessable Entity
- `res.tooManyRequests(error, message)` - 429 Too Many Requests
- `res.internalServerError(error, message)` - 500 Internal Server Error

### Generic Responses

- `res.respond(statusCode, data, message)` - Custom status code
- `res.error(error, statusCode)` - Auto-detect error status
- `res.paginate(data, pagination, message)` - Paginated responses

## What's Next?

- [Configuration Guide](/config/basic) - Learn about available configuration options
- [API Reference](/api/express) - Complete API documentation
- [Examples](/examples/express) - More detailed examples
- [Migration Guide](/guide/migration) - Migrating from other libraries

## Key Features

✅ **TypeScript Support** - Full type safety with enhanced types  
✅ **Consistent API** - Same methods for Express and Socket.IO  
✅ **Production Ready** - Error sanitization and security headers  
✅ **Performance Optimized** - Request tracking and execution timing  
✅ **Flexible Logging** - Configurable logging with multiple levels  
✅ **Easy Setup** - One-line configuration with sensible defaults
