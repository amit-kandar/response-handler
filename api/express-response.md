# Express Response Methods

Comprehensive guide to all Express response methods provided by Response Handler.

## Response Method Overview

Response Handler extends the Express response object with standardized methods for all common HTTP status codes.

## Success Response Methods

### `res.ok(data, message, options)`

**Status Code**: 200 OK  
**Use Case**: Successful GET requests, successful operations

```javascript
app.get('/api/users', (req, res) => {
  const users = getUsersFromDatabase();
  res.ok(users, 'Users retrieved successfully');
});

// With pagination
app.get('/api/products', (req, res) => {
  const { products, total, page, limit } = getProducts(req.query);

  res.ok(products, 'Products retrieved successfully', {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

### `res.created(data, message, options)`

**Status Code**: 201 Created  
**Use Case**: Successful resource creation

```javascript
app.post('/api/users', (req, res) => {
  const newUser = createUser(req.body);
  res.created(newUser, 'User created successfully');
});

// With location header
app.post('/api/posts', (req, res) => {
  const post = createPost(req.body);

  res.created(post, 'Post created successfully', {
    headers: {
      Location: `/api/posts/${post.id}`,
    },
  });
});
```

### `res.accepted(data, message, options)`

**Status Code**: 202 Accepted  
**Use Case**: Async operations, queued tasks

```javascript
app.post('/api/reports/generate', (req, res) => {
  const jobId = queueReportGeneration(req.body);

  res.accepted(
    {
      jobId,
      status: 'queued',
      estimatedTime: '5 minutes',
    },
    'Report generation started',
  );
});

// Bulk operations
app.post('/api/users/bulk-import', (req, res) => {
  const batchId = startBulkImport(req.body.users);

  res.accepted(
    {
      batchId,
      totalUsers: req.body.users.length,
      status: 'processing',
    },
    'Bulk import started',
  );
});
```

### `res.noContent(message)`

**Status Code**: 204 No Content  
**Use Case**: Successful DELETE operations, successful PUT with no response body

```javascript
app.delete('/api/users/:id', (req, res) => {
  deleteUser(req.params.id);
  res.noContent('User deleted successfully');
});

// Update with no response body
app.put('/api/settings', (req, res) => {
  updateSettings(req.body);
  res.noContent('Settings updated successfully');
});
```

## Client Error Response Methods

### `res.badRequest(error, message, options)`

**Status Code**: 400 Bad Request  
**Use Case**: Invalid request format, validation errors

```javascript
app.post('/api/users', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.badRequest(
      {
        missingFields: ['email', 'password'].filter((field) => !req.body[field]),
      },
      'Missing required fields',
    );
  }

  if (!isValidEmail(email)) {
    return res.badRequest({ email: 'Invalid email format' }, 'Invalid email address');
  }

  // Continue with user creation...
});

// Validation with detailed errors
app.post('/api/products', (req, res) => {
  const validationErrors = validateProduct(req.body);

  if (validationErrors.length > 0) {
    return res.badRequest({ validationErrors }, 'Product validation failed');
  }

  // Continue with product creation...
});
```

### `res.unauthorized(error, message, options)`

**Status Code**: 401 Unauthorized  
**Use Case**: Missing or invalid authentication

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.unauthorized({}, 'Access token required');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.unauthorized({ tokenError: err.message }, 'Invalid or expired token');
    }

    req.user = user;
    next();
  });
};

// Multiple authentication methods
app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization || req.cookies.token;

  if (!token) {
    return res.unauthorized(
      {
        supportedMethods: ['Bearer token', 'Cookie'],
        loginUrl: '/auth/login',
      },
      'Authentication required',
    );
  }

  // Continue with profile retrieval...
});
```

### `res.forbidden(error, message, options)`

**Status Code**: 403 Forbidden  
**Use Case**: Valid authentication but insufficient permissions

```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized({}, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return res.forbidden(
        {
          userRole: req.user.role,
          requiredRoles: roles,
        },
        'Insufficient permissions',
      );
    }

    next();
  };
};

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  // User deletion logic...
});

// Resource-specific permissions
app.put('/api/posts/:id', authenticateToken, (req, res) => {
  const post = getPost(req.params.id);

  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.forbidden(
      {
        postId: req.params.id,
        authorId: post.authorId,
        userId: req.user.id,
      },
      'Can only edit your own posts',
    );
  }

  // Continue with post update...
});
```

### `res.notFound(error, message, options)`

**Status Code**: 404 Not Found  
**Use Case**: Resource does not exist

```javascript
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);

  if (!user) {
    return res.notFound({ userId: req.params.id }, 'User not found');
  }

  res.ok(user, 'User retrieved successfully');
});

// With suggestions
app.get('/api/products/:slug', (req, res) => {
  const product = getProductBySlug(req.params.slug);

  if (!product) {
    const suggestions = findSimilarProducts(req.params.slug);

    return res.notFound(
      {
        slug: req.params.slug,
        suggestions: suggestions.map((p) => p.slug),
      },
      'Product not found',
    );
  }

  res.ok(product, 'Product retrieved successfully');
});
```

### `res.methodNotAllowed(error, message, options)`

**Status Code**: 405 Method Not Allowed  
**Use Case**: HTTP method not supported for endpoint

```javascript
app.all('/api/users/:id', (req, res, next) => {
  const allowedMethods = ['GET', 'PUT', 'DELETE'];

  if (!allowedMethods.includes(req.method)) {
    res.set('Allow', allowedMethods.join(', '));
    return res.methodNotAllowed(
      {
        method: req.method,
        allowedMethods,
      },
      `Method ${req.method} not allowed`,
    );
  }

  next();
});
```

### `res.conflict(error, message, options)`

**Status Code**: 409 Conflict  
**Use Case**: Resource already exists, version conflicts

```javascript
app.post('/api/users', (req, res) => {
  const existingUser = getUserByEmail(req.body.email);

  if (existingUser) {
    return res.conflict(
      {
        email: req.body.email,
        existingUserId: existingUser.id,
      },
      'User with this email already exists',
    );
  }

  // Continue with user creation...
});

// Optimistic locking
app.put('/api/documents/:id', (req, res) => {
  const document = getDocument(req.params.id);

  if (document.version !== req.body.version) {
    return res.conflict(
      {
        currentVersion: document.version,
        clientVersion: req.body.version,
        lastModified: document.updatedAt,
      },
      'Document has been modified by another user',
    );
  }

  // Continue with document update...
});
```

### `res.unprocessableEntity(error, message, options)`

**Status Code**: 422 Unprocessable Entity  
**Use Case**: Valid request format but semantic errors

```javascript
app.post('/api/orders', (req, res) => {
  const { items } = req.body;
  const errors = [];

  for (const item of items) {
    const product = getProduct(item.productId);

    if (!product) {
      errors.push({
        productId: item.productId,
        error: 'Product not found',
      });
    } else if (product.stock < item.quantity) {
      errors.push({
        productId: item.productId,
        requested: item.quantity,
        available: product.stock,
        error: 'Insufficient stock',
      });
    }
  }

  if (errors.length > 0) {
    return res.unprocessableEntity({ itemErrors: errors }, 'Order contains invalid items');
  }

  // Continue with order creation...
});
```

### `res.tooManyRequests(error, message, options)`

**Status Code**: 429 Too Many Requests  
**Use Case**: Rate limiting exceeded

```javascript
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.tooManyRequests(
        {
          limit: max,
          windowMs,
          retryAfter: Math.round(windowMs / 1000),
        },
        'Too many requests, please try again later',
      );
    },
  });
};

// API rate limiting
app.use('/api/', createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Stricter rate limiting for auth endpoints
app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 5)); // 5 requests per 15 minutes
```

## Server Error Response Methods

### `res.error(error, message, options)`

**Status Code**: 500 Internal Server Error  
**Use Case**: Unexpected server errors

```javascript
app.get('/api/users', (req, res) => {
  try {
    const users = getUsersFromDatabase();
    res.ok(users, 'Users retrieved successfully');
  } catch (error) {
    console.error('Database error:', error);
    res.error(error, 'Failed to retrieve users');
  }
});

// With error context
app.post('/api/reports', (req, res) => {
  try {
    const report = generateReport(req.body);
    res.created(report, 'Report generated successfully');
  } catch (error) {
    console.error('Report generation failed:', error);

    res.error(
      {
        errorId: generateErrorId(),
        context: 'report_generation',
        timestamp: new Date().toISOString(),
      },
      'Report generation failed',
    );
  }
});
```

### `res.notImplemented(error, message, options)`

**Status Code**: 501 Not Implemented  
**Use Case**: Feature not yet implemented

```javascript
app.get('/api/analytics/advanced', (req, res) => {
  res.notImplemented(
    {
      feature: 'advanced_analytics',
      plannedRelease: '2024-Q2',
    },
    'Advanced analytics feature not yet implemented',
  );
});
```

### `res.badGateway(error, message, options)`

**Status Code**: 502 Bad Gateway  
**Use Case**: Upstream service errors

```javascript
app.get('/api/external-data', async (req, res) => {
  try {
    const data = await fetchFromExternalAPI();
    res.ok(data, 'External data retrieved successfully');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.badGateway(
        {
          service: 'external-api',
          endpoint: error.config?.url,
        },
        'External service unavailable',
      );
    }

    res.error(error, 'Failed to fetch external data');
  }
});
```

### `res.serviceUnavailable(error, message, options)`

**Status Code**: 503 Service Unavailable  
**Use Case**: Temporary service downtime, maintenance

```javascript
const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

app.use((req, res, next) => {
  if (maintenanceMode) {
    return res.serviceUnavailable(
      {
        estimatedDowntime: process.env.MAINTENANCE_DURATION || '30 minutes',
        retryAfter: 1800, // 30 minutes
      },
      'Service temporarily unavailable for maintenance',
    );
  }
  next();
});
```

## Advanced Response Features

### Custom Headers

```javascript
app.get('/api/data', (req, res) => {
  const data = getData();

  res.ok(data, 'Data retrieved successfully', {
    headers: {
      'X-Total-Count': data.length.toString(),
      'X-API-Version': '1.2.0',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
```

### Performance Tracking

```javascript
app.get('/api/heavy-operation', (req, res) => {
  const startTime = Date.now();

  const result = performHeavyOperation();
  const operationTime = Date.now() - startTime;

  res.ok(result, 'Operation completed successfully', {
    performance: {
      operationTime: `${operationTime}ms`,
      complexity: 'O(n²)',
      cacheHit: false,
    },
  });
});
```

### Conditional Responses

```javascript
app.get('/api/posts/:id', (req, res) => {
  const post = getPost(req.params.id);

  if (!post) {
    return res.notFound({}, 'Post not found');
  }

  // Check If-Modified-Since header
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && new Date(ifModifiedSince) >= post.updatedAt) {
    return res.status(304).end();
  }

  res.ok(post, 'Post retrieved successfully', {
    headers: {
      'Last-Modified': post.updatedAt.toUTCString(),
      ETag: `"${post.version}"`,
    },
  });
});
```

### Response Compression

```javascript
app.get('/api/large-dataset', (req, res) => {
  const data = getLargeDataset();

  res.ok(data, 'Dataset retrieved successfully', {
    headers: {
      'Content-Encoding': 'gzip',
      'X-Uncompressed-Size': JSON.stringify(data).length.toString(),
    },
  });
});
```

All response methods automatically include:

- **Consistent format** with success/error flags
- **Timestamp** for request tracking
- **Execution time** for performance monitoring
- **Request ID** for correlation
- **Proper HTTP status codes**
- **Security headers** when enabled

This provides a complete, standardized API response system for Express applications.
