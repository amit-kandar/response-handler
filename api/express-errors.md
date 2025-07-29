# Express Error Handling

Comprehensive error handling patterns for Express applications using Response Handler.

## Global Error Handler

### Setting Up Error Handling

```javascript
const express = require('express');
const { quickSetup } = require('response-handler');

const app = express();

// Response Handler middleware
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'info',
    environment: process.env.NODE_ENV || 'development',
  }),
);

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

// 404 handler - must come after all routes
app.use('*', (req, res) => {
  res.notFound(
    {
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: ['GET /api/users', 'POST /api/users', 'GET /api/posts'],
    },
    'Route not found',
  );
});

// Global error handler - must be last middleware
app.use((error, req, res, next) => {
  // Log error details
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.badRequest(
      {
        error: 'Invalid JSON',
        details: error.message,
      },
      'Request body contains invalid JSON',
    );
  }

  if (error.type === 'entity.too.large') {
    return res.badRequest(
      {
        maxSize: '10mb',
        receivedSize: error.length,
      },
      'Request body too large',
    );
  }

  // Production vs Development error responses
  if (process.env.NODE_ENV === 'production') {
    // Don't leak error details in production
    res.error({}, 'Internal server error');
  } else {
    // Show full error details in development
    res.error(
      {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      'Internal server error',
    );
  }
});

module.exports = app;
```

## Async Error Handling

### Async Route Wrapper

```javascript
// utils/asyncHandler.js
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
```

### Using Async Handler

```javascript
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Async route with proper error handling
app.get(
  '/api/users/:id',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Validation
    if (!userId || isNaN(userId)) {
      return res.badRequest({ userId, expectedType: 'number' }, 'Invalid user ID format');
    }

    // Database operation that might throw
    const user = await User.findById(userId);

    if (!user) {
      return res.notFound({ userId }, 'User not found');
    }

    res.ok(user, 'User retrieved successfully');
  }),
);

// Multiple async operations
app.post(
  '/api/users',
  asyncHandler(async (req, res) => {
    const { email, name, password } = req.body;

    // Parallel validation checks
    const [emailExists, isValidEmail] = await Promise.all([
      User.findByEmail(email),
      validateEmailFormat(email),
    ]);

    if (emailExists) {
      return res.conflict({ email }, 'User with this email already exists');
    }

    if (!isValidEmail) {
      return res.badRequest({ email, reason: 'Invalid format' }, 'Invalid email address');
    }

    const user = await User.create({ email, name, password });
    res.created(user, 'User created successfully');
  }),
);
```

## Database Error Handling

### MongoDB Error Handling

```javascript
const mongoose = require('mongoose');

// MongoDB specific error handler
function handleMongoError(error, req, res, next) {
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
      kind: err.kind,
    }));

    return res.badRequest({ validationErrors }, 'Validation failed');
  }

  if (error.name === 'CastError') {
    return res.badRequest(
      {
        field: error.path,
        value: error.value,
        expectedType: error.kind,
      },
      `Invalid ${error.path} format`,
    );
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];

    return res.conflict({ field, value }, `${field} already exists`);
  }

  if (error.name === 'MongoTimeoutError') {
    return res.serviceUnavailable({ timeout: error.timeout }, 'Database connection timeout');
  }

  next(error);
}

app.use(handleMongoError);
```

### PostgreSQL Error Handling

```javascript
// PostgreSQL specific error handler
function handlePostgresError(error, req, res, next) {
  if (error.code === '23505') {
    // Unique violation
    return res.conflict(
      {
        constraint: error.constraint,
        detail: error.detail,
      },
      'Resource already exists',
    );
  }

  if (error.code === '23503') {
    // Foreign key violation
    return res.badRequest(
      {
        constraint: error.constraint,
        detail: error.detail,
      },
      'Referenced resource does not exist',
    );
  }

  if (error.code === '23502') {
    // Not null violation
    return res.badRequest(
      {
        column: error.column,
        table: error.table,
      },
      'Required field is missing',
    );
  }

  if (error.code === 'ECONNREFUSED') {
    return res.serviceUnavailable({ database: 'PostgreSQL' }, 'Database connection failed');
  }

  next(error);
}

app.use(handlePostgresError);
```

## Authentication Error Handling

### JWT Error Handling

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.unauthorized(
      {
        authMethods: ['Bearer Token'],
        example: 'Authorization: Bearer <token>',
      },
      'Access token required',
    );
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.unauthorized(
          {
            error: 'Token expired',
            expiredAt: err.expiredAt,
            refreshEndpoint: '/api/auth/refresh',
          },
          'Token has expired',
        );
      }

      if (err.name === 'JsonWebTokenError') {
        return res.unauthorized(
          {
            error: 'Invalid token',
            reason: err.message,
          },
          'Invalid access token',
        );
      }

      if (err.name === 'NotBeforeError') {
        return res.unauthorized(
          {
            error: 'Token not active',
            notBefore: err.date,
          },
          'Token is not active yet',
        );
      }

      return res.unauthorized({ error: err.message }, 'Token verification failed');
    }

    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
```

## Validation Error Handling

### Express Validator Integration

```javascript
const { validationResult, body, param, query } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    return res.badRequest({ validationErrors }, 'Validation failed');
  }

  next();
};

// Route with validation
app.post(
  '/api/users',
  [
    body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await User.create(req.body);
    res.created(user, 'User created successfully');
  }),
);
```

### Joi Validation Integration

```javascript
const Joi = require('joi');

// Joi validation middleware
const validateWithJoi = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type,
      }));

      return res.badRequest({ validationErrors }, 'Input validation failed');
    }

    req.body = value; // Use sanitized/validated data
    next();
  };
};

// Schema definition
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required(),
  name: Joi.string().trim().min(2).max(50).required(),
  age: Joi.number().integer().min(18).max(120).optional(),
});

// Route with Joi validation
app.post(
  '/api/users',
  validateWithJoi(userSchema),
  asyncHandler(async (req, res) => {
    const user = await User.create(req.body);
    res.created(user, 'User created successfully');
  }),
);
```

## Rate Limiting Error Handling

### Express Rate Limit Integration

```javascript
const rateLimit = require('express-rate-limit');

// Custom rate limit handler
const createRateLimiter = (options) => {
  return rateLimit({
    ...options,
    handler: (req, res) => {
      const retryAfter = Math.round(options.windowMs / 1000);

      res.tooManyRequests(
        {
          limit: options.max,
          windowMs: options.windowMs,
          retryAfter,
          resetTime: new Date(Date.now() + options.windowMs).toISOString(),
        },
        'Too many requests, please try again later',
      );
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', strictLimiter);
```

## File Upload Error Handling

### Multer Error Handling

```javascript
const multer = require('multer');
const path = require('path');

// Multer configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Multer error handler
function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.badRequest(
        {
          maxSize: '5MB',
          receivedSize: error.field,
        },
        'File too large',
      );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.badRequest(
        {
          maxFiles: 3,
          receivedFiles: error.field,
        },
        'Too many files',
      );
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.badRequest(
        {
          unexpectedField: error.field,
          allowedFields: ['avatar', 'documents'],
        },
        'Unexpected file field',
      );
    }
  }

  if (error.message === 'Invalid file type') {
    return res.badRequest(
      {
        allowedTypes: ['jpeg', 'jpg', 'png', 'gif', 'pdf'],
      },
      'Invalid file type',
    );
  }

  next(error);
}

// File upload route
app.post(
  '/api/upload',
  upload.array('files', 3),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.badRequest({ requiredField: 'files' }, 'No files uploaded');
    }

    const fileInfo = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      path: file.path,
    }));

    res.created(fileInfo, 'Files uploaded successfully');
  }),
);
```

## Environment-Specific Error Handling

### Development vs Production

```javascript
const createErrorHandler = () => {
  return (error, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Log error (always)
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    // Send to monitoring service in production
    if (isProduction) {
      sendToMonitoringService(error, {
        url: req.url,
        method: req.method,
        user: req.user?.id,
      });
    }

    // Response based on environment
    if (isProduction) {
      // Generic error response
      res.error(
        {
          errorId: generateErrorId(),
          timestamp: new Date().toISOString(),
        },
        'Internal server error',
      );
    } else {
      // Detailed error response for development
      res.error(
        {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
        },
        'Development error details',
      );
    }
  };
};

function generateErrorId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function sendToMonitoringService(error, context) {
  // Integration with Sentry, LogRocket, etc.
  // sentry.captureException(error, { extra: context });
}

app.use(createErrorHandler());
```

This comprehensive error handling system ensures that all types of errors are properly caught, logged, and responded to with appropriate HTTP status codes and Response Handler methods.
