# Configuration Interface

This page documents the TypeScript interfaces and types for configuring the response handler.

## Main Configuration Interface

```typescript
interface ResponseHandlerConfig {
  logging?: LoggingConfig;
  environment?: EnvironmentConfig;
  performance?: PerformanceConfig;
  security?: SecurityConfig;
  pagination?: PaginationConfig;
  socketIO?: SocketIOConfig;
}
```

## Logging Configuration

```typescript
interface LoggingConfig {
  enabled?: boolean;
  level?: 'error' | 'warn' | 'info' | 'debug';
  format?: 'json' | 'simple';
  destinations?: LogDestination[];
  includeRequestId?: boolean;
  includeTimestamp?: boolean;
  maskSensitiveData?: boolean;
}

interface LogDestination {
  type: 'console' | 'file' | 'http';
  options?: {
    filename?: string;
    url?: string;
    headers?: Record<string, string>;
  };
}
```

## Environment Configuration

```typescript
interface EnvironmentConfig {
  current?: 'development' | 'staging' | 'production';
  showStackTrace?: boolean;
  exposeInternalErrors?: boolean;
  debugMode?: boolean;
  verboseLogging?: boolean;
}
```

## Performance Configuration

```typescript
interface PerformanceConfig {
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableCompression?: boolean;
  compressionLevel?: number;
  enableEtag?: boolean;
  maxResponseSize?: number;
  timeout?: number;
}
```

## Security Configuration

```typescript
interface SecurityConfig {
  enableCors?: boolean;
  corsOptions?: CorsOptions;
  enableHelmet?: boolean;
  helmetOptions?: HelmetOptions;
  rateLimiting?: RateLimitConfig;
  sanitizeInput?: boolean;
  validateSchema?: boolean;
}

interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}
```

## Pagination Configuration

```typescript
interface PaginationConfig {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  enablePageInfo?: boolean;
  pageParam?: string;
  limitParam?: string;
  sortParam?: string;
  orderParam?: string;
}
```

## Socket.IO Configuration

```typescript
interface SocketIOConfig {
  enableRooms?: boolean;
  enableNamespaces?: boolean;
  defaultRoom?: string;
  broadcastToAll?: boolean;
  enableAcknowledgments?: boolean;
  timeout?: number;
  enableBinarySupport?: boolean;
}
```

## Error Configuration

```typescript
interface ErrorConfig {
  includeStackTrace?: boolean;
  includeErrorCode?: boolean;
  customErrorMessages?: Record<string, string>;
  enableErrorReporting?: boolean;
  reportingUrl?: string;
}
```

## Complete Configuration Example

```typescript
const config: ResponseHandlerConfig = {
  logging: {
    enabled: true,
    level: 'info',
    format: 'json',
    destinations: [
      { type: 'console' },
      { 
        type: 'file', 
        options: { filename: 'app.log' } 
      }
    ],
    includeRequestId: true,
    includeTimestamp: true,
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
    cacheTimeout: 300000, // 5 minutes
    enableCompression: true,
    compressionLevel: 6,
    enableEtag: true,
    maxResponseSize: 1048576, // 1MB
    timeout: 30000 // 30 seconds
  },
  
  security: {
    enableCors: true,
    corsOptions: {
      origin: ['https://yourapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    enableHelmet: true,
    rateLimiting: {
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP'
    },
    sanitizeInput: true,
    validateSchema: true
  },
  
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
    enablePageInfo: true,
    pageParam: 'page',
    limitParam: 'limit',
    sortParam: 'sort',
    orderParam: 'order'
  },
  
  socketIO: {
    enableRooms: true,
    enableNamespaces: true,
    defaultRoom: 'general',
    broadcastToAll: false,
    enableAcknowledgments: true,
    timeout: 5000,
    enableBinarySupport: true
  }
};
```

## Environment-Specific Configurations

```typescript
// Development configuration
const devConfig: ResponseHandlerConfig = {
  environment: {
    current: 'development',
    showStackTrace: true,
    exposeInternalErrors: true,
    debugMode: true,
    verboseLogging: true
  },
  logging: {
    enabled: true,
    level: 'debug',
    format: 'simple'
  }
};

// Production configuration
const prodConfig: ResponseHandlerConfig = {
  environment: {
    current: 'production',
    showStackTrace: false,
    exposeInternalErrors: false,
    debugMode: false,
    verboseLogging: false
  },
  logging: {
    enabled: true,
    level: 'error',
    format: 'json'
  },
  security: {
    enableCors: true,
    enableHelmet: true,
    rateLimiting: {
      windowMs: 900000,
      maxRequests: 100
    }
  }
};
```

## Usage with Express

```typescript
import { configureResponseHandler } from '@amitkandar/response-handler';

const app = express();

// Apply configuration
app.use(configureResponseHandler(config));
```

## Usage with Socket.IO

```typescript
import { createSocketHandler } from '@amitkandar/response-handler';

const io = new Server(server);

// Apply configuration
io.use(createSocketHandler(config));
```
