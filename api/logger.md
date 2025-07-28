# Logger API Reference

The Logger class provides comprehensive logging functionality with configurable levels and outputs.

## Logger Class

```typescript
import { Logger } from '@amitkandar/response-handler';

const logger = new Logger(config);
```

## Constructor

```typescript
const config = {
  enabled: true,
  level: 'info',
  includeStack: true,
  customLogger: myCustomLogger,
};

const logger = new Logger(config);
```

## Logging Methods

### `debug(message, meta?, context?)`

Log debug information (lowest priority):

```typescript
logger.debug(
  'Processing user request',
  {
    userId: 123,
    operation: 'getUserById',
  },
  {
    requestId: 'req-456',
    timestamp: Date.now(),
  },
);
```

### `info(message, meta?, context?)`

Log informational messages:

```typescript
logger.info('User authentication successful', {
  userId: 123,
  method: 'JWT',
});
```

### `warn(message, meta?, context?)`

Log warning messages:

```typescript
logger.warn('Rate limit approaching', {
  userId: 123,
  currentRequests: 95,
  limit: 100,
});
```

### `error(message, error?, context?)`

Log error messages:

```typescript
logger.error('Database connection failed', error, {
  database: 'users',
  connection: 'primary',
});
```

## Specialized Logging Methods

### `logRequest(req)`

Log incoming HTTP requests:

```typescript
logger.logRequest(req);
// Logs: method, URL, headers, query params, request ID
```

### `logResponse(req, res, responseData, executionTime?)`

Log outgoing HTTP responses:

```typescript
logger.logResponse(req, res, responseData, 150);
// Logs: status, response data, execution time
```

### `logEvent(event)`

Log structured events:

```typescript
logger.logEvent({
  type: 'user_action',
  action: 'create_post',
  userId: 123,
  postId: 456,
  timestamp: new Date().toISOString(),
  metadata: {
    category: 'content',
    source: 'web_app',
  },
});
```

## Log Levels

The logger supports 4 log levels (from lowest to highest priority):

1. `debug` - Detailed debugging information
2. `info` - General informational messages
3. `warn` - Warning messages for potential issues
4. `error` - Error messages for failures

### Level Filtering

```typescript
// Only logs 'warn' and 'error' messages
const logger = new Logger({ level: 'warn' });

logger.debug('This will not be logged');
logger.info('This will not be logged');
logger.warn('This will be logged');
logger.error('This will be logged');
```

## Configuration Options

### Basic Configuration

```typescript
const config = {
  enabled: true, // Enable/disable logging
  level: 'info', // Minimum log level
  includeStack: true, // Include stack traces in errors
  logRequests: true, // Log incoming requests
  logResponses: false, // Log outgoing responses
  logErrors: true, // Log error details
};
```

### Custom Logger Integration

```typescript
import winston from 'winston';

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const config = {
  customLogger: {
    debug: (message, meta) => winstonLogger.debug(message, meta),
    info: (message, meta) => winstonLogger.info(message, meta),
    warn: (message, meta) => winstonLogger.warn(message, meta),
    error: (message, meta) => winstonLogger.error(message, meta),
  },
};
```

## Message Formatting

### Default Format

```typescript
// Output format: [timestamp] [LEVEL] message metadata
[2023-01-01T12:00:00.000Z] [INFO] User logged in {"userId": 123, "method": "OAuth"}
```

### Custom Formatting

```typescript
class CustomLogger extends Logger {
  formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? JSON.stringify(meta) : '';
    return `${timestamp} | ${level.toUpperCase()} | ${message} ${metaStr}`;
  }
}
```

## Error Handling

### Stack Trace Handling

```typescript
try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'processData',
    userId: 123,
  });
}

// With includeStack: true (development)
// Logs full stack trace

// With includeStack: false (production)
// Logs only error message and metadata
```

### Circular Reference Protection

```typescript
const circularObj = { name: 'test' };
circularObj.self = circularObj;

logger.info('Circular object test', circularObj);
// Automatically handles circular references without crashing
```

## Request/Response Logging

### Request Logging Format

```typescript
{
  type: 'request',
  method: 'GET',
  url: '/api/users/123',
  headers: {
    'authorization': '[REDACTED]',
    'user-agent': 'Mozilla/5.0...'
  },
  query: { include: 'profile' },
  requestId: 'req-123-456',
  timestamp: '2023-01-01T12:00:00.000Z'
}
```

### Response Logging Format

```typescript
{
  type: 'response',
  statusCode: 200,
  success: true,
  executionTime: 150,
  requestId: 'req-123-456',
  responseSize: 1024,
  timestamp: '2023-01-01T12:00:00.150Z'
}
```

## Event Logging

### Structured Events

```typescript
// User actions
logger.logEvent({
  type: 'user_action',
  action: 'login',
  userId: 123,
  success: true,
  method: 'email',
  timestamp: new Date().toISOString(),
});

// System events
logger.logEvent({
  type: 'system_event',
  event: 'cache_miss',
  key: 'user:123',
  ttl: 300,
  timestamp: new Date().toISOString(),
});

// Business events
logger.logEvent({
  type: 'business_event',
  event: 'order_placed',
  orderId: 'ord-789',
  amount: 99.99,
  currency: 'USD',
  userId: 123,
});
```

## Configuration Updates

### Runtime Configuration Updates

```typescript
// Update logger configuration at runtime
logger.updateConfig({
  level: 'error',
  includeStack: false,
});
```

### Environment-Based Configuration

```typescript
const config = {
  enabled: process.env.NODE_ENV !== 'test',
  level: process.env.LOG_LEVEL || 'info',
  includeStack: process.env.NODE_ENV === 'development',
  logRequests: process.env.NODE_ENV === 'development',
};
```

## Integration Examples

### With Express

```typescript
import express from 'express';
import { Logger } from '@amitkandar/response-handler';

const app = express();
const logger = new Logger({ level: 'info' });

// Request logging middleware
app.use((req, res, next) => {
  logger.logRequest(req);
  next();
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    logger.logResponse(req, res, data);
    return originalSend.call(this, data);
  };
  next();
});
```

### With Socket.IO

```typescript
import { Server } from 'socket.io';
import { Logger } from '@amitkandar/response-handler';

const io = new Server(server);
const logger = new Logger({ level: 'debug' });

io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { socketId: socket.id });
  });

  socket.on('error', (error) => {
    logger.error('Socket error', error, { socketId: socket.id });
  });
});
```

## Performance Considerations

### Asynchronous Logging

```typescript
// For high-throughput applications
const config = {
  customLogger: {
    debug: (message, meta) => setImmediate(() => console.log(message, meta)),
    info: (message, meta) => setImmediate(() => console.info(message, meta)),
    warn: (message, meta) => setImmediate(() => console.warn(message, meta)),
    error: (message, meta) => setImmediate(() => console.error(message, meta)),
  },
};
```

### Log Sampling

```typescript
class SamplingLogger extends Logger {
  info(message, meta, context) {
    // Only log 10% of info messages
    if (Math.random() < 0.1) {
      super.info(message, meta, context);
    }
  }
}
```

## Testing

### Mock Logger for Tests

```typescript
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  logRequest: jest.fn(),
  logResponse: jest.fn(),
  logEvent: jest.fn(),
  updateConfig: jest.fn(),
};
```

### Testing Log Output

```typescript
describe('Logger', () => {
  let logger, consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger = new Logger({ level: 'debug' });
  });

  it('should log debug messages', () => {
    logger.debug('Test message', { test: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Test message'),
      expect.objectContaining({ test: true }),
    );
  });
});
```

## Best Practices

1. **Use appropriate log levels** - Debug for development, error for production
2. **Include context** - Add request IDs, user IDs, operation details
3. **Avoid logging sensitive data** - Passwords, tokens, personal information
4. **Use structured logging** - Consistent metadata format
5. **Monitor log volume** - High-frequency logging can impact performance
6. **Rotate logs** - Prevent disk space issues in production
7. **Use async logging** - For high-throughput applications
