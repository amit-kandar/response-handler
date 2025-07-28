# Environment Setup

Configure Response Handler for different environments.

## Environment Detection

Response Handler automatically detects your environment:

```typescript
const config = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};
```

## Development Environment

```typescript
// config/development.js
export const developmentConfig = {
  mode: 'development',
  logging: {
    enabled: true,
    level: 'debug',
    logErrors: true,
    logRequests: true,
    logResponses: true,
    includeStack: true
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: true,
    includeExecutionTime: true
  },
  security: {
    sanitizeErrors: false,
    hideInternalErrors: false,
    allowedErrorFields: ['message', 'type', 'code', 'stack', 'details']
  }
};
```

## Production Environment

```typescript
// config/production.js
export const productionConfig = {
  mode: 'production',
  logging: {
    enabled: true,
    level: 'error',
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: false
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: false,
    includeExecutionTime: false
  },
  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true
  }
};
```

## Testing Environment

```typescript
// config/test.js
export const testConfig = {
  mode: 'test',
  logging: {
    enabled: false // Silence logs during tests
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: false,
    includeExecutionTime: false
  },
  security: {
    sanitizeErrors: false // Keep full errors for debugging tests
  }
};
```

## Staging Environment

```typescript
// config/staging.js
export const stagingConfig = {
  mode: 'production',
  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
    logRequests: true,
    logResponses: false,
    includeStack: true // Keep stack traces for debugging
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: true,
    includeExecutionTime: true
  },
  security: {
    sanitizeErrors: false,
    hideInternalErrors: false
  }
};
```

## Environment Variables

Create a `.env` file for environment-specific settings:

```bash
# .env
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true
INCLUDE_STACK_TRACES=true
API_VERSION=1.0.0
```

Use in your configuration:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const config = {
  mode: process.env.NODE_ENV || 'development',
  logging: {
    enabled: process.env.NODE_ENV !== 'test',
    level: process.env.LOG_LEVEL || 'info',
    includeStack: process.env.INCLUDE_STACK_TRACES === 'true'
  },
  security: {
    corsHeaders: process.env.ENABLE_CORS === 'true'
  },
  responses: {
    customFields: {
      version: process.env.API_VERSION
    }
  }
};
```

## Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

# Set environment
ENV NODE_ENV=production

# Copy app
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm ci --only=production

# Start app
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=error
      - ENABLE_CORS=true
    ports:
      - "3000:3000"
```

## Configuration Factory

Create a configuration factory for different environments:

```typescript
// config/index.js
import { developmentConfig } from './development.js';
import { productionConfig } from './production.js';
import { testConfig } from './test.js';
import { stagingConfig } from './staging.js';

export function createConfig(env = process.env.NODE_ENV) {
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'test':
      return testConfig;
    default:
      return developmentConfig;
  }
}

// Usage
import { quickSetup } from '@amitkandar/response-handler';
import { createConfig } from './config/index.js';

const config = createConfig();
const { middleware, errorHandler } = quickSetup(config);
```

## Kubernetes Configuration

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "error"
  ENABLE_CORS: "true"
```

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: response-handler-app
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config
```

## Health Checks

Add environment-aware health checks:

```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || '1.0.0'
  };
  
  if (process.env.NODE_ENV === 'development') {
    health.debug = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node: process.version
    };
  }
  
  res.ok(health, 'Service is healthy');
});
```

## Logging Configuration by Environment

### Development Logging
```typescript
const config = {
  logging: {
    enabled: true,
    level: 'debug',
    logRequests: true,
    logResponses: true,
    customLogger: console // Simple console logging
  }
};
```

### Production Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const config = {
  logging: {
    enabled: true,
    level: 'error',
    customLogger: logger
  }
};
```

## Best Practices

1. **Never commit sensitive environment variables**
2. **Use different configs for each environment**
3. **Validate environment variables on startup**
4. **Use health checks to verify configuration**
5. **Log configuration errors clearly**
6. **Test configurations in staging before production**

## Environment Validation

```typescript
function validateEnvironment() {
  const required = ['NODE_ENV', 'PORT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Call before starting the app
validateEnvironment();
```
