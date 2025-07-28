# Configuration Guide

Comprehensive guide to configuring the Enhanced Response Handler for different environments and use cases.

## Table of Contents

- [Configuration Overview](#configuration-overview)
- [Environment-Based Configuration](#environment-based-configuration)
- [Logging Configuration](#logging-configuration)
- [Response Configuration](#response-configuration)
- [Security Configuration](#security-configuration)
- [Performance Configuration](#performance-configuration)
- [Custom Configuration Patterns](#custom-configuration-patterns)

## Configuration Overview

The Enhanced Response Handler uses a comprehensive configuration system that allows you to customize behavior for different environments, logging preferences, security requirements, and performance needs.

### Basic Configuration Structure

```typescript
interface ResponseHandlerConfig {
  mode?: 'development' | 'production';
  logging?: LoggingConfig;
  responses?: ResponseConfig;
  security?: SecurityConfig;
  performance?: PerformanceConfig;
}
```

### Default Configuration

```javascript
const defaultConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: process.env.NODE_ENV !== 'production',
    includeRequest: false,
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    pagination: true,
    compression: false,
  },

  security: {
    sanitizeErrors: true,
    hideInternalErrors: process.env.NODE_ENV === 'production',
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: false,
  },

  performance: {
    enableCaching: false,
    cacheHeaders: true,
    etag: true,
    compression: false,
  },
};
```

## Environment-Based Configuration

### Development Environment

Optimized for debugging and development workflow:

```javascript
const developmentConfig = {
  mode: 'development',

  logging: {
    enabled: true,
    level: 'debug',
    logErrors: true,
    logRequests: true,
    logResponses: true,
    includeStack: true,
    includeRequest: true,
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: {
      environment: 'development',
      version: process.env.npm_package_version,
      nodeVersion: process.version,
    },
  },

  security: {
    sanitizeErrors: false,
    hideInternalErrors: false,
    allowedErrorFields: ['message', 'type', 'code', 'details', 'stack'],
    corsHeaders: true,
  },

  performance: {
    enableCaching: false,
    cacheHeaders: false,
    etag: false,
    compression: false,
  },
};
```

### Production Environment

Optimized for security, performance, and reliability:

```javascript
const productionConfig = {
  mode: 'production',

  logging: {
    enabled: true,
    level: 'error',
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: false,
    includeRequest: false,
    customLogger: (level, message, meta) => {
      // Use production logging service
      productionLogger.log(level, message, meta);
    },
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: false,
    customFields: {
      version: process.env.APP_VERSION,
      service: process.env.SERVICE_NAME,
    },
  },

  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true,
  },

  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
    compression: false, // Handled by reverse proxy
  },
};
```

### Testing Environment

Optimized for testing and CI/CD:

```javascript
const testConfig = {
  mode: 'development',

  logging: {
    enabled: false, // Reduce test noise
    level: 'error',
    logErrors: false,
    logRequests: false,
    logResponses: false,
  },

  responses: {
    includeTimestamp: false,
    includeRequestId: false,
    includeExecutionTime: false,
  },

  security: {
    sanitizeErrors: false,
    hideInternalErrors: false,
  },

  performance: {
    enableCaching: false,
    cacheHeaders: false,
    etag: false,
  },
};
```

## Logging Configuration

### LoggingConfig Interface

```typescript
interface LoggingConfig {
  enabled?: boolean; // Enable/disable logging
  level?: 'error' | 'warn' | 'info' | 'debug'; // Minimum log level
  logErrors?: boolean; // Log error events
  logRequests?: boolean; // Log incoming requests
  logResponses?: boolean; // Log outgoing responses
  includeStack?: boolean; // Include stack traces in errors
  includeRequest?: boolean; // Include request details in logs
  customLogger?: (level: string, message: string, meta?: any) => void;
}
```

### Basic Logging Setup

```javascript
const config = {
  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
    logRequests: true,
    logResponses: true,
  },
};
```

### Custom Logger Integration

#### Winston Integration

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console(),
  ],
});

const config = {
  logging: {
    enabled: true,
    level: 'info',
    customLogger: (level, message, meta) => {
      logger.log(level, message, meta);
    },
  },
};
```

#### Structured Logging

```javascript
const config = {
  logging: {
    enabled: true,
    level: 'info',
    includeRequest: true,
    customLogger: (level, message, meta) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        service: 'user-api',
        version: process.env.APP_VERSION,
        ...meta,
      };

      console.log(JSON.stringify(logEntry));
    },
  },
};
```

### Log Level Guidelines

- **`error`**: Only log errors and critical issues
- **`warn`**: Log warnings and errors
- **`info`**: Log informational messages, warnings, and errors
- **`debug`**: Log all messages including debug information

### Request/Response Logging

```javascript
const config = {
  logging: {
    enabled: true,
    logRequests: true,
    logResponses: true,
    includeRequest: true,
    customLogger: (level, message, meta) => {
      if (meta.method && meta.url) {
        // Request logging
        console.log(`${meta.method} ${meta.url} - ${meta.userAgent}`);
      } else if (meta.statusCode) {
        // Response logging
        console.log(`Response: ${meta.statusCode} - ${meta.executionTime}ms`);
      }
    },
  },
};
```

## Response Configuration

### ResponseConfig Interface

```typescript
interface ResponseConfig {
  includeTimestamp?: boolean; // Include timestamp in responses
  includeRequestId?: boolean; // Include request ID in responses
  includeExecutionTime?: boolean; // Include execution time
  customFields?: Record<string, any>; // Custom fields in meta
  pagination?: boolean; // Enable pagination helpers
  compression?: boolean; // Enable response compression
}
```

### Standard Response Configuration

```javascript
const config = {
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: {
      version: '1.0.0',
      service: 'user-api',
      environment: process.env.NODE_ENV,
    },
  },
};
```

### Minimal Response Configuration

For high-performance scenarios where metadata overhead should be minimized:

```javascript
const config = {
  responses: {
    includeTimestamp: false,
    includeRequestId: false,
    includeExecutionTime: false,
    customFields: {},
  },
};
```

### Development Response Configuration

Maximum information for debugging:

```javascript
const config = {
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: {
      environment: 'development',
      version: process.env.npm_package_version,
      nodeVersion: process.version,
      pid: process.pid,
      memory: () => process.memoryUsage(),
    },
  },
};
```

## Security Configuration

### SecurityConfig Interface

```typescript
interface SecurityConfig {
  sanitizeErrors?: boolean; // Sanitize error messages
  hideInternalErrors?: boolean; // Hide internal error details
  allowedErrorFields?: string[]; // Allowed error fields in responses
  rateLimiting?: boolean; // Enable rate limiting
  corsHeaders?: boolean; // Set CORS security headers
}
```

### Production Security Configuration

```javascript
const config = {
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true,
  },
};
```

### Development Security Configuration

```javascript
const config = {
  security: {
    sanitizeErrors: false,
    hideInternalErrors: false,
    allowedErrorFields: ['message', 'type', 'code', 'details', 'stack'],
    corsHeaders: true,
  },
};
```

### Error Field Configuration

Control which error fields are exposed:

```javascript
const config = {
  security: {
    allowedErrorFields: [
      'message', // Error message
      'type', // Error type/name
      'code', // Error code
      'field', // Validation field (for validation errors)
    ],
  },
};
```

### CORS Headers

When `corsHeaders` is enabled, these headers are set:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Performance Configuration

### PerformanceConfig Interface

```typescript
interface PerformanceConfig {
  enableCaching?: boolean; // Enable response caching
  cacheHeaders?: boolean; // Set cache control headers
  etag?: boolean; // Enable ETag headers
  compression?: boolean; // Enable response compression
}
```

### High-Performance Configuration

```javascript
const config = {
  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
    compression: true,
  },
};
```

### Cache Headers

When `cacheHeaders` is enabled:

```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### ETag Configuration

When `etag` is enabled, ETag headers are set using the request ID:

```
ETag: "request-id-value"
```

## Custom Configuration Patterns

### Environment Variable Configuration

```javascript
const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    mode: isProduction ? 'production' : 'development',

    logging: {
      enabled: process.env.LOGGING_ENABLED !== 'false',
      level: process.env.LOG_LEVEL || (isProduction ? 'error' : 'debug'),
      logErrors: true,
      logRequests: isDevelopment,
      logResponses: isDevelopment,
      includeStack: isDevelopment,
    },

    responses: {
      includeTimestamp: process.env.INCLUDE_TIMESTAMP !== 'false',
      includeRequestId: process.env.INCLUDE_REQUEST_ID !== 'false',
      includeExecutionTime: isDevelopment,
      customFields: {
        version: process.env.APP_VERSION || 'unknown',
        service: process.env.SERVICE_NAME || 'api',
        environment: process.env.NODE_ENV,
      },
    },

    security: {
      sanitizeErrors: isProduction,
      hideInternalErrors: isProduction,
      allowedErrorFields: process.env.ALLOWED_ERROR_FIELDS?.split(',') || [
        'message',
        'type',
        'code',
      ],
      corsHeaders: process.env.CORS_HEADERS === 'true',
    },
  };
};
```

### Service-Specific Configuration

```javascript
// API Gateway Configuration
const apiGatewayConfig = {
  mode: 'production',
  logging: {
    enabled: true,
    level: 'info',
    logRequests: true,
    logResponses: false,
  },
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: {
      service: 'api-gateway',
      version: process.env.GATEWAY_VERSION,
    },
  },
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    corsHeaders: true,
  },
  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
  },
};

// Microservice Configuration
const microserviceConfig = {
  mode: 'production',
  logging: {
    enabled: true,
    level: 'error',
    logErrors: true,
    logRequests: false,
    logResponses: false,
  },
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: false,
    customFields: {
      service: process.env.SERVICE_NAME,
      instance: process.env.INSTANCE_ID,
    },
  },
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    corsHeaders: false, // Handled by gateway
  },
  performance: {
    enableCaching: false,
    cacheHeaders: false,
    etag: false,
  },
};
```

### Dynamic Configuration

```javascript
class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    return {
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      logging: this.getLoggingConfig(),
      responses: this.getResponseConfig(),
      security: this.getSecurityConfig(),
      performance: this.getPerformanceConfig(),
    };
  }

  getLoggingConfig() {
    return {
      enabled: process.env.LOGGING_ENABLED !== 'false',
      level: this.getLogLevel(),
      logErrors: true,
      logRequests: this.shouldLogRequests(),
      logResponses: this.shouldLogResponses(),
      customLogger: this.getCustomLogger(),
    };
  }

  getLogLevel() {
    const level = process.env.LOG_LEVEL;
    if (['error', 'warn', 'info', 'debug'].includes(level)) {
      return level;
    }
    return process.env.NODE_ENV === 'production' ? 'error' : 'debug';
  }

  shouldLogRequests() {
    return process.env.LOG_REQUESTS === 'true' || process.env.NODE_ENV === 'development';
  }

  shouldLogResponses() {
    return process.env.LOG_RESPONSES === 'true' || process.env.NODE_ENV === 'development';
  }

  getCustomLogger() {
    if (process.env.LOG_FORMAT === 'json') {
      return (level, message, meta) => {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...meta,
          }),
        );
      };
    }
    return undefined; // Use default logger
  }

  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    return this.config;
  }
}

// Usage
const configManager = new ConfigManager();
const { quickSetup } = require('@amitkandar/response-handler');
const { middleware, errorHandler } = quickSetup(configManager.config);
```

### Feature Flag Configuration

```javascript
const getConfigWithFeatureFlags = () => {
  const features = {
    detailedLogging: process.env.FEATURE_DETAILED_LOGGING === 'true',
    requestTracking: process.env.FEATURE_REQUEST_TRACKING === 'true',
    performanceMetrics: process.env.FEATURE_PERFORMANCE_METRICS === 'true',
    securityHeaders: process.env.FEATURE_SECURITY_HEADERS === 'true',
  };

  return {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

    logging: {
      enabled: true,
      level: features.detailedLogging ? 'debug' : 'info',
      logErrors: true,
      logRequests: features.detailedLogging,
      logResponses: features.detailedLogging,
      includeStack: features.detailedLogging,
    },

    responses: {
      includeTimestamp: true,
      includeRequestId: features.requestTracking,
      includeExecutionTime: features.performanceMetrics,
      customFields: features.performanceMetrics
        ? {
            version: process.env.APP_VERSION,
            features: Object.keys(features).filter((key) => features[key]),
          }
        : {},
    },

    security: {
      sanitizeErrors: true,
      hideInternalErrors: process.env.NODE_ENV === 'production',
      corsHeaders: features.securityHeaders,
    },

    performance: {
      enableCaching: features.performanceMetrics,
      cacheHeaders: features.performanceMetrics,
      etag: features.performanceMetrics,
    },
  };
};
```

This configuration guide provides comprehensive documentation for all configuration options and patterns available in the Enhanced Response Handler, enabling you to optimize the library for your specific use case and environment.
