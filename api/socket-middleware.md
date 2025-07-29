# Socket.IO Middleware

This page covers Socket.IO middleware integration for request handling and response management.

## Overview

Socket.IO middleware allows you to intercept and process socket events before they reach your event handlers.

## Basic Middleware Setup

```javascript
import { createSocketHandler } from '@amitkandar/response-handler';

const io = new Server(server);

// Apply response handler middleware
io.use(createSocketHandler());

// Custom middleware
io.use((socket, next) => {
  // Authentication middleware
  if (socket.handshake.auth.token) {
    socket.userId = verifyToken(socket.handshake.auth.token);
    next();
  } else {
    next(new Error('Authentication error'));
  }
});
```

## Authentication Middleware

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = user;
    next();
  } catch (err) {
    socket.sendError('AUTHENTICATION_FAILED', 'Invalid token');
    next(new Error('Authentication failed'));
  }
});
```

## Rate Limiting Middleware

```javascript
const rateLimiter = new Map();

io.use((socket, next) => {
  const clientIp = socket.handshake.address;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  if (!rateLimiter.has(clientIp)) {
    rateLimiter.set(clientIp, { count: 1, resetTime: now + windowMs });
    next();
  } else {
    const client = rateLimiter.get(clientIp);

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      next();
    } else if (client.count < maxRequests) {
      client.count++;
      next();
    } else {
      socket.sendError('RATE_LIMIT_EXCEEDED', 'Too many requests');
      next(new Error('Rate limit exceeded'));
    }
  }
});
```

## Namespace-Specific Middleware

```javascript
// Admin namespace with authentication
const adminNamespace = io.of('/admin');

adminNamespace.use(createSocketHandler());
adminNamespace.use((socket, next) => {
  if (!socket.user?.isAdmin) {
    socket.sendError('FORBIDDEN', 'Admin access required');
    next(new Error('Forbidden'));
  } else {
    next();
  }
});
```

## Error Handling in Middleware

```javascript
io.use((socket, next) => {
  try {
    // Your middleware logic
    validateSocketConnection(socket);
    next();
  } catch (error) {
    socket.sendError('MIDDLEWARE_ERROR', error.message);
    next(error);
  }
});

// Global error handler
io.engine.on('connection_error', (err) => {
  console.error('Socket connection error:', err);
});
```

## Middleware Chain Example

```javascript
// Multiple middleware in sequence
io.use(createSocketHandler());
io.use(authenticationMiddleware);
io.use(rateLimitingMiddleware);
io.use(loggingMiddleware);
io.use(validationMiddleware);

function loggingMiddleware(socket, next) {
  console.log(`Socket ${socket.id} connected from ${socket.handshake.address}`);

  socket.onAny((eventName, ...args) => {
    console.log(`Event: ${eventName}, Args:`, args);
  });

  next();
}

function validationMiddleware(socket, next) {
  // Validate socket handshake data
  if (!socket.handshake.query.version) {
    socket.sendError('VALIDATION_ERROR', 'Client version required');
    next(new Error('Validation failed'));
  } else {
    next();
  }
}
```

## Best Practices

- **Order Matters**: Apply middleware in the correct order (auth before authorization)
- **Error Handling**: Always handle errors gracefully in middleware
- **Performance**: Keep middleware lightweight to avoid connection delays
- **Security**: Validate and sanitize all incoming data
- **Logging**: Log important events for debugging and monitoring
