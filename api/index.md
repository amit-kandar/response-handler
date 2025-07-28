# API Reference

Complete API reference for the Response Handler library.

## Modules

### Express Middleware

- [Express Middleware](./express) - Enhanced Express.js response methods

### Socket.IO Handler

- [Socket.IO Handler](./socket) - Enhanced Socket.IO response methods

### Response Builder

- [Response Builder](./response-builder) - Core response building functionality

### Logger

- [Logger](./logger) - Built-in logging capabilities

## Quick Overview

### Express Response Methods

```javascript
res.ok(data, message); // 200 OK
res.created(data, message); // 201 Created
res.accepted(data, message); // 202 Accepted
res.noContent(message); // 204 No Content
res.badRequest(error, message); // 400 Bad Request
res.unauthorized(error, message); // 401 Unauthorized
res.forbidden(error, message); // 403 Forbidden
res.notFound(error, message); // 404 Not Found
res.conflict(error, message); // 409 Conflict
res.error(error, message); // 500 Internal Server Error
```

### Socket.IO Response Methods

```javascript
socket.ok(data, message); // Success response
socket.created(data, message); // Created response
socket.accepted(data, message); // Accepted response
socket.badRequest(error, message); // Bad request response
socket.unauthorized(error, message); // Unauthorized response
socket.forbidden(error, message); // Forbidden response
socket.notFound(error, message); // Not found response
socket.conflict(error, message); // Conflict response
socket.error(error, message); // Error response
```

### Configuration Options

```javascript
const config = {
  enableLogging: true,
  logLevel: 'info',
  environment: 'development',
  enablePerformanceTracking: true,
  enableSecurity: true,
  customLoggers: {
    info: console.log,
    error: console.error,
  },
};
```

## Response Format

All responses follow a consistent format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": {},
  "error": {},
  "timestamp": "2025-01-28T10:30:00.000Z",
  "executionTime": "5ms",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```
