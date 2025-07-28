# Custom Configuration Examples

Advanced configuration examples for different use cases and environments.

## Basic Configuration

### Default Setup

```javascript
const { quickSetup } = require('response-handler');

// Minimal configuration
app.use(quickSetup());
```

### Custom Configuration

```javascript
const config = {
  enableLogging: true,
  logLevel: 'info',
  environment: 'development',
  enablePerformanceTracking: true,
  enableSecurity: true
};

app.use(quickSetup(config));
```

## Environment-Specific Configurations

### Development Environment

```javascript
const developmentConfig = {
  enableLogging: true,
  logLevel: 'debug',
  environment: 'development',
  enablePerformanceTracking: true,
  enableSecurity: false, // Disable for easier debugging
  customLoggers: {
    info: console.log,
    error: console.error,
    debug: console.debug,
    warn: console.warn
  },
  responseHeaders: {
    'X-Debug-Mode': 'true',
    'X-Response-Time': true
  }
};

if (process.env.NODE_ENV === 'development') {
  app.use(quickSetup(developmentConfig));
}
```

### Production Environment

```javascript
const productionConfig = {
  enableLogging: true,
  logLevel: 'error', // Only log errors in production
  environment: 'production',
  enablePerformanceTracking: false, // Disable for performance
  enableSecurity: true,
  customLoggers: {
    error: (message) => {
      // Send to external logging service
      logToService('error', message);
    },
    info: (message) => {
      // Send to external logging service
      logToService('info', message);
    }
  },
  responseHeaders: {
    'X-API-Version': '1.0.0'
  }
};

if (process.env.NODE_ENV === 'production') {
  app.use(quickSetup(productionConfig));
}
```

### Testing Environment

```javascript
const testConfig = {
  enableLogging: false, // Disable logging in tests
  logLevel: 'silent',
  environment: 'test',
  enablePerformanceTracking: false,
  enableSecurity: false
};

if (process.env.NODE_ENV === 'test') {
  app.use(quickSetup(testConfig));
}
```

## Custom Loggers

### Winston Logger Integration

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const config = {
  enableLogging: true,
  customLoggers: {
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
    debug: (message) => logger.debug(message),
    warn: (message) => logger.warn(message)
  }
};

app.use(quickSetup(config));
```

### Pino Logger Integration

```javascript
const pino = require('pino');
const logger = pino();

const config = {
  enableLogging: true,
  customLoggers: {
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
    debug: (message) => logger.debug(message),
    warn: (message) => logger.warn(message)
  }
};

app.use(quickSetup(config));
```

## Socket.IO Configuration

### Basic Socket Configuration

```javascript
const { quickSocketSetup } = require('response-handler');

const socketConfig = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development'
};

io.use(quickSocketSetup(socketConfig));
```

### Advanced Socket Configuration

```javascript
const advancedSocketConfig = {
  enableLogging: true,
  logLevel: 'debug',
  environment: 'development',
  customLoggers: {
    info: (message) => console.log(`[SOCKET INFO] ${message}`),
    error: (message) => console.error(`[SOCKET ERROR] ${message}`),
    debug: (message) => console.debug(`[SOCKET DEBUG] ${message}`)
  },
  responseHeaders: {
    'X-Socket-Version': '1.0.0'
  }
};

io.use(quickSocketSetup(advancedSocketConfig));
```

## Database Integration

### MongoDB Configuration

```javascript
const { quickSetup } = require('response-handler');
const mongoose = require('mongoose');

const mongoConfig = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV,
  customLoggers: {
    info: (message) => {
      console.log(message);
      // Log to MongoDB
      logToMongoDB('info', message);
    },
    error: (message) => {
      console.error(message);
      // Log to MongoDB
      logToMongoDB('error', message);
    }
  }
};

async function logToMongoDB(level, message) {
  try {
    await LogModel.create({
      level,
      message,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log to MongoDB:', error);
  }
}

app.use(quickSetup(mongoConfig));
```

## Microservices Configuration

### Service-Specific Configuration

```javascript
const serviceConfig = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV,
  responseHeaders: {
    'X-Service-Name': process.env.SERVICE_NAME || 'api-service',
    'X-Service-Version': process.env.SERVICE_VERSION || '1.0.0',
    'X-Request-ID': true // Add request ID to responses
  },
  customLoggers: {
    info: (message) => {
      const logData = {
        level: 'info',
        message,
        service: process.env.SERVICE_NAME,
        timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(logData));
    },
    error: (message) => {
      const logData = {
        level: 'error',
        message,
        service: process.env.SERVICE_NAME,
        timestamp: new Date().toISOString()
      };
      console.error(JSON.stringify(logData));
    }
  }
};

app.use(quickSetup(serviceConfig));
```

## Rate Limiting Integration

### Express Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const { quickSetup } = require('response-handler');

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    res.tooManyRequests({}, 'Too many requests, please try again later');
  }
});

// Response handler configuration
const config = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV
};

app.use(limiter);
app.use(quickSetup(config));
```

## CORS Configuration

### CORS with Response Handler

```javascript
const cors = require('cors');
const { quickSetup } = require('response-handler');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

const responseConfig = {
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV,
  responseHeaders: {
    'X-API-Version': '1.0.0',
    'X-Powered-By': 'Response Handler'
  }
};

app.use(cors(corsOptions));
app.use(quickSetup(responseConfig));
```

## Health Check Configuration

### Health Check Endpoint

```javascript
const { quickSetup } = require('response-handler');

app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.ok(healthData, 'Service is healthy');
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      database: await checkDatabaseConnection(),
      externalServices: await checkExternalServices()
    };
    
    res.ok(healthData, 'Detailed health check completed');
  } catch (error) {
    res.error(error, 'Health check failed');
  }
});
```

## Complete Application Example

### Full Express Application with Custom Configuration

```javascript
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const { quickSetup } = require('response-handler');

const app = express();

// Environment-based configuration
const config = {
  development: {
    enableLogging: true,
    logLevel: 'debug',
    environment: 'development',
    enablePerformanceTracking: true,
    enableSecurity: false
  },
  production: {
    enableLogging: true,
    logLevel: 'error',
    environment: 'production',
    enablePerformanceTracking: false,
    enableSecurity: true,
    customLoggers: {
      error: (message) => {
        // Send to monitoring service
        console.error(message);
      }
    }
  },
  test: {
    enableLogging: false,
    logLevel: 'silent',
    environment: 'test',
    enablePerformanceTracking: false,
    enableSecurity: false
  }
};

const currentConfig = config[process.env.NODE_ENV] || config.development;

// Security middleware
app.use(helmet());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Response handler middleware
app.use(quickSetup(currentConfig));

// Routes
app.get('/api/status', (req, res) => {
  res.ok({ status: 'running' }, 'API is running');
});

// Error handling
app.use((err, req, res, next) => {
  res.error(err, 'Internal server error');
});

// 404 handler
app.use((req, res) => {
  res.notFound({}, 'Route not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```
