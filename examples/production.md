# Production Setup Guide

This guide covers everything needed to deploy and run the response handler in a production environment.

## Production Configuration

```javascript
// config/production.js
export default {
  logging: {
    enabled: true,
    level: 'error',
    format: 'json',
    destinations: [
      { type: 'console' },
      {
        type: 'file',
        options: {
          filename: '/var/log/app/application.log',
          maxSize: '100MB',
          maxFiles: 10,
        },
      },
      {
        type: 'http',
        options: {
          url: process.env.LOG_AGGREGATOR_URL,
          headers: {
            Authorization: `Bearer ${process.env.LOG_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      },
    ],
    includeRequestId: true,
    includeTimestamp: true,
    maskSensitiveData: true,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
  },

  environment: {
    current: 'production',
    showStackTrace: false,
    exposeInternalErrors: false,
    debugMode: false,
    verboseLogging: false,
  },

  performance: {
    enableCaching: true,
    cacheTimeout: 600000, // 10 minutes
    enableCompression: true,
    compressionLevel: 9,
    enableEtag: true,
    maxResponseSize: 5242880, // 5MB
    timeout: 30000, // 30 seconds
    enableResponseTime: true,
  },

  security: {
    enableCors: true,
    corsOptions: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    enableHelmet: true,
    helmetOptions: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.yourapp.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.yourapp.com'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
    rateLimiting: {
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
    },
    sanitizeInput: true,
    validateSchema: true,
  },

  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
    enablePageInfo: true,
    pageParam: 'page',
    limitParam: 'limit',
    sortParam: 'sort',
    orderParam: 'order',
  },

  socketIO: {
    enableRooms: true,
    enableNamespaces: true,
    defaultRoom: 'general',
    broadcastToAll: false,
    enableAcknowledgments: true,
    timeout: 10000,
    enableBinarySupport: true,
    maxHttpBufferSize: 1048576, // 1MB
    pingTimeout: 60000,
    pingInterval: 25000,
  },
};
```

## Production Express Setup

```javascript
// server.js
import express from 'express';
import { createServer } from 'http';
import { configureResponseHandler } from '@amitkandar/response-handler';
import productionConfig from './config/production.js';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();
const server = createServer(app);

// Trust proxy for load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(productionConfig.security.helmetOptions));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit(productionConfig.security.rateLimiting);
app.use(limiter);

// Response handler configuration
app.use(configureResponseHandler(productionConfig));

// Health check endpoint (before other routes)
app.get('/health', (req, res) => {
  res.sendSuccess(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: 'production',
    },
    'Service is healthy',
  );
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await checkDatabaseConnection();

    // Check Redis connection
    await checkRedisConnection();

    // Check external services
    await checkExternalServices();

    res.sendSuccess(
      {
        status: 'ready',
        checks: {
          database: 'connected',
          redis: 'connected',
          external: 'available',
        },
      },
      'Service is ready',
    );
  } catch (error) {
    res.status(503).sendError('SERVICE_NOT_READY', 'Service dependencies not available', {
      error: error.message,
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    requests: {
      total: global.requestCount || 0,
      errors: global.errorCount || 0,
    },
    environment: 'production',
  };

  res.sendSuccess(metrics, 'Metrics retrieved');
});

// Request counter middleware
app.use((req, res, next) => {
  global.requestCount = (global.requestCount || 0) + 1;
  next();
});

// Error tracking middleware
app.use((err, req, res, next) => {
  global.errorCount = (global.errorCount || 0) + 1;

  // Log error to external service
  logErrorToExternalService(err, req);

  // Don't expose internal errors in production
  if (err.status === 500) {
    res.sendError('INTERNAL_ERROR', 'An internal error occurred', {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } else {
    next(err);
  }
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    closeDatabaseConnections();

    // Close Redis connections
    closeRedisConnections();

    console.log('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
});
```

## Docker Production Setup

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/config ./config

# Create log directory
RUN mkdir -p /var/log/app && chown nodejs:nodejs /var/log/app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/app_prod
      - REDIS_URL=redis://redis:6379
      - LOG_AGGREGATOR_URL=https://logs.yourservice.com/api/logs
      - LOG_API_KEY=${LOG_API_KEY}
      - ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
    volumes:
      - app-logs:/var/log/app
    depends_on:
      - db
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=app_prod
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  app-logs:
  prometheus-data:
  grafana-data:
```

## Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        least_conn;
        server app_1:3000;
        server app_2:3000;
        server app_3:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    server {
        listen 80;
        server_name yourapp.com www.yourapp.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourapp.com www.yourapp.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        # Health check endpoint
        location /health {
            proxy_pass http://app;
            access_log off;
        }

        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login endpoint with stricter rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Socket.IO
        location /socket.io/ {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Monitoring and Alerting

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

rule_files:
  - 'alert_rules.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

```yaml
# alert_rules.yml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors per second'

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is above 90%'

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service is down'
          description: '{{ $labels.instance }} has been down for more than 1 minute'
```

## Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting production deployment..."

# Build and tag image
docker build -f Dockerfile.prod -t myapp:latest .
docker tag myapp:latest myapp:$(date +%Y%m%d-%H%M%S)

# Create backup
echo "Creating database backup..."
docker exec myapp_db_1 pg_dump -U user app_prod > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Deploy with zero downtime
echo "Deploying new version..."
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Wait for health check
echo "Waiting for health check..."
for i in {1..30}; do
  if curl -f http://localhost:3000/health; then
    echo "Health check passed"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Health check failed"
    exit 1
  fi
  sleep 2
done

# Clean up old images
docker image prune -f

echo "Deployment completed successfully"
```

## Production Checklist

### Security

- [ ] HTTPS enabled with valid SSL certificates
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation and sanitization
- [ ] Secrets stored securely (not in code)
- [ ] CORS properly configured
- [ ] Authentication and authorization implemented

### Performance

- [ ] Response compression enabled
- [ ] Caching strategy implemented
- [ ] Database queries optimized
- [ ] Static assets served efficiently
- [ ] Connection pooling configured
- [ ] Load balancing set up

### Reliability

- [ ] Health checks implemented
- [ ] Graceful shutdown handling
- [ ] Error handling and recovery
- [ ] Database backups automated
- [ ] Monitoring and alerting configured
- [ ] Log aggregation set up

### Scalability

- [ ] Horizontal scaling capability
- [ ] Database read replicas
- [ ] CDN for static assets
- [ ] Auto-scaling policies
- [ ] Resource limits configured

### Operations

- [ ] Deployment automation
- [ ] Rollback procedures
- [ ] Log rotation configured
- [ ] Monitoring dashboards
- [ ] Alert notifications
- [ ] Documentation updated
