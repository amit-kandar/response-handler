# Socket.IO API Reference

Complete API reference for Socket.IO integration.

## Quick Setup

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(server);
const { enhance, wrapper } = quickSocketSetup(config);
```

## Enhancement Methods

### `enhance(socket, event)`

Manually enhance a socket response for a specific event:

```typescript
socket.on('get-user', (data) => {
  const response = enhance(socket, 'user-data');

  if (!data.userId) {
    return response.badRequest({ field: 'userId' }, 'User ID required');
  }

  const user = getUserById(data.userId);
  response.ok(user, 'User retrieved successfully');
});
```

### `wrapper(handler)`

Automatically wrap handlers with error handling and response enhancement:

```typescript
socket.on(
  'create-post',
  wrapper(async (socket, response, data) => {
    // Automatic error handling
    // Response object is automatically provided

    if (!data.title) {
      return response.badRequest({ field: 'title' }, 'Title required');
    }

    const post = await createPost(data);
    response.created(post, 'Post created successfully');
  }),
);
```

## Enhanced Response Methods

All methods are available on the enhanced response object:

### Success Responses

#### `response.ok(data, message)`

```typescript
response.ok({ user: { id: 1, name: 'John' } }, 'User retrieved');
// Emits: { success: true, data: {...}, message: '...' }
```

#### `response.created(data, message)`

```typescript
response.created({ id: 123, title: 'New Post' }, 'Post created');
// Emits: { success: true, data: {...}, message: '...' }
```

### Error Responses

#### `response.error(error, code)`

```typescript
response.error(new Error('Something went wrong'), 'SERVER_ERROR');
// Emits: { success: false, error: {...}, message: '...' }
```

#### `response.badRequest(error, message)`

```typescript
response.badRequest({ field: 'email' }, 'Invalid email format');
// Emits: { success: false, error: {...}, message: '...' }
```

#### `response.unauthorized(error, message)`

```typescript
response.unauthorized({ reason: 'invalid_token' }, 'Authentication failed');
```

#### `response.forbidden(error, message)`

```typescript
response.forbidden({ role: 'user' }, 'Admin access required');
```

#### `response.notFound(error, message)`

```typescript
response.notFound({ id: 123 }, 'User not found');
```

### Room and Socket Targeting

#### `response.toRoom(roomId)`

Send response to all sockets in a room:

```typescript
response.toRoom('chat-room-1').ok(message, 'New message posted');
```

#### `response.toSocket(socketId)`

Send response to a specific socket:

```typescript
response.toSocket('socket-123').ok(notification, 'Personal notification');
```

### Generic Emission

#### `response.emit(event, data, statusCode)`

```typescript
response.emit('custom-event', { custom: 'data' }, 200);
```

## Socket Enhancement Patterns

### Manual Enhancement

```typescript
io.on('connection', (socket) => {
  socket.on('get-data', (data) => {
    const response = enhance(socket, 'data-response');

    try {
      const result = processData(data);
      response.ok(result, 'Data processed successfully');
    } catch (error) {
      response.error(error, 'Processing failed');
    }
  });
});
```

### Wrapper Pattern

```typescript
io.on('connection', (socket) => {
  socket.on(
    'async-operation',
    wrapper(async (socket, response, data) => {
      // Automatic error handling - no try/catch needed
      const result = await performAsyncOperation(data);
      response.ok(result, 'Operation completed');
    }),
  );
});
```

### Room Management

```typescript
io.on('connection', (socket) => {
  socket.on(
    'join-room',
    wrapper(async (socket, response, data) => {
      const { roomId } = data;

      await socket.join(roomId);

      // Notify the user
      response.ok({ roomId }, 'Joined room successfully');

      // Notify others in the room
      response.toRoom(roomId).emit('user-joined', {
        userId: socket.userId,
        roomId,
      });
    }),
  );
});
```

## Authentication Integration

```typescript
// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const user = jwt.verify(token, SECRET);
    socket.userId = user.id;
    socket.userRole = user.role;
    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
});

// Using authentication in handlers
socket.on(
  'get-profile',
  wrapper(async (socket, response, data) => {
    const user = await getUserById(socket.userId);
    response.ok(user, 'Profile retrieved');
  }),
);
```

## Error Handling

### Automatic Error Handling with Wrapper

```typescript
socket.on(
  'risky-operation',
  wrapper(async (socket, response, data) => {
    // Any thrown error is automatically caught and sent as error response
    throw new Error('Something went wrong');
    // Automatically becomes: response.error(error, 'Operation failed')
  }),
);
```

### Manual Error Handling

```typescript
socket.on('manual-handling', (data) => {
  const response = enhance(socket, 'operation-result');

  try {
    const result = riskyOperation(data);
    response.ok(result, 'Success');
  } catch (error) {
    if (error.name === 'ValidationError') {
      response.badRequest(error, 'Validation failed');
    } else {
      response.error(error, 'Operation failed');
    }
  }
});
```

## Real-time Features

### Broadcasting to Rooms

```typescript
socket.on(
  'send-message',
  wrapper(async (socket, response, data) => {
    const { roomId, message } = data;

    const messageObj = {
      id: generateId(),
      text: message,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    };

    // Save to database
    await saveMessage(messageObj);

    // Broadcast to room
    response.toRoom(roomId).emit('new-message', messageObj);

    // Confirm to sender
    response.ok({ messageId: messageObj.id }, 'Message sent');
  }),
);
```

### Private Messaging

```typescript
socket.on(
  'send-private-message',
  wrapper(async (socket, response, data) => {
    const { targetUserId, message } = data;

    const targetSocket = findSocketByUserId(targetUserId);

    if (!targetSocket) {
      return response.notFound({ userId: targetUserId }, 'User not online');
    }

    const messageObj = {
      from: socket.userId,
      message,
      timestamp: new Date().toISOString(),
    };

    // Send to target user
    response.toSocket(targetSocket.id).emit('private-message', messageObj);

    // Confirm to sender
    response.ok({ delivered: true }, 'Message delivered');
  }),
);
```

## Middleware Integration

```typescript
// Custom socket middleware for response enhancement
const responseMiddleware = (socket, next) => {
  // Add custom methods to socket
  socket.sendSuccess = (event, data, message) => {
    const response = enhance(socket, event);
    response.ok(data, message);
  };

  socket.sendError = (event, error, message) => {
    const response = enhance(socket, event);
    response.error(error, message);
  };

  next();
};

io.use(responseMiddleware);
```

## Testing Socket.IO

```typescript
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { quickSocketSetup } from '@amitkandar/response-handler';

describe('Socket.IO Tests', () => {
  let io, clientSocket, serverSocket;

  beforeEach((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);

    const { enhance, wrapper } = quickSocketSetup({ mode: 'test' });

    io.on('connection', (socket) => {
      serverSocket = socket;

      socket.on(
        'test-event',
        wrapper(async (socket, response, data) => {
          response.ok(data, 'Test successful');
        }),
      );
    });

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  it('should handle test event', (done) => {
    clientSocket.emit('test-event', { test: 'data' });

    clientSocket.on('test-response', (data) => {
      expect(data).toMatchObject({
        success: true,
        data: { test: 'data' },
        message: 'Test successful',
      });
      done();
    });
  });
});
```

## Response Format

All Socket.IO responses follow this consistent format:

```typescript
interface SocketResponse {
  success: boolean;
  data?: any; // For successful responses
  message?: string; // Human-readable message
  error?: ErrorInfo; // For error responses
  meta?: {
    // Metadata
    timestamp?: string;
    socketId?: string;
    environment?: string;
  };
}
```

## Best Practices

1. **Use wrapper for async operations** - Automatic error handling
2. **Always validate input data** - Check required fields
3. **Use room targeting for broadcasts** - Efficient communication
4. **Handle authentication properly** - Verify tokens and permissions
5. **Test socket events thoroughly** - Include error cases
6. **Use consistent event naming** - Follow patterns like `get-user` -> `user-data`
