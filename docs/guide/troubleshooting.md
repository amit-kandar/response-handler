# Troubleshooting

Common issues and solutions when working with Response Handler.

## Installation Issues

### Package Installation Failures

**Problem**: npm install fails with dependency conflicts

```bash
npm ERR! peer dep missing: express@>=4.0.0
```

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps

# Or use specific version
npm install express@^5.0.0
npm install @amitkandar/response-handler
```

### TypeScript Definition Issues

**Problem**: TypeScript cannot find type definitions

```typescript
// Error: Cannot find module 'response-handler' or its corresponding type declarations
import { quickSetup } from 'response-handler';
```

**Solution**:

```bash
# Install TypeScript definitions
npm install @types/express @types/socket.io

# Or create custom types
// types/response-handler.d.ts
declare module 'response-handler' {
  export function quickSetup(config?: any): any;
  export function quickSocketSetup(config?: any): any;
}
```

## Configuration Issues

### Middleware Not Working

**Problem**: Response methods not available on res object

```javascript
app.get('/test', (req, res) => {
  res.ok('test'); // TypeError: res.ok is not a function
});
```

**Solution**:

```javascript
// Ensure middleware is applied BEFORE routes
const { quickSetup } = require('response-handler');

app.use(quickSetup()); // Must come before route definitions

app.get('/test', (req, res) => {
  res.ok('test'); // Now works
});
```

### Incorrect Configuration Object

**Problem**: Configuration not being applied

```javascript
// ❌ Wrong configuration structure
app.use(
  quickSetup({
    logging: true, // Should be enableLogging
    level: 'info', // Should be logLevel
  }),
);
```

**Solution**:

```javascript
// ✅ Correct configuration structure
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'info',
    environment: 'development',
  }),
);
```

## Response Issues

### Double Response Errors

**Problem**: Cannot set headers after they are sent

```
Error: Cannot set headers after they are sent to the client
```

**Common causes and solutions**:

```javascript
// ❌ Problem: Multiple responses in same handler
app.get('/user/:id', async (req, res) => {
  const user = await getUser(req.params.id);

  if (!user) {
    res.notFound({}, 'User not found');
  }

  res.ok(user, 'User found'); // Error: headers already sent
});

// ✅ Solution: Use return statements
app.get('/user/:id', async (req, res) => {
  const user = await getUser(req.params.id);

  if (!user) {
    return res.notFound({}, 'User not found');
  }

  res.ok(user, 'User found');
});
```

### Response Format Issues

**Problem**: Inconsistent response format

```javascript
// Sometimes returns different structure
{
  "success": true,
  "data": {...}
}
// vs
{
  "status": "ok",
  "result": {...}
}
```

**Solution**:

```javascript
// Ensure consistent configuration across all instances
const responseConfig = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development',
};

// Use same config everywhere
app.use(quickSetup(responseConfig));
io.use(quickSocketSetup(responseConfig));
```

## Socket.IO Issues

### Socket Events Not Working

**Problem**: Socket response methods not available

```javascript
io.on('connection', (socket) => {
  socket.on('get-data', () => {
    socket.ok(data); // TypeError: socket.ok is not a function
  });
});
```

**Solution**:

```javascript
// Ensure Socket.IO middleware is applied
const { quickSocketSetup } = require('response-handler');

io.use(
  quickSocketSetup({
    enableLogging: true,
    logLevel: 'info',
  }),
);

io.on('connection', (socket) => {
  socket.on('get-data', () => {
    socket.ok(data); // Now works
  });
});
```

### Connection Issues

**Problem**: Socket connections failing

```javascript
// Client can't connect to socket server
const socket = io('http://localhost:3000');
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

**Solution**:

```javascript
// Check CORS configuration
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Verify server is listening
server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Performance Issues

### Slow Response Times

**Problem**: API responses are slow

**Debugging steps**:

```javascript
// Enable performance tracking
app.use(
  quickSetup({
    enablePerformanceTracking: true,
    logLevel: 'debug',
  }),
);

// Add timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.get('/slow-endpoint', async (req, res) => {
  const start = Date.now();

  // Your logic here
  const data = await slowDatabaseQuery();

  const queryTime = Date.now() - start;
  console.log(`Query took: ${queryTime}ms`);

  res.ok(data, 'Data retrieved', {
    performance: {
      queryTime: `${queryTime}ms`,
      totalTime: `${Date.now() - req.startTime}ms`,
    },
  });
});
```

### Memory Leaks

**Problem**: Memory usage increasing over time

**Solution**:

```javascript
// Monitor memory usage
const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
};

// Log memory usage periodically
setInterval(() => {
  console.log('Memory usage:', getMemoryUsage());
}, 60000);

// Check for common leak sources
app.use((req, res, next) => {
  // Remove event listeners
  res.on('finish', () => {
    // Clean up any resources
  });
  next();
});
```

## Logging Issues

### Logs Not Appearing

**Problem**: No logs being generated

```javascript
// Logs not showing up
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'info',
  }),
);
```

**Solution**:

```javascript
// Check log level hierarchy
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'debug', // Try lower level
    customLoggers: {
      info: console.log,
      error: console.error,
      debug: console.debug,
    },
  }),
);

// Verify environment
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Logging enabled:', config.enableLogging);
```

### Log Format Issues

**Problem**: Logs have wrong format or missing information

```javascript
// Want structured logging
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
  ],
});

app.use(
  quickSetup({
    enableLogging: true,
    customLoggers: {
      info: (message, meta) => logger.info(message, meta),
      error: (message, meta) => logger.error(message, meta),
      debug: (message, meta) => logger.debug(message, meta),
    },
  }),
);
```

## Database Issues

### Connection Problems

**Problem**: Database connection errors

```javascript
// Error: Connection timeout
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.ok(result.rows, 'Users retrieved');
  } catch (error) {
    res.error(error, 'Database error');
  }
});
```

**Solution**:

```javascript
// Add retry logic and better error handling
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Database connected successfully');
  release();
});

// Retry wrapper
const queryWithRetry = async (query, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Query failed, retrying... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }
  }
};
```

### Query Performance Issues

**Problem**: Slow database queries

```javascript
// Add query performance monitoring
app.use((req, res, next) => {
  const originalQuery = pool.query;
  pool.query = function (...args) {
    const start = Date.now();
    const result = originalQuery.apply(this, args);

    result.then(() => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`Slow query detected: ${duration}ms`, args[0]);
      }
    });

    return result;
  };
  next();
});
```

## Authentication Issues

### JWT Token Problems

**Problem**: JWT verification failing

```javascript
// Common JWT issues and solutions
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.unauthorized({}, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.unauthorized({}, 'Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      return res.forbidden({}, 'Invalid token');
    } else {
      return res.error(error, 'Token verification failed');
    }
  }
};
```

## Error Handling Issues

### Unhandled Errors

**Problem**: Application crashing due to unhandled errors

```javascript
// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to monitoring service
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to monitoring service
});

// Express error handler
app.use((error, req, res, next) => {
  console.error('Express error:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.error(error, 'Internal server error');
});
```

## Testing Issues

### Test Environment Setup

**Problem**: Tests failing due to environment issues

```javascript
// Proper test setup
// test/setup.js
require('dotenv').config({ path: '.env.test' });

const { Pool } = require('pg');

// Test database setup
const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/test_db',
});

beforeAll(async () => {
  // Setup test database
  await testPool.query(
    'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255))',
  );
});

afterAll(async () => {
  // Cleanup
  await testPool.end();
});

beforeEach(async () => {
  // Clear data before each test
  await testPool.query('TRUNCATE TABLE users RESTART IDENTITY');
});
```

## Deployment Issues

### Production Configuration

**Problem**: Application not working in production

```javascript
// Environment-specific configuration
const config = {
  development: {
    enableLogging: true,
    logLevel: 'debug',
    enablePerformanceTracking: true,
  },
  production: {
    enableLogging: true,
    logLevel: 'error',
    enablePerformanceTracking: false,
    enableSecurity: true,
  },
  test: {
    enableLogging: false,
    logLevel: 'silent',
  },
};

const env = process.env.NODE_ENV || 'development';
app.use(quickSetup(config[env]));
```

## Debugging Tools

### Enable Debug Mode

```javascript
// Set debug environment variable
DEBUG=response-handler:* npm start

// Or programmatically
process.env.DEBUG = 'response-handler:*';

// Custom debug logging
const debug = require('debug')('myapp:response');

app.use((req, res, next) => {
  debug('Request:', req.method, req.url);
  next();
});
```

### Health Check Endpoint

```javascript
// Add health check for debugging
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  };

  res.ok(health, 'Health check successful');
});
```

## Getting Help

### Enable Verbose Logging

```javascript
// Maximum verbosity for debugging
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'debug',
    enablePerformanceTracking: true,
    customLoggers: {
      debug: (message, meta) => {
        console.log('[DEBUG]', message, meta);
      },
      info: (message, meta) => {
        console.log('[INFO]', message, meta);
      },
      error: (message, meta) => {
        console.error('[ERROR]', message, meta);
      },
    },
  }),
);
```

### Collect Diagnostic Information

```javascript
// Diagnostic endpoint
app.get('/diagnostic', (req, res) => {
  const diagnostic = {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    pid: process.pid,
    responseHandlerVersion: require('./package.json').version,
  };

  res.ok(diagnostic, 'Diagnostic information');
});
```

If you're still experiencing issues, please check the [GitHub Issues](https://github.com/amit-kandar/response-handler/issues) or create a new issue with:

1. **Environment details** (Node.js version, OS, package version)
2. **Configuration used**
3. **Error messages** and stack traces
4. **Code sample** that reproduces the issue
5. **Expected vs actual behavior**
