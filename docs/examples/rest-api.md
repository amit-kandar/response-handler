# REST API Server

Complete example of building a REST API server with Response Handler.

## Full Express.js REST API

### Server Setup

```javascript
const express = require('express');
const { quickSetup } = require('response-handler');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Response Handler middleware
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    environment: process.env.NODE_ENV || 'development',
    enablePerformanceTracking: true,
    enableSecurity: true,
  }),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

## User Management API

### User Model

```javascript
// models/User.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
});

class User {
  static async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT id, email, name, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const countQuery = 'SELECT COUNT(*) FROM users';

    const [result, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery),
    ]);

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    };
  }

  static async findById(id) {
    const query = 'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { email, name, password } = userData;
    const query = `
      INSERT INTO users (email, name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, email, name, created_at
    `;
    const result = await pool.query(query, [email, name, password]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { email, name } = userData;
    const query = `
      UPDATE users 
      SET email = $1, name = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, name, updated_at
    `;
    const result = await pool.query(query, [email, name, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;
```

### User Routes

```javascript
// routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List users with pagination
router.get('/', authenticateToken, authorize(['admin', 'user']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (limit > 100) {
      return res.badRequest({ limit: 'Maximum limit is 100' }, 'Invalid pagination parameters');
    }

    const result = await User.findAll(page, limit);

    res.ok(result.users, 'Users retrieved successfully', {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.badRequest({ id: 'Invalid user ID format' }, 'User ID must be a number');
    }

    // Users can only access their own data unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.forbidden({}, 'Access denied');
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.notFound({}, 'User not found');
    }

    res.ok(user, 'User retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve user');
  }
});

// POST /api/users - Create new user
router.post('/', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.badRequest(
        {
          missingFields: ['email', 'name', 'password'].filter((field) => !req.body[field]),
        },
        'Missing required fields',
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.badRequest({ email: 'Invalid email format' }, 'Invalid email address');
    }

    // Password validation
    if (password.length < 8) {
      return res.badRequest(
        { password: 'Password must be at least 8 characters' },
        'Password too short',
      );
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.conflict({ email: 'User with this email already exists' }, 'Email already in use');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      email,
      name,
      password: hashedPassword,
    });

    res.created(newUser, 'User created successfully');
  } catch (error) {
    res.error(error, 'Failed to create user');
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, name } = req.body;

    if (isNaN(userId)) {
      return res.badRequest({ id: 'Invalid user ID format' }, 'User ID must be a number');
    }

    // Users can only update their own data unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.forbidden({}, 'Access denied');
    }

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.notFound({}, 'User not found');
    }

    // Validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.badRequest({ email: 'Invalid email format' }, 'Invalid email address');
      }
    }

    const updatedUser = await User.update(userId, { email, name });

    res.ok(updatedUser, 'User updated successfully');
  } catch (error) {
    res.error(error, 'Failed to update user');
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.badRequest({ id: 'Invalid user ID format' }, 'User ID must be a number');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.notFound({}, 'User not found');
    }

    await User.delete(userId);

    res.ok({ id: userId }, 'User deleted successfully');
  } catch (error) {
    res.error(error, 'Failed to delete user');
  }
});

module.exports = router;
```

## Product Catalog API

### Product Routes

```javascript
// routes/products.js
const express = require('express');
const Product = require('../models/Product');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - List products with filtering and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const filters = {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
    };

    const result = await Product.findAll({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 per page
      filters,
      sortBy,
      sortOrder,
    });

    res.ok(result.products, 'Products retrieved successfully', {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined),
      ),
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve products');
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.badRequest({ id: 'Invalid product ID format' }, 'Product ID must be a number');
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.notFound({}, 'Product not found');
    }

    res.ok(product, 'Product retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve product');
  }
});

// POST /api/products - Create new product
router.post('/', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, description, price, category, sku, stock } = req.body;

    // Validation
    const requiredFields = ['name', 'price', 'category'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.badRequest({ missingFields }, 'Missing required fields');
    }

    if (price <= 0) {
      return res.badRequest({ price: 'Price must be greater than 0' }, 'Invalid price');
    }

    if (sku && (await Product.findBySku(sku))) {
      return res.conflict({ sku: 'Product with this SKU already exists' }, 'SKU already in use');
    }

    const newProduct = await Product.create({
      name,
      description,
      price: parseFloat(price),
      category,
      sku,
      stock: parseInt(stock) || 0,
    });

    res.created(newProduct, 'Product created successfully');
  } catch (error) {
    res.error(error, 'Failed to create product');
  }
});

module.exports = router;
```

## Order Management API

### Order Processing

```javascript
// routes/orders.js
const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders - Create new order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.badRequest(
        { items: 'Order must contain at least one item' },
        'Invalid order items',
      );
    }

    // Validate and calculate order
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        return res.badRequest(
          { item: 'Invalid item format' },
          'Each item must have productId and positive quantity',
        );
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.badRequest(
          { productId: `Product ${productId} not found` },
          'Invalid product in order',
        );
      }

      if (product.stock < quantity) {
        return res.badRequest(
          {
            productId,
            available: product.stock,
            requested: quantity,
          },
          'Insufficient stock',
        );
      }

      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        productId,
        quantity,
        price: product.price,
        total: itemTotal,
      });
    }

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      items: validatedItems,
      totalAmount,
      shippingAddress,
      status: 'pending',
    });

    // Update product stock
    for (const item of validatedItems) {
      await Product.updateStock(item.productId, -item.quantity);
    }

    res.created(order, 'Order created successfully');
  } catch (error) {
    res.error(error, 'Failed to create order');
  }
});

// GET /api/orders - Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const orders = await Order.findByUserId(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    res.ok(orders.orders, 'Orders retrieved successfully', {
      pagination: {
        page: orders.page,
        limit: orders.limit,
        total: orders.total,
        totalPages: orders.totalPages,
      },
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve orders');
  }
});

module.exports = router;
```

## Complete API Structure

### Main Application

```javascript
// app.js
const express = require('express');
const { quickSetup } = require('response-handler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();

// Middleware
app.use(express.json());
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'info',
    environment: process.env.NODE_ENV || 'development',
  }),
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.ok(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    'Service is healthy',
  );
});

// 404 handler
app.use('*', (req, res) => {
  res.notFound({}, 'Route not found');
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.error(error, 'Internal server error');
});

module.exports = app;
```

## Testing the API

### API Testing with Jest and Supertest

```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../app');

describe('REST API', () => {
  describe('Products API', () => {
    it('should get products list', async () => {
      const response = await request(app).get('/api/products').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle product not found', async () => {
      const response = await request(app).get('/api/products/99999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('Users API', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/users').expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
```

This REST API example demonstrates a complete, production-ready API server with proper validation, error handling, authentication, and Response Handler integration.
