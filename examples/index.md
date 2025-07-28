# Examples

Real-world examples of using the Response Handler library in different scenarios.

## Quick Links

- [Express Setup](./express) - Complete Express.js integration examples
- [Socket.IO Setup](./socket) - Socket.IO integration examples
- [Error Handling](./errors) - Comprehensive error handling patterns
- [Custom Configuration](./config) - Advanced configuration examples

## Basic Usage

### Express.js Application

```javascript
const express = require('express');
const { quickSetup } = require('response-handler');

const app = express();

// Apply response handler middleware
app.use(quickSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development'
}));

// Routes with enhanced responses
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsersFromDatabase();
    res.ok(users, 'Users retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Socket.IO Application

```javascript
const { Server } = require('socket.io');
const { quickSocketSetup } = require('response-handler');

const io = new Server(server);

// Apply socket response handler
io.use(quickSocketSetup({
  enableLogging: true,
  logLevel: 'info'
}));

io.on('connection', (socket) => {
  socket.on('get-user', async (userId) => {
    try {
      const user = await getUserById(userId);
      if (user) {
        socket.ok(user, 'User found');
      } else {
        socket.notFound({}, 'User not found');
      }
    } catch (error) {
      socket.error(error, 'Failed to get user');
    }
  });
});
```

## Advanced Examples

### With Custom Configuration

```javascript
const customConfig = {
  enableLogging: true,
  logLevel: 'debug',
  environment: 'production',
  enablePerformanceTracking: true,
  enableSecurity: true,
  customLoggers: {
    info: (message) => console.log(`[INFO] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
    debug: (message) => console.debug(`[DEBUG] ${message}`)
  },
  responseHeaders: {
    'X-API-Version': '1.0.0',
    'X-Response-Time': true
  }
};

app.use(quickSetup(customConfig));
```

### With Pagination

```javascript
app.get('/api/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const { products, total } = await getProducts(page, limit);
    
    res.ok(products, 'Products retrieved successfully', {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.error(error, 'Failed to retrieve products');
  }
});
```

### Error Handling with Custom Messages

```javascript
app.post('/api/users', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.badRequest(
        { missingFields: ['email', 'password'] },
        'Email and password are required'
      );
    }
    
    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.conflict(
        { email },
        'User with this email already exists'
      );
    }
    
    // Create user
    const newUser = await createUser({ email, password });
    res.created(newUser, 'User created successfully');
    
  } catch (error) {
    res.error(error, 'Failed to create user');
  }
});
```

## Testing Examples

### Unit Testing with Jest

```javascript
const request = require('supertest');
const express = require('express');
const { quickSetup } = require('response-handler');

describe('API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(quickSetup());
    
    app.get('/test', (req, res) => {
      res.ok({ test: true }, 'Test successful');
    });
  });
  
  it('should return success response', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);
      
    expect(response.body).toEqual({
      success: true,
      message: 'Test successful',
      data: { test: true },
      timestamp: expect.any(String),
      executionTime: expect.any(String)
    });
  });
});
```

## More Examples

Explore the following sections for detailed examples:

- **[Express Examples](./express)** - Complete Express.js application examples
- **[Socket.IO Examples](./socket)** - Real-time application examples
- **[Error Handling](./errors)** - Comprehensive error handling patterns
- **[Configuration Examples](./config)** - Advanced configuration scenarios
