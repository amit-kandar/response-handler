# Migration Guide

Guide for migrating from the legacy Response Handler API to the new Enhanced Response Handler.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [API Mapping](#api-mapping)
- [Configuration Migration](#configuration-migration)
- [Socket.IO Migration](#socketio-migration)
- [Testing Migration](#testing-migration)
- [Troubleshooting](#troubleshooting)

## Overview

The Enhanced Response Handler introduces a modern, middleware-based approach that simplifies response handling while adding powerful features like environment-aware responses, comprehensive logging, and built-in security.

### Key Benefits of Migration

- **90% less boilerplate code** - One-line responses instead of complex function calls
- **Automatic error handling** - No need for manual try-catch in every route
- **Built-in logging** - Comprehensive request/response/error tracking
- **Environment awareness** - Different behaviors for dev vs production
- **Type safety** - Full TypeScript support with enhanced interfaces

### Migration Timeline

- **Phase 1**: Install new version and set up alongside existing code
- **Phase 2**: Migrate routes one by one using new API
- **Phase 3**: Remove legacy imports and update tests
- **Phase 4**: Full cutover to new API

## Breaking Changes

### Import Changes

**Old:**
```javascript
const { 
  sendSuccess, 
  sendError, 
  errorHandler,
  emitSuccess,
  emitError,
  socketWrapper 
} = require('@amitkandar/response-handler');
```

**New:**
```javascript
const { quickSetup, quickSocketSetup } = require('@amitkandar/response-handler');

// Or for advanced usage
const { 
  ResponseHandler,
  SocketResponseHandler 
} = require('@amitkandar/response-handler');
```

### Response Method Changes

**Old:**
```javascript
sendSuccess(res, data, message);
sendError(res, error);
```

**New:**
```javascript
res.ok(data, message);
res.error(error);
// Or specific error methods:
res.badRequest(error, message);
res.notFound(error, message);
```

### Configuration Changes

**Old:**
```javascript
configureResponseFormat(templateFunction);
```

**New:**
```javascript
const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  logging: { enabled: true },
  responses: { includeTimestamp: true }
});
```

## Migration Steps

### Step 1: Install Dependencies

Add any new dependencies if needed:

```bash
npm install @amitkandar/response-handler@latest
# Socket.IO and Express should already be installed
```

### Step 2: Set Up New Middleware

Create a new setup file or update your existing app setup:

```javascript
// Before migration - old setup
const { errorHandler } = require('@amitkandar/response-handler');
app.use(errorHandler);

// After migration - new setup
const { quickSetup } = require('@amitkandar/response-handler');
const { middleware, errorHandler } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logging: {
    enabled: true,
    logErrors: true,
  }
});

app.use(middleware);
// ... your routes ...
app.use(errorHandler);
```

### Step 3: Migrate Routes Gradually

Migrate one route at a time to ensure stability:

**Before:**
```javascript
const { sendSuccess, sendError } = require('@amitkandar/response-handler');

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return sendError(res, new Error('User not found'));
    }
    sendSuccess(res, user, 'User retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});
```

**After:**
```javascript
// No imports needed - methods added to res object by middleware

app.get('/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.notFound({ id: req.params.id }, 'User not found');
  }
  res.ok(user, 'User retrieved successfully');
  // Errors are automatically caught by error handler!
});
```

### Step 4: Update Error Handling

**Before:**
```javascript
app.get('/users', async (req, res, next) => {
  try {
    const users = await getUsers();
    sendSuccess(res, users);
  } catch (error) {
    sendError(res, error);
  }
});
```

**After:**
```javascript
app.get('/users', async (req, res) => {
  const users = await getUsers();
  res.ok(users, 'Users retrieved successfully');
  // No try-catch needed - automatic error handling!
});
```

### Step 5: Remove Legacy Imports

Once all routes are migrated:

```javascript
// Remove these legacy imports:
// const { sendSuccess, sendError, errorHandler } = require('@amitkandar/response-handler');

// Keep only new imports:
const { quickSetup } = require('@amitkandar/response-handler');
```

## API Mapping

### REST API Migration

| Legacy Method | New Method | Notes |
|---------------|------------|-------|
| `sendSuccess(res, data, message)` | `res.ok(data, message)` | Direct method on response object |
| `sendError(res, error)` | `res.error(error)` | Auto-detects status code |
| N/A | `res.created(data, message)` | New 201 Created method |
| N/A | `res.badRequest(error, message)` | New 400 Bad Request method |
| N/A | `res.unauthorized(error, message)` | New 401 Unauthorized method |
| N/A | `res.forbidden(error, message)` | New 403 Forbidden method |
| N/A | `res.notFound(error, message)` | New 404 Not Found method |
| N/A | `res.unprocessableEntity(error, message)` | New 422 Validation Error method |
| N/A | `res.internalServerError(error, message)` | New 500 Internal Error method |
| `errorHandler` | `errorHandler` | Same function, but from quickSetup |

### Socket.IO Migration

| Legacy Method | New Method | Notes |
|---------------|------------|-------|
| `emitSuccess({ socket, event, data, message })` | `response.ok(data, message)` | Enhanced response object |
| `emitError({ socket, event, error })` | `response.error(error)` | Enhanced response object |
| `socketWrapper(handler)` | `wrapper(handler)` | Similar functionality |
| N/A | `response.toRoom(roomId).ok(data)` | New room targeting |
| N/A | `response.toSocket(socketId).error(error)` | New socket targeting |

### Configuration Migration

| Legacy Config | New Config | Notes |
|---------------|------------|-------|
| `configureResponseFormat(fn)` | `quickSetup({ responses: {...} })` | More comprehensive configuration |
| N/A | `{ mode: 'development' }` | New environment-aware mode |
| N/A | `{ logging: {...} }` | New comprehensive logging |
| N/A | `{ security: {...} }` | New security options |
| N/A | `{ performance: {...} }` | New performance options |

## Configuration Migration

### Legacy Template Configuration

**Before:**
```javascript
const { configureResponseFormat } = require('@amitkandar/response-handler');

configureResponseFormat(({ success, message, data, error }) => ({
  status: success ? 'OK' : 'ERROR',
  message,
  payload: data,
  error: error,
  timestamp: Date.now(),
}));
```

**After:**
```javascript
const { quickSetup } = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup({
  responses: {
    includeTimestamp: true,
    customFields: {
      service: 'my-api',
      version: '1.0.0'
    }
  }
});

// If you need a completely custom format, you can still use the legacy configureResponseFormat
// but it's recommended to use the new configuration options
```

### Environment-Specific Migration

**Before:**
```javascript
// Manual environment handling
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  // Development-specific setup
} else {
  // Production-specific setup
}
```

**After:**
```javascript
const { quickSetup } = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  // Configuration automatically adapts based on mode
});
```

## Socket.IO Migration

### Basic Socket Handler Migration

**Before:**
```javascript
const { emitSuccess, emitError } = require('@amitkandar/response-handler');

socket.on('get-user', async (data) => {
  try {
    if (!data.userId) {
      return emitError({
        socket,
        event: 'user-data',
        error: { message: 'User ID required' }
      });
    }
    
    const user = await getUser(data.userId);
    emitSuccess({
      socket,
      event: 'user-data',
      data: user,
      message: 'User retrieved'
    });
  } catch (error) {
    emitError({
      socket,
      event: 'user-data',
      error
    });
  }
});
```

**After:**
```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');
const { enhance } = quickSocketSetup();

socket.on('get-user', async (data) => {
  const response = enhance(socket, 'user-data');
  
  try {
    if (!data.userId) {
      return response.badRequest({ field: 'userId' }, 'User ID required');
    }
    
    const user = await getUser(data.userId);
    response.ok(user, 'User retrieved');
  } catch (error) {
    response.error(error);
  }
});
```

### Socket Wrapper Migration

**Before:**
```javascript
const { socketWrapper } = require('@amitkandar/response-handler');

const handleGetUser = socketWrapper(async (socket, data) => {
  const user = await getUser(data.userId);
  emitSuccess({
    socket,
    event: 'user-data',
    data: user
  });
});

socket.on('get-user', (data) => handleGetUser(socket, data));
```

**After:**
```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');
const { wrapper } = quickSocketSetup();

socket.on('get-user', wrapper(async (socket, response, data) => {
  const user = await getUser(data.userId);
  response.ok(user, 'User retrieved');
}));
```

### Room-Based Messaging Migration

**Before:**
```javascript
const { emitSuccess } = require('@amitkandar/response-handler');

socket.on('send-message', (data) => {
  // Send to room manually
  socket.to(data.roomId).emit('message-received', {
    success: true,
    data: data.message,
    message: 'New message'
  });
  
  // Confirm to sender
  emitSuccess({
    socket,
    event: 'message-sent',
    data: { messageId: Date.now() }
  });
});
```

**After:**
```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');
const { enhance } = quickSocketSetup();

socket.on('send-message', (data) => {
  const response = enhance(socket, 'message-received');
  
  // Send to room with enhanced targeting
  response.toRoom(data.roomId).ok(data.message, 'New message');
  
  // Confirm to sender
  enhance(socket, 'message-sent').ok({ messageId: Date.now() });
});
```

## Testing Migration

### Unit Test Migration

**Before:**
```javascript
const { sendSuccess, sendError } = require('@amitkandar/response-handler');

describe('User Routes', () => {
  it('should return user data', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Test with legacy functions
    sendSuccess(mockRes, userData, 'Success');
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
```

**After:**
```javascript
const request = require('supertest');
const { quickSetup } = require('@amitkandar/response-handler');

describe('User Routes', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    const { middleware, errorHandler } = quickSetup({ 
      logging: { enabled: false } // Disable for tests
    });
    app.use(middleware);
    // ... add routes ...
    app.use(errorHandler);
  });
  
  it('should return user data', async () => {
    const response = await request(app)
      .get('/users/1')
      .expect(200);
    
    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Object),
      message: expect.any(String)
    });
  });
});
```

### Integration Test Migration

**Before:**
```javascript
// Manual setup for each test
const { errorHandler } = require('@amitkandar/response-handler');
app.use(errorHandler);
```

**After:**
```javascript
// Centralized test setup
const { quickSetup } = require('@amitkandar/response-handler');

const createTestApp = () => {
  const app = express();
  const { middleware, errorHandler } = quickSetup({
    mode: 'development',
    logging: { enabled: false }
  });
  
  app.use(express.json());
  app.use(middleware);
  return { app, errorHandler };
};
```

## Troubleshooting

### Common Migration Issues

#### 1. Response Already Sent Error

**Problem:**
```javascript
// This might cause "Cannot set headers after they are sent"
res.ok(data);
res.status(201); // Error - response already sent
```

**Solution:**
```javascript
// Use return to prevent further execution
return res.ok(data);

// Or use the appropriate status method
res.created(data); // This sets 201 status automatically
```

#### 2. Missing Error Handling

**Problem:**
```javascript
// Errors not being caught
app.get('/users', async (req, res) => {
  const users = await getUsers(); // This might throw
  res.ok(users);
});
```

**Solution:**
```javascript
// Make sure error handler middleware is added LAST
app.use(middleware);
// ... all your routes ...
app.use(errorHandler); // Must be last!
```

#### 3. Socket.IO Event Name Issues

**Problem:**
```javascript
// Event name mismatch between client and server
const response = enhance(socket, 'user_data'); // underscore
// Client listening for 'user-data' (hyphen)
```

**Solution:**
```javascript
// Use consistent naming convention
const response = enhance(socket, 'user-data');
```

#### 4. Configuration Not Taking Effect

**Problem:**
```javascript
// Configuration applied after middleware setup
app.use(middleware);
const { middleware: newMiddleware } = quickSetup(newConfig); // Too late!
```

**Solution:**
```javascript
// Configure before setting up middleware
const { middleware, errorHandler } = quickSetup(config);
app.use(middleware);
```

### Performance Considerations

#### Memory Usage

The new middleware adds minimal overhead, but in high-traffic scenarios:

```javascript
// For high-performance scenarios, disable optional features
const { middleware, errorHandler } = quickSetup({
  responses: {
    includeTimestamp: false,
    includeExecutionTime: false
  },
  logging: {
    enabled: false // Or minimal logging
  }
});
```

#### Request ID Generation

```javascript
// If you have an existing request ID system
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
  next();
});

// The middleware will use existing request ID
app.use(middleware);
```

### Backward Compatibility

If you need to maintain backward compatibility during migration:

```javascript
// You can use both APIs temporarily
const { 
  quickSetup,
  sendSuccess, // Legacy function still available
  sendError    // Legacy function still available
} = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup();

app.use(middleware);

// New routes use new API
app.get('/new-endpoint', (req, res) => {
  res.ok(data);
});

// Legacy routes can still use old API
app.get('/legacy-endpoint', (req, res) => {
  sendSuccess(res, data);
});

app.use(errorHandler);
```

### Gradual Migration Strategy

1. **Week 1**: Set up new middleware alongside existing code
2. **Week 2**: Migrate GET endpoints (read-only, lower risk)
3. **Week 3**: Migrate POST/PUT endpoints
4. **Week 4**: Migrate DELETE endpoints and error handlers
5. **Week 5**: Update tests and remove legacy imports
6. **Week 6**: Final cleanup and optimization

This migration guide provides a comprehensive path from the legacy API to the enhanced version, ensuring a smooth transition with minimal disruption to your application.
