# Custom Error Types

Advanced error handling patterns with custom error classes and Response Handler.

## Custom Error Classes

### Base Application Error

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: this.stack,
      }),
    };
  }
}

module.exports = AppError;
```

### Validation Errors

```javascript
// errors/ValidationError.js
const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message = 'Validation failed', validationErrors = []) {
    super(message, 400, 'VALIDATION_ERROR', {
      validationErrors,
    });
  }

  static fromJoi(joiError) {
    const validationErrors = joiError.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
      type: detail.type,
    }));

    return new ValidationError('Input validation failed', validationErrors);
  }

  static fromExpressValidator(errors) {
    const validationErrors = errors.map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      type: 'field_validation',
    }));

    return new ValidationError('Input validation failed', validationErrors);
  }

  addField(field, message, value = null) {
    this.details.validationErrors.push({
      field,
      message,
      value,
      type: 'custom_validation',
    });
    return this;
  }
}

module.exports = ValidationError;
```

### Business Logic Errors

```javascript
// errors/BusinessError.js
const AppError = require('./AppError');

class BusinessError extends AppError {
  constructor(message, code, details = {}) {
    super(message, 422, code, details);
  }
}

class InsufficientFundsError extends BusinessError {
  constructor(required, available, accountId) {
    super('Insufficient funds for this transaction', 'INSUFFICIENT_FUNDS', {
      required,
      available,
      accountId,
    });
  }
}

class AccountLockedError extends BusinessError {
  constructor(accountId, reason = 'Security violation') {
    super('Account is locked and cannot perform this action', 'ACCOUNT_LOCKED', {
      accountId,
      reason,
    });
  }
}

class DuplicateResourceError extends BusinessError {
  constructor(resource, field, value) {
    super(`${resource} with ${field} '${value}' already exists`, 'DUPLICATE_RESOURCE', {
      resource,
      field,
      value,
    });
  }
}

class ResourceNotFoundError extends BusinessError {
  constructor(resource, identifier) {
    super(`${resource} not found`, 'RESOURCE_NOT_FOUND', { resource, identifier });
    this.statusCode = 404;
  }
}

class QuotaExceededError extends BusinessError {
  constructor(quotaType, limit, current) {
    super(`${quotaType} quota exceeded`, 'QUOTA_EXCEEDED', { quotaType, limit, current });
    this.statusCode = 429;
  }
}

module.exports = {
  BusinessError,
  InsufficientFundsError,
  AccountLockedError,
  DuplicateResourceError,
  ResourceNotFoundError,
  QuotaExceededError,
};
```

### Authentication & Authorization Errors

```javascript
// errors/AuthError.js
const AppError = require('./AppError');

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

class TokenExpiredError extends AuthenticationError {
  constructor(tokenType = 'access_token') {
    super(`${tokenType} has expired`);
    this.code = 'TOKEN_EXPIRED';
    this.details = { tokenType };
  }
}

class InvalidTokenError extends AuthenticationError {
  constructor(tokenType = 'access_token') {
    super(`Invalid ${tokenType}`);
    this.code = 'INVALID_TOKEN';
    this.details = { tokenType };
  }
}

class AuthorizationError extends AppError {
  constructor(requiredRole, userRole, resource = null) {
    super('Insufficient permissions to access this resource', 403, 'AUTHORIZATION_FAILED', {
      requiredRole,
      userRole,
      resource,
    });
  }
}

class AccountNotVerifiedError extends AuthenticationError {
  constructor(email) {
    super('Account email not verified');
    this.code = 'ACCOUNT_NOT_VERIFIED';
    this.details = { email };
  }
}

module.exports = {
  AuthenticationError,
  TokenExpiredError,
  InvalidTokenError,
  AuthorizationError,
  AccountNotVerifiedError,
};
```

### External Service Errors

```javascript
// errors/ExternalError.js
const AppError = require('./AppError');

class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`External service error: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    });

    this.service = service;
    this.originalError = originalError;
  }
}

class PaymentServiceError extends ExternalServiceError {
  constructor(provider, transactionId, message, originalError = null) {
    super(provider, message, originalError);
    this.code = 'PAYMENT_SERVICE_ERROR';
    this.details.transactionId = transactionId;
    this.details.provider = provider;
  }
}

class EmailServiceError extends ExternalServiceError {
  constructor(provider, recipient, message, originalError = null) {
    super(provider, message, originalError);
    this.code = 'EMAIL_SERVICE_ERROR';
    this.details.recipient = recipient;
    this.details.provider = provider;
  }
}

class DatabaseConnectionError extends ExternalServiceError {
  constructor(database, operation, originalError = null) {
    super(database, `Database operation failed: ${operation}`, originalError);
    this.code = 'DATABASE_CONNECTION_ERROR';
    this.details.operation = operation;
    this.statusCode = 500;
  }
}

module.exports = {
  ExternalServiceError,
  PaymentServiceError,
  EmailServiceError,
  DatabaseConnectionError,
};
```

## Error Handler Middleware

### Enhanced Error Handler

```javascript
// middleware/errorHandler.js
const { quickSetup } = require('response-handler');
const AppError = require('../errors/AppError');
const ValidationError = require('../errors/ValidationError');

function createErrorHandler(config = {}) {
  return quickSetup({
    ...config,
    customErrorHandler: (error, req, res, next) => {
      // Handle operational errors
      if (error.isOperational) {
        return handleOperationalError(error, req, res);
      }

      // Handle known error types
      if (error.name === 'ValidationError') {
        return handleValidationError(error, req, res);
      }

      if (error.name === 'CastError') {
        return handleCastError(error, req, res);
      }

      if (error.code === 11000) {
        return handleDuplicateKeyError(error, req, res);
      }

      if (error.name === 'JsonWebTokenError') {
        return handleJWTError(error, req, res);
      }

      if (error.name === 'TokenExpiredError') {
        return handleTokenExpiredError(error, req, res);
      }

      // Handle unknown errors
      return handleProgrammingError(error, req, res);
    },
  });
}

function handleOperationalError(error, req, res) {
  const statusCode = error.statusCode || 500;

  // Map status codes to response methods
  switch (statusCode) {
    case 400:
      return res.badRequest(error.toJSON(), error.message);
    case 401:
      return res.unauthorized(error.toJSON(), error.message);
    case 403:
      return res.forbidden(error.toJSON(), error.message);
    case 404:
      return res.notFound(error.toJSON(), error.message);
    case 409:
      return res.conflict(error.toJSON(), error.message);
    case 422:
      return res.unprocessableEntity(error.toJSON(), error.message);
    case 429:
      return res.tooManyRequests(error.toJSON(), error.message);
    default:
      return res.error(error.toJSON(), error.message);
  }
}

function handleValidationError(error, req, res) {
  const validationError = ValidationError.fromJoi(error);
  return res.badRequest(validationError.toJSON(), validationError.message);
}

function handleCastError(error, req, res) {
  const message = `Invalid ${error.path}: ${error.value}`;
  const customError = new ValidationError(message, [
    {
      field: error.path,
      message: `Invalid ${error.path}`,
      value: error.value,
      type: 'cast_error',
    },
  ]);

  return res.badRequest(customError.toJSON(), customError.message);
}

function handleDuplicateKeyError(error, req, res) {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];

  const customError = new DuplicateResourceError('Resource', field, value);
  return res.conflict(customError.toJSON(), customError.message);
}

function handleJWTError(error, req, res) {
  const customError = new InvalidTokenError();
  return res.unauthorized(customError.toJSON(), customError.message);
}

function handleTokenExpiredError(error, req, res) {
  const customError = new TokenExpiredError();
  return res.unauthorized(customError.toJSON(), customError.message);
}

function handleProgrammingError(error, req, res) {
  console.error('Programming Error:', error);

  // In production, don't leak error details
  if (process.env.NODE_ENV === 'production') {
    return res.error({}, 'Something went wrong');
  }

  // In development, show full error
  return res.error(
    {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    'Internal server error',
  );
}

module.exports = { createErrorHandler };
```

## Usage Examples

### User Service with Custom Errors

```javascript
// services/UserService.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const {
  ValidationError,
  DuplicateResourceError,
  ResourceNotFoundError,
  AuthenticationError,
} = require('../errors');

class UserService {
  static async createUser(userData) {
    const { email, password, name } = userData;

    // Validate input
    if (!email || !password || !name) {
      throw new ValidationError('Missing required fields')
        .addField('email', 'Email is required')
        .addField('password', 'Password is required')
        .addField('name', 'Name is required');
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new DuplicateResourceError('User', 'email', email);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password validation failed').addField(
        'password',
        'Password must be at least 8 characters',
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        email,
        name,
        password: hashedPassword,
      });

      return user;
    } catch (error) {
      throw new DatabaseConnectionError('User Database', 'create user', error);
    }
  }

  static async authenticateUser(email, password) {
    if (!email || !password) {
      throw new ValidationError('Authentication data required')
        .addField('email', 'Email is required')
        .addField('password', 'Password is required');
    }

    const user = await User.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new AccountNotVerifiedError(email);
    }

    return user;
  }

  static async getUserById(id) {
    if (!id) {
      throw new ValidationError('User ID is required').addField('id', 'Valid user ID is required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new ResourceNotFoundError('User', id);
    }

    return user;
  }
}

module.exports = UserService;
```

### API Routes with Custom Errors

```javascript
// routes/users.js
const express = require('express');
const UserService = require('../services/UserService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create user
router.post('/', async (req, res, next) => {
  try {
    const user = await UserService.createUser(req.body);
    res.created(user, 'User created successfully');
  } catch (error) {
    next(error); // Error handler middleware will handle custom errors
  }
});

// Authenticate user
router.post('/auth', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserService.authenticateUser(email, password);

    const token = generateToken(user.id);

    res.ok(
      {
        user: user.toJSON(),
        token,
      },
      'Authentication successful',
    );
  } catch (error) {
    next(error);
  }
});

// Get user
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.ok(user.toJSON(), 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Socket.IO with Custom Errors

```javascript
// handlers/userHandler.js
const UserService = require('../services/UserService');

function handleUserEvents(io) {
  io.on('connection', (socket) => {
    socket.on('user:create', async (data) => {
      try {
        const user = await UserService.createUser(data);
        socket.created(user.toJSON(), 'User created successfully');
      } catch (error) {
        handleSocketError(socket, error);
      }
    });

    socket.on('user:authenticate', async (data) => {
      try {
        const result = await UserService.authenticateUser(data.email, data.password);
        socket.ok(result, 'Authentication successful');
      } catch (error) {
        handleSocketError(socket, error);
      }
    });
  });
}

function handleSocketError(socket, error) {
  if (error.isOperational) {
    const statusCode = error.statusCode || 500;

    switch (statusCode) {
      case 400:
        return socket.badRequest(error.toJSON(), error.message);
      case 401:
        return socket.unauthorized(error.toJSON(), error.message);
      case 403:
        return socket.forbidden(error.toJSON(), error.message);
      case 404:
        return socket.notFound(error.toJSON(), error.message);
      case 409:
        return socket.conflict(error.toJSON(), error.message);
      case 429:
        return socket.tooManyRequests(error.toJSON(), error.message);
      default:
        return socket.error(error.toJSON(), error.message);
    }
  }

  // Log programming errors
  console.error('Socket programming error:', error);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    return socket.error({}, 'Internal server error');
  }

  return socket.error(
    {
      message: error.message,
      stack: error.stack,
    },
    'Internal server error',
  );
}

module.exports = { handleUserEvents, handleSocketError };
```

## Error Monitoring & Logging

### Error Logger

```javascript
// utils/errorLogger.js
const winston = require('winston');

const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    timestamp: new Date().toISOString(),
    context,
  };

  errorLogger.error(errorInfo);

  // Send to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoringService(errorInfo);
  }
}

function sendToMonitoringService(errorInfo) {
  // Integrate with Sentry, LogRocket, etc.
  // Sentry.captureException(error);
}

module.exports = { logError };
```

This comprehensive custom error system provides type-safe, descriptive errors that integrate seamlessly with Response Handler for consistent API responses.
