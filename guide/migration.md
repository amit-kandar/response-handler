# Migration Guide

Migrate from other response handling libraries to Response Handler.

## From Express Default

### Before
```typescript
app.get('/users', (req, res) => {
  res.status(200).json({
    success: true,
    data: users,
    message: 'Users retrieved'
  });
});

app.get('/users/:id', (req, res) => {
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  res.status(200).json({ success: true, data: user });
});
```

### After
```typescript
app.get('/users', (req, res) => {
  res.ok(users, 'Users retrieved');
});

app.get('/users/:id', (req, res) => {
  if (!user) {
    return res.notFound({ id }, 'User not found');
  }
  res.ok(user);
});
```

## From express-response-helper

### Before
```typescript
import responseHelper from 'express-response-helper';
app.use(responseHelper());

app.get('/users', (req, res) => {
  res.success(users, 'Users retrieved', 200);
});

app.get('/error', (req, res) => {
  res.error('Something went wrong', 500);
});
```

### After
```typescript
import { quickSetup } from '@amitkandar/response-handler';
const { middleware } = quickSetup();
app.use(middleware);

app.get('/users', (req, res) => {
  res.ok(users, 'Users retrieved');
});

app.get('/error', (req, res) => {
  res.internalServerError(error, 'Something went wrong');
});
```

## From Custom Response Utilities

### Before
```typescript
// utils/response.js
const sendSuccess = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, error, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    message
  });
};

// Usage
app.get('/users', (req, res) => {
  sendSuccess(res, users, 'Users retrieved');
});
```

### After
```typescript
import { quickSetup } from '@amitkandar/response-handler';
const { middleware } = quickSetup({
  responses: { includeTimestamp: true }
});
app.use(middleware);

app.get('/users', (req, res) => {
  res.ok(users, 'Users retrieved');
});
```

## Configuration Migration

### Environment-Based Config
```typescript
// Before: Manual environment handling
const isDev = process.env.NODE_ENV === 'development';
const config = {
  includeStack: isDev,
  includeDetails: isDev,
  // ... manual configuration
};

// After: Automatic environment handling
const { middleware } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  // Automatically configures based on mode
});
```

### Error Handling Migration
```typescript
// Before: Manual error middleware
app.use((err, req, res, next) => {
  console.error(err);
  
  const isDev = process.env.NODE_ENV === 'development';
  const response = {
    success: false,
    message: err.message || 'Internal server error'
  };
  
  if (isDev) {
    response.stack = err.stack;
    response.details = err.details;
  }
  
  res.status(err.statusCode || 500).json(response);
});

// After: Built-in error handler
const { errorHandler } = quickSetup();
app.use(errorHandler); // Handles everything automatically
```

## Socket.IO Migration

### From Manual Socket Responses
```typescript
// Before
socket.on('get-user', (data) => {
  try {
    const user = getUserById(data.id);
    socket.emit('user-data', {
      success: true,
      data: user,
      message: 'User retrieved'
    });
  } catch (error) {
    socket.emit('user-error', {
      success: false,
      error: { message: error.message },
      message: 'Failed to get user'
    });
  }
});

// After
const { enhance } = quickSocketSetup();

socket.on('get-user', (data) => {
  const response = enhance(socket, 'user-data');
  
  try {
    const user = getUserById(data.id);
    response.ok(user, 'User retrieved');
  } catch (error) {
    response.error(error, 'Failed to get user');
  }
});
```

### From Socket.IO Middleware
```typescript
// Before: Custom socket middleware
io.use((socket, next) => {
  socket.sendSuccess = (event, data, message) => {
    socket.emit(event, { success: true, data, message });
  };
  socket.sendError = (event, error, message) => {
    socket.emit(event, { success: false, error, message });
  };
  next();
});

// After: Built-in enhancement
const { enhance, wrapper } = quickSocketSetup();
// No middleware needed, use enhance() for each response
```

## Breaking Changes

### Response Format
The response format is standardized:

```typescript
// Old custom format
{
  status: 'success',
  result: data,
  msg: 'Success message'
}

// New standardized format
{
  success: true,
  data: data,
  message: 'Success message',
  meta: { requestId, timestamp, executionTime }
}
```

### Error Format
```typescript
// Old error format
{
  status: 'error',
  error: 'Error message',
  code: 400
}

// New error format
{
  success: false,
  message: 'Human readable message',
  error: {
    type: 'ValidationError',
    message: 'Error message',
    code: 400,
    timestamp: '2023-...'
  }
}
```

## Gradual Migration

You can migrate gradually by using Response Handler alongside existing code:

```typescript
// 1. Add Response Handler middleware
const { middleware, errorHandler } = quickSetup();
app.use(middleware);

// 2. Migrate routes one by one
app.get('/new-endpoint', (req, res) => {
  res.ok(data, 'New endpoint using Response Handler');
});

app.get('/old-endpoint', (req, res) => {
  // Keep existing response logic temporarily
  res.status(200).json({ success: true, data });
});

// 3. Add error handler at the end
app.use(errorHandler);
```

## Testing Migration

Update your tests to expect the new response format:

```typescript
// Before
expect(response.body).toEqual({
  status: 'success',
  result: expect.any(Array)
});

// After
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Array),
  meta: expect.objectContaining({
    requestId: expect.any(String)
  })
});
```

## Benefits After Migration

- ✅ Consistent response format across all endpoints
- ✅ Automatic error handling and logging
- ✅ Built-in security features (error sanitization)
- ✅ Performance monitoring (execution time tracking)
- ✅ TypeScript support with enhanced types
- ✅ Request correlation with unique IDs
- ✅ Environment-aware configuration
