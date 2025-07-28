# Error Handling Examples

Comprehensive examples for handling errors with Response Handler.

## Basic Error Handling

### Express Error Handling

```typescript
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();
const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  logging: { logErrors: true },
});

app.use(middleware);

// Route with manual error handling
app.get('/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.notFound({ id: req.params.id }, 'User not found');
    }

    res.ok(user, 'User retrieved successfully');
  } catch (error) {
    // Manual error handling
    if (error.name === 'ValidationError') {
      return res.badRequest(error, 'Invalid user ID format');
    }

    if (error.name === 'DatabaseError') {
      return res.internalServerError(error, 'Database connection failed');
    }

    // Generic error fallback
    res.internalServerError(error, 'An unexpected error occurred');
  }
});

// Route that throws errors (handled by error middleware)
app.post('/users', async (req, res) => {
  // These errors will be caught by the error handler
  const user = await createUser(req.body); // May throw ValidationError
  res.created(user, 'User created successfully');
});

// Error handler catches unhandled errors
app.use(errorHandler);
```

### Socket.IO Error Handling

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(httpServer);
const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { logErrors: true },
});

io.on('connection', (socket) => {
  // Manual error handling
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');

    try {
      if (!data.userId) {
        return response.badRequest({ field: 'userId' }, 'User ID is required');
      }

      const user = getUserById(data.userId);
      response.ok(user, 'User retrieved');
    } catch (error) {
      response.error(error, 'Failed to get user');
    }
  });

  // Automatic error handling with wrapper
  socket.on(
    'create-post',
    wrapper(async (socket, response, data) => {
      // Any thrown error is automatically caught and handled
      const post = await createPost(data); // May throw errors
      response.created(post, 'Post created');
    }),
  );
});
```

## Custom Error Types

### Defining Custom Errors

```typescript
// Custom error classes
class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'AuthenticationError';
    this.reason = reason;
    this.statusCode = 401;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
    this.statusCode = 404;
  }
}

class BusinessLogicError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'BusinessLogicError';
    this.code = code;
    this.details = details;
    this.statusCode = 422;
  }
}

class RateLimitError extends Error {
  constructor(limit, windowMs) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.limit = limit;
    this.windowMs = windowMs;
    this.statusCode = 429;
  }
}
```

### Using Custom Errors

```typescript
// Service layer with custom errors
class UserService {
  static async create(userData) {
    // Validation
    if (!userData.email) {
      throw new ValidationError('Email is required', 'email', userData.email);
    }

    if (!isValidEmail(userData.email)) {
      throw new ValidationError('Invalid email format', 'email', userData.email);
    }

    // Check if user exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw new BusinessLogicError('Email already registered', 'DUPLICATE_EMAIL', {
        email: userData.email,
      });
    }

    try {
      return await User.create(userData);
    } catch (dbError) {
      throw new Error('Database operation failed');
    }
  }

  static async findById(id) {
    if (!isValidId(id)) {
      throw new ValidationError('Invalid ID format', 'id', id);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    return user;
  }

  static async authenticate(token) {
    if (!token) {
      throw new AuthenticationError('Token required', 'MISSING_TOKEN');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (jwtError) {
      throw new AuthenticationError('Invalid token', 'INVALID_TOKEN');
    }
  }
}

// Controller using custom errors
app.post('/users', async (req, res) => {
  try {
    const user = await UserService.create(req.body);
    res.created(user, 'User created successfully');
  } catch (error) {
    // Custom errors are automatically handled with correct status codes
    throw error; // Will be caught by error handler
  }
});
```

## Error Handler Customization

### Custom Error Handler

```typescript
import { ResponseHandler } from '@amitkandar/response-handler';

class CustomResponseHandler extends ResponseHandler {
  errorHandler() {
    return (err, req, res, next) => {
      // Custom error logging
      this.logger.error('Custom error handler', err, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Custom error categorization
      if (err.name === 'ValidationError') {
        return res.badRequest(
          {
            type: 'validation',
            field: err.field,
            value: err.value,
            constraint: err.constraint,
          },
          err.message,
        );
      }

      if (err.name === 'AuthenticationError') {
        return res.unauthorized(
          {
            type: 'authentication',
            reason: err.reason,
          },
          err.message,
        );
      }

      if (err.name === 'AuthorizationError') {
        return res.forbidden(
          {
            type: 'authorization',
            required: err.required,
            actual: err.actual,
          },
          err.message,
        );
      }

      if (err.name === 'BusinessLogicError') {
        return res.unprocessableEntity(
          {
            type: 'business_logic',
            code: err.code,
            details: err.details,
          },
          err.message,
        );
      }

      if (err.name === 'RateLimitError') {
        return res.tooManyRequests(
          {
            type: 'rate_limit',
            limit: err.limit,
            windowMs: err.windowMs,
            retryAfter: Math.ceil(err.windowMs / 1000),
          },
          err.message,
        );
      }

      // Default error handling
      return res.internalServerError(err, 'An unexpected error occurred');
    };
  }
}
```

## Validation Errors

### With Joi Validation

```typescript
import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(18).max(100),
  role: Joi.string().valid('user', 'admin').default('user'),
});

// Validation middleware
const validateUser = (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value,
    }));

    return res.badRequest(
      {
        type: 'validation',
        errors: validationErrors,
      },
      'Validation failed',
    );
  }

  req.body = value; // Use validated data
  next();
};

app.post('/users', validateUser, async (req, res) => {
  const user = await UserService.create(req.body);
  res.created(user, 'User created successfully');
});
```

### With Express Validator

```typescript
import { body, validationResult } from 'express-validator';

// Validation rules
const userValidationRules = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('age').optional().isInt({ min: 18, max: 100 }),
];

// Validation handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    return res.badRequest(
      {
        type: 'validation',
        errors: validationErrors,
      },
      'Input validation failed',
    );
  }

  next();
};

app.post('/users', userValidationRules, handleValidationErrors, async (req, res) => {
  const user = await UserService.create(req.body);
  res.created(user, 'User created successfully');
});
```

## Database Errors

### Handling Database Errors

```typescript
// Database service with error handling
class DatabaseService {
  static async findById(model, id) {
    try {
      const result = await model.findById(id);
      if (!result) {
        throw new NotFoundError(model.name, id);
      }
      return result;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new ValidationError('Invalid ID format', 'id', id);
      }
      if (error.name === 'NotFoundError') {
        throw error;
      }
      throw new Error('Database query failed');
    }
  }

  static async create(model, data) {
    try {
      return await model.create(data);
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key
        const field = Object.keys(error.keyValue)[0];
        throw new BusinessLogicError(`${field} already exists`, 'DUPLICATE_KEY', {
          field,
          value: error.keyValue[field],
        });
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        }));

        throw new ValidationError('Validation failed', 'multiple', validationErrors);
      }

      throw new Error('Database operation failed');
    }
  }
}

// Usage in routes
app.post('/users', async (req, res) => {
  const user = await DatabaseService.create(User, req.body);
  res.created(user, 'User created successfully');
});

app.get('/users/:id', async (req, res) => {
  const user = await DatabaseService.findById(User, req.params.id);
  res.ok(user, 'User retrieved successfully');
});
```

## Authentication & Authorization Errors

### JWT Authentication

```typescript
import jwt from 'jsonwebtoken';

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.unauthorized(
      {
        type: 'authentication',
        reason: 'missing_token',
      },
      'Authentication token required',
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (jwtError) {
    let reason = 'invalid_token';
    let message = 'Invalid authentication token';

    if (jwtError.name === 'TokenExpiredError') {
      reason = 'token_expired';
      message = 'Authentication token has expired';
    } else if (jwtError.name === 'JsonWebTokenError') {
      reason = 'malformed_token';
      message = 'Malformed authentication token';
    }

    return res.unauthorized(
      {
        type: 'authentication',
        reason,
        expiredAt: jwtError.expiredAt,
      },
      message,
    );
  }
};

// Authorization middleware
const authorize = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.unauthorized(
      {
        type: 'authentication',
      },
      'Authentication required',
    );
  }

  if (!roles.includes(req.user.role)) {
    return res.forbidden(
      {
        type: 'authorization',
        required: roles,
        actual: req.user.role,
      },
      'Insufficient permissions',
    );
  }

  next();
};

// Usage
app.get('/admin/users', authenticate, authorize(['admin']), async (req, res) => {
  const users = await UserService.findAll();
  res.ok(users, 'Users retrieved successfully');
});
```

## Rate Limiting Errors

### Custom Rate Limiting

```typescript
import Redis from 'redis';

const redis = Redis.createClient();

// Rate limiting middleware
const rateLimit = (options) => async (req, res, next) => {
  const { windowMs, max, keyGenerator } = options;
  const key = keyGenerator ? keyGenerator(req) : req.ip;
  const windowKey = `rate_limit:${key}:${(Date.now() / windowMs) | 0}`;

  try {
    const current = await redis.incr(windowKey);

    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    if (current > max) {
      const ttl = await redis.ttl(windowKey);

      return res.tooManyRequests(
        {
          type: 'rate_limit',
          limit: max,
          current,
          windowMs,
          retryAfter: ttl,
        },
        'Too many requests, please try again later',
      );
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
    res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

    next();
  } catch (error) {
    // If Redis is down, allow the request but log the error
    console.error('Rate limiting error:', error);
    next();
  }
};

// Usage
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    keyGenerator: (req) => req.user?.id || req.ip, // Rate limit by user ID if authenticated
  }),
);
```

## Error Recovery & Retry Logic

### Automatic Retry with Exponential Backoff

```typescript
// Retry utility function
async function withRetry(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Usage in service
class ExternalAPIService {
  static async fetchUserData(userId) {
    return withRetry(
      async () => {
        const response = await fetch(`${API_BASE}/users/${userId}`);

        if (!response.ok) {
          const error = new Error(`API request failed: ${response.statusText}`);
          error.statusCode = response.status;
          throw error;
        }

        return response.json();
      },
      3,
      1000,
    );
  }
}

// Route with retry logic
app.get('/users/:id/external', async (req, res) => {
  try {
    const userData = await ExternalAPIService.fetchUserData(req.params.id);
    res.ok(userData, 'External user data retrieved');
  } catch (error) {
    if (error.statusCode === 404) {
      return res.notFound({ id: req.params.id }, 'User not found in external system');
    }

    res.internalServerError(error, 'Failed to fetch external user data');
  }
});
```

## Error Monitoring & Alerting

### Error Tracking Integration

```typescript
import * as Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Custom error handler with Sentry integration
const customErrorHandler = (config) => (err, req, res, next) => {
  // Log to Sentry for server errors
  if (err.statusCode >= 500 || !err.statusCode) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'error_handler');
      scope.setUser({
        id: req.user?.id,
        email: req.user?.email,
      });
      scope.setContext('request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      });
      Sentry.captureException(err);
    });
  }

  // Continue with normal error handling
  const builder = new ResponseBuilder(config, logger, req, res);

  if (err.statusCode) {
    return builder.respond(err.statusCode, undefined, err.message, err);
  }

  return builder.internalServerError(err, 'An unexpected error occurred');
};

// Health check endpoint with error monitoring
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await database.ping();

    // Check Redis connection
    await redis.ping();

    // Check external APIs
    await Promise.all([checkExternalAPI('payments'), checkExternalAPI('notifications')]);

    res.ok(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: ['database', 'redis', 'payments', 'notifications'],
      },
      'All systems operational',
    );
  } catch (error) {
    res.internalServerError(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      'System health check failed',
    );
  }
});
```

This comprehensive error handling guide covers most scenarios you'll encounter when building robust applications with Response Handler.
