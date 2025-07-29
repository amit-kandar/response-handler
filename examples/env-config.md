# Environment-Specific Configuration

This guide shows how to configure the response handler for different environments (development, staging, production).

## Environment Configuration Structure

```javascript
// config/environments.js
const baseConfig = {
  logging: {
    enabled: true,
    includeRequestId: true,
    includeTimestamp: true
  },
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  }
};

const environments = {
  development: {
    ...baseConfig,
    logging: {
      ...baseConfig.logging,
      level: 'debug',
      format: 'simple',
      destinations: [{ type: 'console' }]
    },
    environment: {
      current: 'development',
      showStackTrace: true,
      exposeInternalErrors: true,
      debugMode: true,
      verboseLogging: true
    },
    performance: {
      enableCaching: false,
      enableCompression: false,
      enableEtag: false
    },
    security: {
      enableCors: true,
      corsOptions: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      enableHelmet: false,
      rateLimiting: {
        windowMs: 60000,
        maxRequests: 1000 // Very permissive for development
      }
    }
  },

  staging: {
    ...baseConfig,
    logging: {
      ...baseConfig.logging,
      level: 'info',
      format: 'json',
      destinations: [
        { type: 'console' },
        { 
          type: 'file', 
          options: { filename: 'logs/staging.log' } 
        }
      ]
    },
    environment: {
      current: 'staging',
      showStackTrace: false,
      exposeInternalErrors: false,
      debugMode: false,
      verboseLogging: false
    },
    performance: {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableCompression: true,
      compressionLevel: 6,
      enableEtag: true
    },
    security: {
      enableCors: true,
      corsOptions: {
        origin: ['https://staging.yourapp.com'],
        credentials: true
      },
      enableHelmet: true,
      rateLimiting: {
        windowMs: 900000, // 15 minutes
        maxRequests: 500
      }
    }
  },

  production: {
    ...baseConfig,
    logging: {
      ...baseConfig.logging,
      level: 'error',
      format: 'json',
      destinations: [
        { type: 'console' },
        { 
          type: 'file', 
          options: { filename: 'logs/production.log' } 
        },
        {
          type: 'http',
          options: {
            url: process.env.LOG_ENDPOINT,
            headers: {
              'Authorization': `Bearer ${process.env.LOG_API_KEY}`
            }
          }
        }
      ],
      maskSensitiveData: true
    },
    environment: {
      current: 'production',
      showStackTrace: false,
      exposeInternalErrors: false,
      debugMode: false,
      verboseLogging: false
    },
    performance: {
      enableCaching: true,
      cacheTimeout: 600000, // 10 minutes
      enableCompression: true,
      compressionLevel: 9,
      enableEtag: true,
      maxResponseSize: 1048576, // 1MB
      timeout: 30000 // 30 seconds
    },
    security: {
      enableCors: true,
      corsOptions: {
        origin: [process.env.FRONTEND_URL],
        credentials: true
      },
      enableHelmet: true,
      helmetOptions: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"]
          }
        }
      },
      rateLimiting: {
        windowMs: 900000, // 15 minutes
        maxRequests: 100,
        message: 'Too many requests from this IP'
      },
      sanitizeInput: true,
      validateSchema: true
    }
  }
};

export default environments;
```

## Environment Detection and Loading

```javascript
// config/index.js
import environments from './environments.js';

function detectEnvironment() {
  return process.env.NODE_ENV || 'development';
}

function loadConfig() {
  const env = detectEnvironment();
  const config = environments[env];
  
  if (!config) {
    throw new Error(`Configuration for environment '${env}' not found`);
  }
  
  // Override with environment variables if present
  return mergeWithEnvVars(config);
}

function mergeWithEnvVars(config) {
  const envOverrides = {};
  
  // Logging overrides
  if (process.env.LOG_LEVEL) {
    envOverrides.logging = { ...config.logging, level: process.env.LOG_LEVEL };
  }
  
  // Database URL override
  if (process.env.DATABASE_URL) {
    envOverrides.database = { url: process.env.DATABASE_URL };
  }
  
  // Redis URL override
  if (process.env.REDIS_URL) {
    envOverrides.cache = { url: process.env.REDIS_URL };
  }
  
  // CORS origin override
  if (process.env.CORS_ORIGIN) {
    envOverrides.security = {
      ...config.security,
      corsOptions: {
        ...config.security.corsOptions,
        origin: process.env.CORS_ORIGIN.split(',')
      }
    };
  }
  
  return { ...config, ...envOverrides };
}

export default loadConfig();
```

## Express Application Setup

```javascript
// app.js
import express from 'express';
import { configureResponseHandler } from '@amitkandar/response-handler';
import config from './config/index.js';

const app = express();

// Apply environment-specific response handler configuration
app.use(configureResponseHandler(config));

// Environment-specific middleware
if (config.environment.current === 'development') {
  // Development-specific middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
  
  // Mock data endpoint for development
  app.get('/api/mock/:resource', (req, res) => {
    const mockData = generateMockData(req.params.resource);
    res.sendSuccess(mockData, 'Mock data generated');
  });
}

if (config.environment.current === 'production') {
  // Production-specific middleware
  app.use((req, res, next) => {
    // Add security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.sendSuccess({
      status: 'healthy',
      environment: config.environment.current,
      timestamp: new Date().toISOString()
    });
  });
}

// API routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsersFromDatabase();
    res.sendPaginated(users, {
      page: 1,
      limit: 20,
      total: users.length,
      totalPages: Math.ceil(users.length / 20),
      hasNext: false,
      hasPrev: false
    });
  } catch (error) {
    if (config.environment.current === 'development') {
      res.sendError('DATABASE_ERROR', error.message, { stack: error.stack });
    } else {
      res.sendError('DATABASE_ERROR', 'Failed to retrieve users');
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.environment.current} mode`);
});
```

## Socket.IO Environment Configuration

```javascript
// socket.js
import { Server } from 'socket.io';
import { createSocketHandler } from '@amitkandar/response-handler';
import config from './config/index.js';

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: config.security.corsOptions,
    pingTimeout: config.environment.current === 'production' ? 60000 : 5000,
    pingInterval: config.environment.current === 'production' ? 25000 : 2000
  });

  // Apply response handler with environment config
  io.use(createSocketHandler(config));

  // Environment-specific socket middleware
  if (config.environment.current !== 'development') {
    // Rate limiting for non-development environments
    io.use((socket, next) => {
      const clientIp = socket.handshake.address;
      // Implement rate limiting logic
      next();
    });
  }

  if (config.environment.current === 'production') {
    // Production logging
    io.use((socket, next) => {
      console.log(`Socket connection from ${socket.handshake.address}`);
      next();
    });
  }

  io.on('connection', (socket) => {
    if (config.environment.current === 'development') {
      socket.sendSuccess('connection', {
        environment: 'development',
        debugging: true,
        socketId: socket.id
      }, 'Connected to development server');
    } else {
      socket.sendSuccess('connection', {
        environment: config.environment.current,
        socketId: socket.id
      }, 'Connected successfully');
    }

    // Event handlers with environment-specific behavior
    socket.on('test_event', (data) => {
      if (config.environment.current === 'development') {
        socket.sendSuccess('test_response', {
          received: data,
          timestamp: new Date().toISOString(),
          debug: true
        }, 'Test event processed (development mode)');
      } else {
        socket.sendSuccess('test_response', data, 'Event processed');
      }
    });
  });

  return io;
}
```

## Environment Variables (.env files)

```bash
# .env.development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
DEBUG_MODE=true

# .env.staging
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://staging-db:5432/myapp_staging
REDIS_URL=redis://staging-redis:6379
CORS_ORIGIN=https://staging.myapp.com
DEBUG_MODE=false

# .env.production
NODE_ENV=production
PORT=3000
LOG_LEVEL=error
DATABASE_URL=postgresql://prod-db:5432/myapp_prod
REDIS_URL=redis://prod-redis:6379
CORS_ORIGIN=https://myapp.com
LOG_ENDPOINT=https://logs.myapp.com/api/logs
LOG_API_KEY=your_log_api_key
FRONTEND_URL=https://myapp.com
DEBUG_MODE=false
```

## Docker Environment Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Build for production
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app-dev:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp_dev
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  app-staging:
    build: .
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp_staging
    depends_on:
      - db
      - redis

  app-prod:
    build: .
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp_prod
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

## CI/CD Pipeline Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
        env:
          NODE_ENV: test

  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Development
        run: |
          echo "Deploying to development environment"
        env:
          NODE_ENV: development

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment"
        env:
          NODE_ENV: staging

  deploy-prod:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment"
        env:
          NODE_ENV: production
```

## Configuration Validation

```javascript
// config/validator.js
import Joi from 'joi';

const configSchema = Joi.object({
  logging: Joi.object({
    enabled: Joi.boolean().default(true),
    level: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
    format: Joi.string().valid('json', 'simple').required()
  }).required(),
  
  environment: Joi.object({
    current: Joi.string().valid('development', 'staging', 'production').required(),
    showStackTrace: Joi.boolean().required(),
    exposeInternalErrors: Joi.boolean().required()
  }).required(),
  
  security: Joi.object({
    enableCors: Joi.boolean().default(true),
    corsOptions: Joi.object().required(),
    rateLimiting: Joi.object({
      windowMs: Joi.number().min(1000).required(),
      maxRequests: Joi.number().min(1).required()
    }).required()
  }).required()
});

export function validateConfig(config) {
  const { error, value } = configSchema.validate(config);
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
  
  return value;
}
```

## Best Practices

1. **Environment Separation**: Keep configurations clearly separated by environment
2. **Secret Management**: Never commit secrets to version control
3. **Override Capability**: Allow environment variables to override config values
4. **Validation**: Validate configuration on startup
5. **Documentation**: Document all configuration options
6. **Defaults**: Provide sensible defaults for optional settings
7. **Security**: Use restrictive settings for production
8. **Monitoring**: Include environment-specific monitoring and logging
