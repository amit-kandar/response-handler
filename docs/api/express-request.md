# Express Request Enhancement

Enhanced request object functionality provided by Response Handler.

## Request Enhancement Overview

Response Handler enhances the Express request object with additional properties and methods for better request handling and tracking.

## Enhanced Properties

### Request Tracking

Each request gets automatic tracking properties:

```javascript
app.use(
  quickSetup({
    enablePerformanceTracking: true,
    requestTracking: true,
  }),
);

app.get('/api/data', (req, res) => {
  console.log('Request ID:', req.requestId);
  console.log('Start Time:', req.startTime);
  console.log('User Agent:', req.userAgent);
  console.log('IP Address:', req.clientIP);

  res.ok({ message: 'Request processed' });
});
```

### Available Enhanced Properties

```typescript
interface EnhancedRequest extends Request {
  requestId: string; // Unique request identifier
  startTime: number; // Request start timestamp
  userAgent: string; // Parsed user agent
  clientIP: string; // Client IP address
  correlationId?: string; // Request correlation ID
  sessionData?: any; // Session information
  metadata: RequestMetadata; // Additional request metadata
}
```

## Request Metadata

### Automatic Metadata Collection

```javascript
app.get('/api/users', (req, res) => {
  // Access request metadata
  const metadata = req.metadata;

  console.log('Request metadata:', {
    method: metadata.method,
    url: metadata.url,
    headers: metadata.headers,
    query: metadata.query,
    body: metadata.body,
    timestamp: metadata.timestamp,
    source: metadata.source,
  });

  res.ok({ users: [] }, 'Users retrieved');
});
```

### Custom Metadata

Add custom metadata to requests:

```javascript
app.use((req, res, next) => {
  // Add custom metadata
  req.metadata.customData = {
    apiVersion: '1.0',
    clientVersion: req.headers['x-client-version'],
    feature: 'user-management',
  };

  next();
});
```

## Request Validation

### Built-in Validation Helpers

```javascript
const { validateRequest } = require('response-handler');

// Custom validation middleware
const validateUserData = validateRequest({
  body: {
    name: { type: 'string', required: true, minLength: 2 },
    email: { type: 'email', required: true },
    age: { type: 'number', min: 18, max: 120 },
  },
  query: {
    page: { type: 'number', default: 1 },
    limit: { type: 'number', default: 10, max: 100 },
  },
});

app.post('/api/users', validateUserData, (req, res) => {
  // req.body and req.query are now validated and sanitized
  const userData = req.body;
  const { page, limit } = req.query;

  res.created(userData, 'User created successfully');
});
```

### Validation Errors

```javascript
app.post('/api/users', validateUserData, (req, res) => {
  // If validation fails, it automatically responds with:
  // {
  //   "success": false,
  //   "message": "Validation failed",
  //   "error": {
  //     "validationErrors": [
  //       {
  //         "field": "email",
  //         "message": "Invalid email format",
  //         "value": "invalid-email"
  //       }
  //     ]
  //   }
  // }
});
```

## Request Sanitization

### Input Sanitization

Automatic input sanitization for security:

```javascript
app.use(
  quickSetup({
    enableSecurity: true,
    sanitization: {
      enabled: true,
      options: {
        removeNullBytes: true,
        trimWhitespace: true,
        escapeHtml: true,
      },
    },
  }),
);

app.post('/api/comments', (req, res) => {
  // req.body is automatically sanitized
  const comment = req.body.comment; // HTML escaped and trimmed

  res.created({ comment }, 'Comment created');
});
```

### Custom Sanitization

```javascript
const { sanitizeInput } = require('response-handler');

app.post('/api/data', (req, res) => {
  const sanitizedData = sanitizeInput(req.body, {
    allowedTags: ['b', 'i', 'em', 'strong'],
    allowedAttributes: {},
    maxLength: 1000,
  });

  res.ok(sanitizedData, 'Data processed');
});
```

## Request Rate Limiting

### Per-Request Rate Limiting

```javascript
app.use(
  quickSetup({
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests',
    },
  }),
);

app.get('/api/data', (req, res) => {
  // Rate limiting info available in request
  console.log('Rate limit info:', {
    limit: req.rateLimit.limit,
    current: req.rateLimit.current,
    remaining: req.rateLimit.remaining,
    resetTime: req.rateLimit.resetTime,
  });

  res.ok({ data: 'example' });
});
```

### Custom Rate Limiting

```javascript
const customRateLimit = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next();

  // Implement custom user-based rate limiting
  const userLimit = getUserRateLimit(userId);
  const currentUsage = getCurrentUsage(userId);

  if (currentUsage >= userLimit) {
    return res.tooManyRequests(
      { limit: userLimit, current: currentUsage },
      'User rate limit exceeded',
    );
  }

  // Add rate limit info to request
  req.userRateLimit = {
    limit: userLimit,
    current: currentUsage,
    remaining: userLimit - currentUsage,
  };

  next();
};
```

## Request Context

### Context Management

```javascript
app.use((req, res, next) => {
  // Create request context
  req.context = {
    requestId: req.requestId,
    userId: req.user?.id,
    sessionId: req.sessionID,
    traceId: req.headers['x-trace-id'],
    startTime: Date.now(),
  };

  next();
});

app.get('/api/users', async (req, res) => {
  try {
    // Pass context to services
    const users = await userService.getUsers(req.context);

    res.ok(users, 'Users retrieved', {
      context: {
        requestId: req.context.requestId,
        executionTime: Date.now() - req.context.startTime,
      },
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});
```

## Request Logging

### Automatic Request Logging

```javascript
app.use(
  quickSetup({
    enableLogging: true,
    requestLogging: {
      enabled: true,
      includeBody: true,
      includeHeaders: ['authorization', 'content-type'],
      excludePaths: ['/health', '/metrics'],
    },
  }),
);

// Logs will include:
// {
//   "level": "info",
//   "message": "HTTP Request",
//   "requestId": "req_123",
//   "method": "POST",
//   "url": "/api/users",
//   "headers": {
//     "content-type": "application/json"
//   },
//   "body": { "name": "John" },
//   "timestamp": "2023-01-01T12:00:00Z"
// }
```

### Custom Request Logging

```javascript
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log request start
  console.log(`[${req.requestId}] ${req.method} ${req.url} - Started`);

  // Log response end
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${req.requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});
```

## Request Caching

### Request-Level Caching

```javascript
const requestCache = new Map();

app.use((req, res, next) => {
  // Create cache key
  const cacheKey = `${req.method}:${req.url}:${JSON.stringify(req.query)}`;

  // Check cache
  if (requestCache.has(cacheKey)) {
    const cachedResponse = requestCache.get(cacheKey);
    return res.ok(cachedResponse.data, cachedResponse.message);
  }

  // Store original json method
  const originalJson = res.json;

  // Override json to cache response
  res.json = function (body) {
    if (res.statusCode === 200 && body.success) {
      requestCache.set(cacheKey, {
        data: body.data,
        message: body.message,
        timestamp: Date.now(),
      });

      // Clean cache after 5 minutes
      setTimeout(() => requestCache.delete(cacheKey), 5 * 60 * 1000);
    }

    return originalJson.call(this, body);
  };

  next();
});
```

## Request Transformation

### Data Transformation

```javascript
const transformRequest = (transformer) => {
  return (req, res, next) => {
    if (req.body) {
      req.body = transformer(req.body);
    }
    next();
  };
};

// Transform camelCase to snake_case
const camelToSnake = transformRequest((data) => {
  return Object.keys(data).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    acc[snakeKey] = data[key];
    return acc;
  }, {});
});

app.post('/api/users', camelToSnake, (req, res) => {
  // req.body.firstName becomes req.body.first_name
  console.log(req.body); // { first_name: "John", last_name: "Doe" }

  res.created(req.body, 'User created');
});
```

## Request Hooks

### Before/After Hooks

```javascript
app.use(
  quickSetup({
    hooks: {
      beforeRequest: (req, res, next) => {
        req.processingStartTime = Date.now();
        console.log(`Processing request: ${req.method} ${req.url}`);
        next();
      },
      afterRequest: (req, res) => {
        const processingTime = Date.now() - req.processingStartTime;
        console.log(`Request processed in ${processingTime}ms`);
      },
    },
  }),
);
```

## Security Enhancements

### Security Headers

```javascript
app.use(
  quickSetup({
    enableSecurity: true,
    securityHeaders: {
      contentSecurityPolicy: true,
      xssProtection: true,
      noSniff: true,
      frameguard: true,
      hsts: true,
    },
  }),
);

app.get('/api/data', (req, res) => {
  // Security headers automatically added
  res.ok({ data: 'secure' });
});
```

### Request Fingerprinting

```javascript
app.use((req, res, next) => {
  // Create request fingerprint for security
  req.fingerprint = {
    ip: req.clientIP,
    userAgent: req.userAgent,
    acceptLanguage: req.headers['accept-language'],
    hash: generateFingerprint(req),
  };

  next();
});
```

## Performance Monitoring

### Request Performance Tracking

```javascript
app.use(
  quickSetup({
    enablePerformanceTracking: true,
    performanceMetrics: {
      trackRequestSize: true,
      trackResponseSize: true,
      trackProcessingTime: true,
      trackMemoryUsage: true,
    },
  }),
);

app.get('/api/performance', (req, res) => {
  const metrics = {
    requestSize: req.metrics.requestSize,
    processingTime: req.metrics.processingTime,
    memoryUsage: req.metrics.memoryUsage,
  };

  res.ok(metrics, 'Performance metrics');
});
```

The enhanced request object provides powerful capabilities for building robust, secure, and performant applications with comprehensive request handling and monitoring.
