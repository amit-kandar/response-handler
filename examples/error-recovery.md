# Error Recovery Examples

This guide demonstrates various error recovery patterns and strategies using the response handler.

## Automatic Retry Pattern

```javascript
import express from 'express';
import { configureResponseHandler } from '@amitkandar/response-handler';

const app = express();
app.use(configureResponseHandler());

// Retry utility function
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
};

// Database operation with retry
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await withRetry(
      async () => {
        const result = await database.findUser(req.params.id);
        if (!result) {
          throw new Error('User not found');
        }
        return result;
      },
      3,
      500,
    );

    res.sendSuccess(user, 'User retrieved successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      res.sendNotFound('User not found');
    } else {
      res.sendError('DATABASE_ERROR', 'Failed to retrieve user after multiple attempts', {
        originalError: error.message,
        retries: 3,
      });
    }
  }
});
```

## Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

// External service with circuit breaker
const externalServiceBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
});

app.get('/api/external-data', async (req, res) => {
  try {
    const data = await externalServiceBreaker.execute(async () => {
      const response = await fetch('https://external-api.com/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    });

    res.sendSuccess(data, 'External data retrieved successfully');
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      res.sendError('SERVICE_UNAVAILABLE', 'External service is temporarily unavailable', {
        circuitBreakerState: 'OPEN',
        suggestion: 'Please try again later',
      });
    } else {
      res.sendError('EXTERNAL_SERVICE_ERROR', 'Failed to fetch external data', {
        originalError: error.message,
      });
    }
  }
});
```

## Graceful Degradation

```javascript
// Service with fallback mechanisms
class UserService {
  constructor() {
    this.cache = new Map();
    this.fallbackData = {
      name: 'Guest User',
      preferences: { theme: 'light', language: 'en' },
    };
  }

  async getUser(userId) {
    try {
      // Try primary database
      const user = await this.getPrimaryUser(userId);
      this.cache.set(userId, user);
      return user;
    } catch (primaryError) {
      console.warn('Primary database failed:', primaryError.message);

      try {
        // Try backup database
        const user = await this.getBackupUser(userId);
        this.cache.set(userId, user);
        return { ...user, source: 'backup' };
      } catch (backupError) {
        console.warn('Backup database failed:', backupError.message);

        // Try cache
        if (this.cache.has(userId)) {
          const cachedUser = this.cache.get(userId);
          return { ...cachedUser, source: 'cache' };
        }

        // Return fallback data
        return {
          ...this.fallbackData,
          id: userId,
          source: 'fallback',
          warning: 'Limited data available due to service issues',
        };
      }
    }
  }

  async getPrimaryUser(userId) {
    // Primary database call
    const response = await fetch(`https://primary-db.com/users/${userId}`);
    if (!response.ok) throw new Error('Primary DB error');
    return response.json();
  }

  async getBackupUser(userId) {
    // Backup database call
    const response = await fetch(`https://backup-db.com/users/${userId}`);
    if (!response.ok) throw new Error('Backup DB error');
    return response.json();
  }
}

const userService = new UserService();

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUser(req.params.id);

    const message =
      user.source === 'fallback'
        ? 'User data retrieved from fallback (limited functionality)'
        : user.source === 'cache'
          ? 'User data retrieved from cache'
          : user.source === 'backup'
            ? 'User data retrieved from backup database'
            : 'User data retrieved successfully';

    res.sendSuccess(user, message, {
      dataSource: user.source,
      degraded: user.source !== 'primary',
    });
  } catch (error) {
    res.sendError('USER_SERVICE_ERROR', 'Unable to retrieve user data', {
      error: error.message,
    });
  }
});
```

## Error Recovery Middleware

```javascript
// Global error recovery middleware
const errorRecoveryMiddleware = (options = {}) => {
  const {
    enableRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    enableFallback = true,
    enableCircuitBreaker = true,
  } = options;

  return async (err, req, res, next) => {
    console.error('Error occurred:', err);

    // Attempt recovery based on error type
    if (err.code === 'ECONNREFUSED' && enableRetry) {
      try {
        // Retry database connection
        await retryDatabaseConnection();
        res.sendError('TEMPORARY_ERROR', 'Service temporarily unavailable, please retry', {
          recovery: 'retry_suggested',
          retryAfter: 5,
        });
      } catch (retryError) {
        res.sendError('DATABASE_ERROR', 'Database connection failed', {
          recovery: 'fallback_activated',
        });
      }
    } else if (err.code === 'TIMEOUT' && enableFallback) {
      // Use cached data for timeout errors
      const cachedData = await getCachedResponse(req.path);
      if (cachedData) {
        res.sendSuccess(cachedData, 'Data retrieved from cache due to timeout', {
          source: 'cache',
          degraded: true,
        });
      } else {
        res.sendError('TIMEOUT_ERROR', 'Request timeout with no cached data available');
      }
    } else {
      // Default error handling
      res.sendError('INTERNAL_ERROR', 'An unexpected error occurred', {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });
    }
  };
};

app.use(
  errorRecoveryMiddleware({
    enableRetry: true,
    maxRetries: 3,
    enableFallback: true,
  }),
);
```

## Socket.IO Error Recovery

```javascript
import { Server } from 'socket.io';
import { createSocketHandler } from '@amitkandar/response-handler';

const io = new Server(server);
io.use(createSocketHandler());

// Connection recovery handler
io.on('connection', (socket) => {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);

    if (reason === 'io server disconnect') {
      // Server initiated disconnect, attempt reconnection
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.log('Connection error:', error);
    reconnectAttempts++;

    if (reconnectAttempts <= maxReconnectAttempts) {
      socket.sendError('CONNECTION_ERROR', 'Connection lost, attempting to reconnect', {
        attempt: reconnectAttempts,
        maxAttempts: maxReconnectAttempts,
        retryIn: Math.pow(2, reconnectAttempts) * 1000,
      });
    } else {
      socket.sendError('CONNECTION_FAILED', 'Unable to reconnect after multiple attempts', {
        attempts: reconnectAttempts,
        suggestion: 'Please refresh the page',
      });
    }
  });

  // Event handler with error recovery
  socket.on('send_message', async (data, callback) => {
    try {
      const message = await saveMessage(data);

      socket.sendSuccess('message_sent', message, 'Message sent successfully');
      socket.broadcast.emit('new_message', message);

      if (callback) callback({ success: true, messageId: message.id });
    } catch (error) {
      console.error('Message send error:', error);

      // Try to save to local queue
      try {
        await saveToLocalQueue(data);
        socket.sendError('MESSAGE_QUEUED', 'Message queued due to temporary issue', {
          queued: true,
          retryLater: true,
        });

        if (callback) callback({ success: false, queued: true });
      } catch (queueError) {
        socket.sendError('MESSAGE_FAILED', 'Failed to send message', {
          error: error.message,
          suggestion: 'Please try again',
        });

        if (callback) callback({ success: false, error: error.message });
      }
    }
  });

  // Retry queued messages
  socket.on('retry_queued_messages', async () => {
    try {
      const queuedMessages = await getQueuedMessages(socket.id);

      for (const message of queuedMessages) {
        try {
          const savedMessage = await saveMessage(message);
          socket.sendSuccess('message_sent', savedMessage, 'Queued message sent');
          await removeFromQueue(message.id);
        } catch (retryError) {
          console.error('Failed to retry message:', retryError);
        }
      }
    } catch (error) {
      socket.sendError('RETRY_FAILED', 'Failed to retry queued messages');
    }
  });
});
```

## Health Check and Recovery

```javascript
// Health check endpoint with recovery actions
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check database connection
  try {
    await database.ping();
    healthStatus.services.database = { status: 'healthy' };
  } catch (error) {
    healthStatus.services.database = {
      status: 'unhealthy',
      error: error.message,
      recovery: 'attempting_reconnection',
    };

    // Attempt recovery
    try {
      await database.reconnect();
      healthStatus.services.database.status = 'recovered';
    } catch (recoveryError) {
      healthStatus.status = 'degraded';
    }
  }

  // Check external services
  try {
    const response = await fetch('https://external-service.com/health', {
      timeout: 5000,
    });
    healthStatus.services.external = {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: response.headers.get('x-response-time'),
    };
  } catch (error) {
    healthStatus.services.external = {
      status: 'unhealthy',
      error: error.message,
      fallback: 'cache_enabled',
    };
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

  res.status(statusCode).sendSuccess(healthStatus, `System is ${healthStatus.status}`);
});

// Recovery endpoint
app.post('/admin/recover', async (req, res) => {
  const { service, action } = req.body;

  try {
    switch (service) {
      case 'database':
        if (action === 'reconnect') {
          await database.reconnect();
          res.sendSuccess(null, 'Database reconnection successful');
        }
        break;

      case 'cache':
        if (action === 'clear') {
          await cache.flushAll();
          res.sendSuccess(null, 'Cache cleared successfully');
        }
        break;

      case 'circuit_breaker':
        if (action === 'reset') {
          externalServiceBreaker.state = 'CLOSED';
          externalServiceBreaker.failureCount = 0;
          res.sendSuccess(null, 'Circuit breaker reset successfully');
        }
        break;

      default:
        res.sendError('INVALID_SERVICE', 'Unknown service for recovery');
    }
  } catch (error) {
    res.sendError('RECOVERY_FAILED', `Failed to recover ${service}`, {
      service,
      action,
      error: error.message,
    });
  }
});
```

## Best Practices

1. **Implement Multiple Recovery Strategies**: Use retry, fallback, and circuit breaker patterns
2. **Monitor Error Patterns**: Track error frequencies and recovery success rates
3. **Graceful Degradation**: Always provide some level of functionality
4. **User Communication**: Inform users about service status and recovery attempts
5. **Automatic Recovery**: Implement self-healing mechanisms where possible
6. **Manual Recovery**: Provide admin interfaces for manual intervention
7. **Testing**: Regularly test error scenarios and recovery procedures
