# Advanced Configuration

Detailed configuration options for advanced use cases.

## Complete Configuration Object

```typescript
import { ResponseHandlerConfig } from '@amitkandar/response-handler';

const config: ResponseHandlerConfig = {
  mode: 'production',
  
  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: false,
    customLogger: myCustomLogger
  },
  
  responses: {
    includeRequestId: true,
    includeTimestamp: true,
    includeExecutionTime: true,
    customFields: {
      version: '1.0.0',
      environment: process.env.NODE_ENV
    }
  },
  
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true
  },
  
  performance: {
    enableCaching: true,
    cacheHeaders: {
      'Cache-Control': 'public, max-age=300'
    }
  }
};
```

## Logging Configuration

### Log Levels
- `debug` - All messages
- `info` - Info, warnings, and errors
- `warn` - Warnings and errors only
- `error` - Errors only

### Custom Logger
```typescript
const customLogger = {
  debug: (message, meta) => console.log(`[DEBUG] ${message}`, meta),
  info: (message, meta) => console.log(`[INFO] ${message}`, meta),
  warn: (message, meta) => console.warn(`[WARN] ${message}`, meta),
  error: (message, meta) => console.error(`[ERROR] ${message}`, meta)
};

const config = {
  logging: {
    customLogger,
    enabled: true
  }
};
```

### Request/Response Logging
```typescript
const config = {
  logging: {
    logRequests: true,
    logResponses: true,
    logRequestHeaders: ['authorization', 'user-agent'],
    logResponseHeaders: ['x-request-id', 'x-response-time']
  }
};
```

## Security Configuration

### Error Sanitization
```typescript
const config = {
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: [
      'message',    // Error message
      'type',       // Error type/name
      'code',       // Error code
      'field'       // Validation field (for validation errors)
    ]
  }
};
```

### CORS Headers
```typescript
const config = {
  security: {
    corsHeaders: true,
    customHeaders: {
      'X-API-Version': '1.0.0',
      'X-Powered-By': 'Response Handler'
    }
  }
};
```

## Performance Configuration

### Caching
```typescript
const config = {
  performance: {
    enableCaching: true,
    cacheHeaders: {
      'Cache-Control': 'public, max-age=300',
      'ETag': true
    }
  }
};
```

### Request ID Generation
```typescript
const config = {
  responses: {
    includeRequestId: true,
    requestIdGenerator: () => `req-${Date.now()}-${Math.random()}`
  }
};
```

## Environment-Specific Configuration

### Development
```typescript
const developmentConfig = {
  mode: 'development',
  logging: {
    enabled: true,
    level: 'debug',
    includeStack: true,
    logRequests: true,
    logResponses: true
  },
  responses: {
    includeTimestamp: true,
    includeExecutionTime: true
  },
  security: {
    sanitizeErrors: false,
    hideInternalErrors: false
  }
};
```

### Production
```typescript
const productionConfig = {
  mode: 'production',
  logging: {
    enabled: true,
    level: 'error',
    includeStack: false,
    logRequests: false,
    logResponses: false
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: false
  },
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    corsHeaders: true
  }
};
```

### Testing
```typescript
const testConfig = {
  mode: 'test',
  logging: {
    enabled: false
  },
  responses: {
    includeTimestamp: false,
    includeExecutionTime: false
  }
};
```

## Socket.IO Configuration

```typescript
const socketConfig = {
  mode: 'development',
  logging: {
    enabled: true,
    logErrors: true
  },
  responses: {
    includeTimestamp: true
  },
  security: {
    allowedErrorFields: ['message', 'type', 'code']
  }
};

const { enhance, wrapper } = quickSocketSetup(socketConfig);
```

## Middleware Order

```typescript
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();

// 1. Body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Response handler middleware
const { middleware, errorHandler } = quickSetup(config);
app.use(middleware);

// 3. Your routes
app.use('/api', myRoutes);

// 4. Error handler MUST be last
app.use(errorHandler);
```

## Custom Error Types

```typescript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError'; 
    this.statusCode = 401;
  }
}

// These will be automatically handled by the error handler
```

## Integration with Other Libraries

### Winston Logger
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const config = {
  logging: {
    customLogger: {
      debug: (msg, meta) => logger.debug(msg, meta),
      info: (msg, meta) => logger.info(msg, meta),
      warn: (msg, meta) => logger.warn(msg, meta),
      error: (msg, meta) => logger.error(msg, meta)
    }
  }
};
```

### Redis Caching
```typescript
import Redis from 'redis';

const redis = Redis.createClient();

const config = {
  performance: {
    enableCaching: true,
    cacheStore: {
      get: (key) => redis.get(key),
      set: (key, value, ttl) => redis.setex(key, ttl, value)
    }
  }
};
```

## Configuration Validation

Response Handler validates your configuration and will throw helpful errors:

```typescript
const invalidConfig = {
  mode: 'invalid-mode', // Error: mode must be 'development' or 'production'
  logging: {
    level: 'invalid'    // Error: level must be debug|info|warn|error
  }
};
```

## Best Practices

1. **Use environment-specific configs**
2. **Enable logging in development, minimal logging in production**
3. **Always sanitize errors in production**
4. **Include request IDs for tracing**
5. **Set appropriate cache headers**
6. **Use custom error types for better error handling**
