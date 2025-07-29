# Microservices Architecture

Building a scalable microservices architecture with Response Handler for consistent API responses across services.

## Architecture Overview

### Service Structure

```
microservices/
├── api-gateway/          # Entry point, routing & auth
├── user-service/         # User management
├── product-service/      # Product catalog
├── order-service/        # Order processing
├── notification-service/ # Notifications
└── shared/              # Shared utilities
    ├── response-handler/ # Common response patterns
    └── service-client/   # Inter-service communication
```

## API Gateway

### Gateway Implementation

```javascript
// api-gateway/server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { quickSetup } = require('response-handler');

const app = express();

// Response Handler for gateway
app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development',
  responseHeaders: {
    'X-Gateway': 'microservices-v1',
    'X-Request-ID': true
  }
}));

// Service registry
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004'
};

// Authentication middleware
const authenticateRequest = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.unauthorized({}, 'Authentication token required');
  }
  
  try {
    const response = await fetch(`${services.user}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      return res.unauthorized({}, 'Invalid authentication token');
    }
    
    const userData = await response.json();
    req.user = userData.data;
    next();
  } catch (error) {
    res.badGateway(
      { service: 'user-service', error: error.message },
      'Authentication service unavailable'
    );
  }
};

// Proxy middleware with error handling
const createServiceProxy = (serviceName, serviceUrl) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: ''
    },
    onError: (err, req, res) => {
      console.error(`${serviceName} service error:`, err);
      res.badGateway(
        { 
          service: serviceName,
          error: err.message,
          timestamp: new Date()
        },
        `${serviceName} service unavailable`
      );
    },
    onProxyReq: (proxyReq, req) => {
      // Forward user context
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Context', JSON.stringify(req.user));
      }
    }
  });
};

// Service routes
app.use('/api/users', createServiceProxy('user', services.user));
app.use('/api/products', createServiceProxy('product', services.product));
app.use('/api/orders', authenticateRequest, createServiceProxy('order', services.order));
app.use('/api/notifications', authenticateRequest, createServiceProxy('notification', services.notification));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthChecks = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    try {
      const response = await fetch(`${serviceUrl}/health`, { timeout: 5000 });
      healthChecks[serviceName] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: response.headers.get('x-response-time') || 'unknown'
      };
    } catch (error) {
      healthChecks[serviceName] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
  
  if (allHealthy) {
    res.ok(healthChecks, 'All services healthy');
  } else {
    res.serviceUnavailable(healthChecks, 'Some services are unhealthy');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

## User Service

### User Management Microservice

```javascript
// user-service/server.js
const express = require('express');
const { quickSetup } = require('response-handler');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});

// Middleware
app.use(express.json());
app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development',
  responseHeaders: {
    'X-Service': 'user-service',
    'X-Version': '1.0.0'
  }
}));

// Extract user context from gateway
app.use((req, res, next) => {
  const userContext = req.headers['x-user-context'];
  if (userContext) {
    try {
      req.user = JSON.parse(userContext);
    } catch (error) {
      console.warn('Invalid user context:', error);
    }
  }
  next();
});

// Register user
app.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.badRequest(
        { missingFields: ['email', 'password', 'name'].filter(field => !req.body[field]) },
        'Missing required fields'
      );
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.conflict({ email }, 'User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name, created_at',
      [email, name, hashedPassword]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    // Publish user created event
    await publishEvent('user.created', { userId: user.id, email: user.email });
    
    res.created({ user, token }, 'User registered successfully');
  } catch (error) {
    res.error(error, 'Registration failed');
  }
});

// Login user
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.badRequest(
        { missingFields: ['email', 'password'].filter(field => !req.body[field]) },
        'Email and password required'
      );
    }
    
    // Find user
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.unauthorized({}, 'Invalid credentials');
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.unauthorized({}, 'Invalid credentials');
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    }, 'Login successful');
  } catch (error) {
    res.error(error, 'Login failed');
  }
});

// Verify token (for gateway)
app.post('/auth/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.unauthorized({}, 'Token required');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    res.ok({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    }, 'Token valid');
  } catch (error) {
    res.unauthorized({ error: error.message }, 'Invalid token');
  }
});

// Get users
app.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);
    
    res.ok(result.rows, 'Users retrieved successfully', {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});

// Event publishing function
async function publishEvent(eventType, data) {
  try {
    console.log(`Publishing event: ${eventType}`, data);
    // Implement actual event publishing (Redis, RabbitMQ, etc.)
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.ok({
      service: 'user-service',
      status: 'healthy',
      database: 'connected',
      timestamp: new Date()
    }, 'Service is healthy');
  } catch (error) {
    res.serviceUnavailable({
      service: 'user-service',
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    }, 'Service is unhealthy');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
```

## Product Service

### Product Catalog Microservice

```javascript
// product-service/server.js
const express = require('express');
const { quickSetup } = require('response-handler');
const { MongoClient } = require('mongodb');

const app = express();

// MongoDB connection
let db;
MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/products')
  .then(client => {
    db = client.db();
    console.log('Connected to MongoDB');
  });

// Middleware
app.use(express.json());
app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development',
  responseHeaders: {
    'X-Service': 'product-service',
    'X-Version': '1.0.0'
  }
}));

// Get products
app.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search
    } = req.query;
    
    const skip = (page - 1) * limit;
    const query = {};
    
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) query.$text = { $search: search };
    
    const products = await db.collection('products')
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await db.collection('products').countDocuments(query);
    
    res.ok(products, 'Products retrieved successfully', {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve products');
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await db.collection('products').findOne({ _id: id });
    
    if (!product) {
      return res.notFound({ productId: id }, 'Product not found');
    }
    
    res.ok(product, 'Product retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve product');
  }
});

// Create product
app.post('/products', async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    // Validation
    if (!name || !price || !category) {
      return res.badRequest(
        { missingFields: ['name', 'price', 'category'] },
        'Missing required fields'
      );
    }
    
    if (price <= 0) {
      return res.badRequest(
        { price, requirement: 'greater than 0' },
        'Price must be greater than 0'
      );
    }
    
    const product = {
      _id: generateProductId(),
      name: name.trim(),
      description: description?.trim() || '',
      price: parseFloat(price),
      category,
      stock: parseInt(stock) || 0,
      createdAt: new Date(),
      isActive: true
    };
    
    await db.collection('products').insertOne(product);
    
    // Publish product created event
    await publishEvent('product.created', {
      productId: product._id,
      name: product.name,
      category: product.category
    });
    
    res.created(product, 'Product created successfully');
  } catch (error) {
    res.error(error, 'Failed to create product');
  }
});

// Update stock
app.patch('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'decrease' } = req.body;
    
    const product = await db.collection('products').findOne({ _id: id });
    if (!product) {
      return res.notFound({ productId: id }, 'Product not found');
    }
    
    const stockChange = operation === 'increase' ? quantity : -quantity;
    const newStock = product.stock + stockChange;
    
    if (newStock < 0) {
      return res.badRequest(
        { currentStock: product.stock, requestedChange: stockChange },
        'Insufficient stock'
      );
    }
    
    await db.collection('products').updateOne(
      { _id: id },
      { $set: { stock: newStock, updatedAt: new Date() } }
    );
    
    res.ok({
      productId: id,
      previousStock: product.stock,
      newStock
    }, 'Stock updated successfully');
  } catch (error) {
    res.error(error, 'Failed to update stock');
  }
});

function generateProductId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function publishEvent(eventType, data) {
  console.log(`Publishing event: ${eventType}`, data);
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.admin().ping();
    res.ok({
      service: 'product-service',
      status: 'healthy',
      database: 'connected'
    }, 'Service is healthy');
  } catch (error) {
    res.serviceUnavailable({
      service: 'product-service',
      status: 'unhealthy',
      error: error.message
    }, 'Service is unhealthy');
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});
```

## Order Service

### Order Processing Microservice

```javascript
// order-service/server.js
const express = require('express');
const { quickSetup } = require('response-handler');
const { Pool } = require('pg');

const app = express();

// Database and service connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});

const services = {
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001'
};

// Middleware
app.use(express.json());
app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development',
  responseHeaders: {
    'X-Service': 'order-service',
    'X-Version': '1.0.0'
  }
}));

// Extract user context
app.use((req, res, next) => {
  const userContext = req.headers['x-user-context'];
  if (userContext) {
    try {
      req.user = JSON.parse(userContext);
    } catch (error) {
      console.warn('Invalid user context:', error);
    }
  }
  next();
});

// Create order
app.post('/orders', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { items, shippingAddress } = req.body;
    
    if (!req.user) {
      return res.unauthorized({}, 'Authentication required');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.badRequest(
        { items: 'Must be non-empty array' },
        'Order must contain items'
      );
    }
    
    await client.query('BEGIN');
    
    // Validate products and calculate total
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const { productId, quantity } = item;
      
      if (!productId || !quantity || quantity <= 0) {
        await client.query('ROLLBACK');
        return res.badRequest({ item }, 'Invalid item format');
      }
      
      // Check product
      const productResponse = await fetch(`${services.product}/products/${productId}`);
      
      if (!productResponse.ok) {
        await client.query('ROLLBACK');
        return res.badRequest({ productId }, 'Product not found');
      }
      
      const productData = await productResponse.json();
      const product = productData.data;
      
      if (product.stock < quantity) {
        await client.query('ROLLBACK');
        return res.badRequest(
          { productId, requested: quantity, available: product.stock },
          'Insufficient stock'
        );
      }
      
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });
    }
    
    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at)
      VALUES ($1, $2, 'pending', $3, NOW())
      RETURNING id, created_at
    `, [req.user.id, totalAmount, JSON.stringify(shippingAddress)]);
    
    const order = orderResult.rows[0];
    
    // Create order items
    for (const item of validatedItems) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [order.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]);
    }
    
    // Update product stock
    for (const item of validatedItems) {
      await fetch(`${services.product}/products/${item.productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: item.quantity,
          operation: 'decrease'
        })
      });
    }
    
    await client.query('COMMIT');
    
    // Publish order created event
    await publishEvent('order.created', {
      orderId: order.id,
      userId: req.user.id,
      totalAmount
    });
    
    res.created({
      orderId: order.id,
      totalAmount,
      items: validatedItems,
      status: 'pending'
    }, 'Order created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    res.error(error, 'Failed to create order');
  } finally {
    client.release();
  }
});

// Get user orders
app.get('/orders', async (req, res) => {
  try {
    if (!req.user) {
      return res.unauthorized({}, 'Authentication required');
    }
    
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.ok(result.rows, 'Orders retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve orders');
  }
});

async function publishEvent(eventType, data) {
  console.log(`Publishing event: ${eventType}`, data);
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.ok({
      service: 'order-service',
      status: 'healthy',
      database: 'connected'
    }, 'Service is healthy');
  } catch (error) {
    res.serviceUnavailable({
      service: 'order-service',
      status: 'unhealthy',
      error: error.message
    }, 'Service is unhealthy');
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
```

## Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - ORDER_SERVICE_URL=http://order-service:3003
    depends_on:
      - user-service
      - product-service
      - order-service
    networks:
      - microservices

  # User Service
  user-service:
    build: ./user-service
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@user-db:5432/users
      - JWT_SECRET=your-secret-key
    depends_on:
      - user-db
    networks:
      - microservices

  # Product Service
  product-service:
    build: ./product-service
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://product-db:27017/products
    depends_on:
      - product-db
    networks:
      - microservices

  # Order Service
  order-service:
    build: ./order-service
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@order-db:5432/orders
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - USER_SERVICE_URL=http://user-service:3001
    depends_on:
      - order-db
    networks:
      - microservices

  # Databases
  user-db:
    image: postgres:13
    environment:
      - POSTGRES_DB=users
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - user-data:/var/lib/postgresql/data
    networks:
      - microservices

  product-db:
    image: mongo:4.4
    volumes:
      - product-data:/data/db
    networks:
      - microservices

  order-db:
    image: postgres:13
    environment:
      - POSTGRES_DB=orders
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - order-data:/var/lib/postgresql/data
    networks:
      - microservices

volumes:
  user-data:
  product-data:
  order-data:

networks:
  microservices:
    driver: bridge
```

This microservices architecture provides:

- **Unified Response Format**: All services use Response Handler for consistent API responses
- **Service Discovery**: API Gateway routes requests to appropriate services
- **Inter-Service Communication**: Services communicate through HTTP APIs with proper error handling
- **Independent Scaling**: Each service can be scaled independently
- **Database Per Service**: Each service owns its data
- **Event-Driven Architecture**: Services publish events for loose coupling
- **Health Monitoring**: Each service provides health check endpoints
- **Production Ready**: Includes Docker configuration for deployment

The architecture demonstrates how Response Handler ensures consistent response patterns across a distributed system while maintaining service independence.
