# Performance Optimization

Optimize your Response Handler implementation for maximum performance in production environments.

## Caching Strategies

### Response Caching

Enable automatic response caching to improve performance:

```javascript
const config = {
  enablePerformanceTracking: true,
  caching: {
    enabled: true,
    ttl: 300, // 5 minutes
    redis: {
      host: 'localhost',
      port: 6379,
    },
  },
};

app.use(quickSetup(config));
```

### ETag Support

Automatic ETag generation for cacheable responses:

```javascript
app.get('/api/users', (req, res) => {
  const users = getUsersFromCache();

  // Automatically generates ETag
  res.ok(users, 'Users retrieved', {
    cacheable: true,
    etag: true,
  });
});
```

## Request Optimization

### Compression

Enable response compression for better bandwidth usage:

```javascript
const compression = require('compression');

app.use(compression());
app.use(
  quickSetup({
    enablePerformanceTracking: true,
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024,
    },
  }),
);
```

### Request Size Limits

Set appropriate request size limits:

```javascript
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  quickSetup({
    requestLimits: {
      maxSize: '10mb',
      timeout: 30000,
    },
  }),
);
```

## Database Optimization

### Connection Pooling

Optimize database connections:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: 'username',
  host: 'localhost',
  database: 'mydb',
  password: 'password',
  port: 5432,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.get('/api/users', async (req, res) => {
  const startTime = Date.now();

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users');
    client.release();

    const executionTime = Date.now() - startTime;

    res.ok(result.rows, 'Users retrieved', {
      performance: {
        dbQuery: `${executionTime}ms`,
        poolSize: pool.totalCount,
      },
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});
```

### Query Optimization

Use prepared statements and optimized queries:

```javascript
// Prepared statement example
const getUserStatement = 'SELECT * FROM users WHERE id = $1';

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(getUserStatement, [req.params.id]);

    if (result.rows.length === 0) {
      return res.notFound({}, 'User not found');
    }

    res.ok(result.rows[0], 'User retrieved');
  } catch (error) {
    res.error(error, 'Failed to retrieve user');
  }
});
```

## Memory Management

### Stream Processing

Handle large data efficiently with streams:

```javascript
const fs = require('fs');
const csv = require('csv-parse');

app.get('/api/export/users', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');

  const stream = fs.createReadStream('users.csv').pipe(csv()).pipe(res);

  stream.on('error', (error) => {
    res.error(error, 'Export failed');
  });
});
```

### Memory Monitoring

Monitor memory usage:

```javascript
const config = {
  enablePerformanceTracking: true,
  monitoring: {
    memory: true,
    cpu: true,
    interval: 60000, // Check every minute
  },
};

app.use(quickSetup(config));

// Memory usage endpoint
app.get('/api/system/memory', (req, res) => {
  const memUsage = process.memoryUsage();

  res.ok(
    {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
    },
    'Memory usage retrieved',
  );
});
```

## Load Balancing

### Cluster Mode

Use Node.js cluster for multi-core utilization:

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process
  const express = require('express');
  const { quickSetup } = require('response-handler');

  const app = express();
  app.use(
    quickSetup({
      enablePerformanceTracking: true,
      clusterId: process.pid,
    }),
  );

  app.listen(3000, () => {
    console.log(`Worker ${process.pid} started`);
  });
}
```

## Socket.IO Performance

### Connection Management

Optimize Socket.IO connections:

```javascript
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
});

io.use(
  quickSocketSetup({
    enablePerformanceTracking: true,
    rateLimiting: {
      enabled: true,
      maxConnections: 1000,
      windowMs: 60000,
    },
  }),
);
```

### Room Optimization

Efficient room management:

```javascript
io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    // Check room size before joining
    const room = io.sockets.adapter.rooms.get(roomId);
    const roomSize = room ? room.size : 0;

    if (roomSize >= 100) {
      socket.forbidden({}, 'Room is full');
      return;
    }

    socket.join(roomId);
    socket.ok({ roomId, participants: roomSize + 1 }, 'Joined room');
  });
});
```

## Monitoring & Metrics

### Performance Metrics

Track key performance indicators:

```javascript
const config = {
  enablePerformanceTracking: true,
  metrics: {
    responseTime: true,
    throughput: true,
    errorRate: true,
    customMetrics: {
      dbQueryTime: true,
      cacheHitRate: true,
    },
  },
};

app.use(quickSetup(config));

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  const metrics = getPerformanceMetrics();

  res.ok(
    {
      averageResponseTime: metrics.avgResponseTime,
      requestsPerSecond: metrics.rps,
      errorRate: metrics.errorRate,
      uptime: process.uptime(),
    },
    'Metrics retrieved',
  );
});
```

### Health Checks

Implement comprehensive health checks:

```javascript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    cache: await checkCache(),
    memory: checkMemory(),
    disk: await checkDisk(),
  };

  const isHealthy = Object.values(checks).every((check) => check.status === 'ok');

  if (isHealthy) {
    res.ok(checks, 'All systems operational');
  } else {
    res.error(checks, 'System health issues detected');
  }
});
```

## Production Optimizations

### Environment Configuration

Production-specific optimizations:

```javascript
const productionConfig = {
  enableLogging: true,
  logLevel: 'error',
  enablePerformanceTracking: false, // Disable in production
  enableSecurity: true,
  compression: {
    enabled: true,
    level: 6,
  },
  caching: {
    enabled: true,
    ttl: 3600,
  },
};

if (process.env.NODE_ENV === 'production') {
  app.use(quickSetup(productionConfig));
}
```

### CDN Integration

Integrate with Content Delivery Networks:

```javascript
app.use(
  '/static',
  express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);
```

## Best Practices

1. **Enable compression** for all text-based responses
2. **Use caching** strategically for frequently accessed data
3. **Implement connection pooling** for database connections
4. **Monitor performance metrics** continuously
5. **Use streams** for large data processing
6. **Optimize database queries** with proper indexing
7. **Implement rate limiting** to prevent abuse
8. **Use CDN** for static asset delivery
9. **Enable clustering** for multi-core utilization
10. **Regular performance testing** and optimization
